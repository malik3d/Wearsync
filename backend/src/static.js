const path = require('path');
const express = require('express');

function serveStatic(app) {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // SPA fallback - alle nicht-API-Routen zum Frontend
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || 
        req.path.startsWith('/metrics') || req.path.startsWith('/devices') ||
        req.path.startsWith('/export') || req.path.startsWith('/sync') ||
        req.path.startsWith('/import') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

module.exports = { serveStatic };
