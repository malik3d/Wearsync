import React from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';

function FitBounds({ route }) {
  const map = useMap();
  React.useEffect(() => {
    if (route && route.length > 0) {
      map.fitBounds(route, { padding: [20, 20] });
    }
  }, [map, route]);
  return null;
}

export default function RouteMap({ route, elevationProfile, height = 300 }) {
  if (!route || route.length < 2) return null;

  const center = route[Math.floor(route.length / 2)];
  const startPoint = route[0];
  const endPoint = route[route.length - 1];

  return (
    <div>
      <MapContainer center={center} zoom={13} style={{ height, width: '100%', borderRadius: '12px' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Polyline positions={route} pathOptions={{ color: '#4ade80', weight: 4, opacity: 0.9 }} />
        <CircleMarker center={startPoint} radius={8} pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }} />
        <CircleMarker center={endPoint} radius={8} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
        <FitBounds route={route} />
      </MapContainer>
      
      {elevationProfile && elevationProfile.length > 1 && (
        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>Höhenprofil</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={elevationProfile} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="idx" hide />
              <YAxis stroke="#444" fontSize={10} tickFormatter={(v) => `${v}m`} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} formatter={(v) => [`${v} m`, 'Höhe']} />
              <Area type="monotone" dataKey="elevation" stroke="#22c55e" strokeWidth={2} fill="url(#elevGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
