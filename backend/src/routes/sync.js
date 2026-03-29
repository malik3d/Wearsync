// routes/sync.js
const express = require('express');
const router  = express.Router();
const { getDB } = require('../models/database');
const garmin    = require('../services/garmin');
const fitbit    = require('../services/fitbit');
const whoop     = require('../services/whoop');
const withings  = require('../services/withings');
const zepp      = require('../services/zepp');

const SERVICES = { garmin, fitbit, whoop, withings, zepp };

// In-memory sync job state (single-process backend)
const syncJobs = new Map();
function makeJobId(provider) {
  return `${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// POST /sync — sync all connected devices for a date
router.post('/', async (req, res) => {
  const date    = req.body.date || new Date().toISOString().slice(0, 10);
  const db      = getDB();
  const devices = db.prepare('SELECT provider FROM devices').all().map(d => d.provider);

  const results = {};
  for (const provider of devices) {
    if (!SERVICES[provider]) { results[provider] = { skipped: true }; continue; }
    try {
      results[provider] = await SERVICES[provider].fetchDaily(date);
    } catch (e) {
      results[provider] = { error: e.message };
    }
  }

  res.json({ date, results });
});

// GET /sync/:provider/status?jobId=...
router.get('/:provider/status', (req, res) => {
  const provider = req.params.provider;
  const jobId = req.query.jobId;

  if (jobId) {
    const s = syncJobs.get(jobId);
    if (!s || s.provider !== provider) return res.status(404).json({ error: 'sync job not found' });
    return res.json(s);
  }

  const jobs = [...syncJobs.values()].filter(j => j.provider === provider).sort((a,b) => b.startedAt - a.startedAt);
  if (!jobs.length) return res.status(404).json({ error: 'no sync jobs for provider' });
  return res.json(jobs[0]);
});

// POST /sync/:provider/stop?jobId=...
router.post('/:provider/stop', (req, res) => {
  const provider = req.params.provider;
  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'jobId is required' });

  const s = syncJobs.get(jobId);
  if (!s || s.provider !== provider) return res.status(404).json({ error: 'sync job not found' });
  if (s.status !== 'running') return res.json({ ok: true, already: s.status, jobId });

  syncJobs.set(jobId, {
    ...s,
    status: 'stopping',
    stopRequested: true,
    updatedAt: Date.now(),
  });

  res.json({ ok: true, jobId, status: 'stopping' });
});

// POST /sync/:provider — sync specific device
router.post('/:provider', async (req, res) => {
  const provider = req.params.provider;
  const svc      = SERVICES[provider];
  if (!svc) return res.status(404).json({ error: 'Unknown provider' });

  try {
    if (req.query.all === 'true') {
      const from = req.query.from || '2024-01-01';
      const to = req.query.to || new Date().toISOString().slice(0, 10);
      const jobId = makeJobId(provider);

      syncJobs.set(jobId, {
        jobId,
        provider,
        mode: provider === 'withings' ? 'month_chunk_backfill' : 'day_loop_backfill',
        from,
        to,
        pct: 0,
        syncedDays: 0,
        insertedRows: 0,
        status: 'running',
        stopRequested: false,
        error: null,
        startedAt: Date.now(),
        updatedAt: Date.now(),
        finishedAt: null,
      });

      setTimeout(async () => {
        try {
          if (provider === 'withings' && typeof svc.fetchBackfill === 'function') {
            const result = await svc.fetchBackfill({
              from,
              to,
              shouldCancel: () => {
                const cur = syncJobs.get(jobId);
                return !!cur?.stopRequested;
              },
              onProgress: ({ pct, syncedDays, insertedRows, currentTo }) => {
                const prev = syncJobs.get(jobId);
                if (!prev) return;
                syncJobs.set(jobId, {
                  ...prev,
                  pct,
                  syncedDays,
                  insertedRows,
                  currentTo,
                  updatedAt: Date.now(),
                });
              }
            });

            const prev = syncJobs.get(jobId);
            if (prev) {
              syncJobs.set(jobId, {
                ...prev,
                ...result,
                pct: result.status === 'ok' ? 100 : prev.pct,
                status: result.status === 'ok' ? 'done' : result.status,
                updatedAt: Date.now(),
                finishedAt: Date.now(),
              });
            }

            console.log(`Withings backfill finished: ${JSON.stringify(result)}`);
            return;
          }

          let currentDate = new Date(to + 'T00:00:00Z');
          const earliestDate = new Date(from + 'T00:00:00Z');
          const totalDays = Math.max(1, Math.floor((currentDate - earliestDate) / (1000 * 60 * 60 * 24)) + 1);
          let done = 0;

          while (currentDate >= earliestDate) {
            const cur = syncJobs.get(jobId);
            if (cur?.stopRequested) {
              syncJobs.set(jobId, {
                ...cur,
                status: 'aborted_cancelled',
                updatedAt: Date.now(),
                finishedAt: Date.now(),
              });
              break;
            }

            const loopDate = currentDate.toISOString().slice(0, 10);
            try {
              const isConnected = getDB().prepare('SELECT id FROM devices WHERE provider=?').get(provider);
              if (!isConnected) {
                console.log(`Aborting sync loop for ${provider} — device disconnected.`);
                const prev = syncJobs.get(jobId);
                if (prev) {
                  syncJobs.set(jobId, {
                    ...prev,
                    status: 'aborted_disconnected',
                    updatedAt: Date.now(),
                    finishedAt: Date.now(),
                  });
                }
                break;
              }

              await svc.fetchDaily(loopDate);
            } catch (e) {
              console.error(`Error syncing ${provider} on ${loopDate}:`, e.message);
            }

            done += 1;
            const pct = Math.floor((done / totalDays) * 100);
            const prev = syncJobs.get(jobId);
            if (prev) {
              syncJobs.set(jobId, {
                ...prev,
                pct,
                syncedDays: done,
                insertedRows: done,
                updatedAt: Date.now(),
              });
            }

            currentDate.setUTCDate(currentDate.getUTCDate() - 1);
            await new Promise(r => setTimeout(r, 200));
          }

          const prev = syncJobs.get(jobId);
          if (prev && prev.status === 'running') {
            syncJobs.set(jobId, {
              ...prev,
              pct: 100,
              status: 'done',
              updatedAt: Date.now(),
              finishedAt: Date.now(),
            });
          }

          console.log(`Sync all for ${provider} completed backwards`);
        } catch (e) {
          console.error(`Background sync failure for ${provider}:`, e.message);
          const prev = syncJobs.get(jobId);
          if (prev) {
            syncJobs.set(jobId, {
              ...prev,
              status: 'error',
              error: e.message,
              updatedAt: Date.now(),
              finishedAt: Date.now(),
            });
          }
        }
      }, 0);

      res.json({ provider, status: 'started_background_sync', mode: provider === 'withings' ? 'month_chunk_backfill' : 'day_loop_backfill', from, to, jobId });
    } else {
      const date = req.body.date || new Date().toISOString().slice(0, 10);
      const data = await svc.fetchDaily(date);
      res.json({ date, provider, data });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
