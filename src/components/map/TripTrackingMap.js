'use client';

import { useState, useEffect } from 'react';
import { Navigation, Compass, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function TripTrackingMap({
  booking,
  car,
  startCoords = [8.995, 38.788], // Bole
  endCoords = [9.035, 38.752], // Piassa
}) {
  const [isClient, setIsClient] = useState(false);
  const [MapComponents, setMapComponents] = useState(null);
  const [progress, setProgress] = useState(0.45); // simulated progress along route

  useEffect(() => {
    setIsClient(true);
    Promise.all([import('react-leaflet'), import('leaflet')]).then(
      ([reactLeaflet, L]) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        setMapComponents({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Popup: reactLeaflet.Popup,
          Polyline: reactLeaflet.Polyline,
        });
      }
    );
  }, []);

  // Simulate subtle real-time movement
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev >= 0.95 ? 0.1 : prev + 0.02));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Interpolate current position between start and end
  const currentLat = startCoords[0] + (endCoords[0] - startCoords[0]) * progress;
  const currentLng = startCoords[1] + (endCoords[1] - startCoords[1]) * progress;

  if (!isClient || !MapComponents) {
    return (
      <div className="w-full h-[450px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-slate-400">
        <Navigation className="w-10 h-10 mb-2 animate-bounce text-emerald-400" />
        <span className="text-sm font-medium">Connecting to vehicle telematics (Simulation)...</span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Polyline } = MapComponents;

  return (
    <div className="space-y-4">
      {/* Simulation Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-900 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Simulation Mode:</strong> GPS tracking data is procedurally generated for
            demonstration.
          </span>
        </div>
        <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-xs shrink-0">
          ● Live Telemetry
        </span>
      </div>

      {/* Map Window */}
      <div className="relative w-full h-[450px] rounded-2xl overflow-hidden border border-slate-200 shadow-md">
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200 text-xs space-y-1">
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            Active Trip Status
          </div>
          <div className="text-slate-600">
            Speed: <span className="font-semibold text-slate-900">42 km/h</span>
          </div>
          <div className="text-slate-600">
            Route Progress: <span className="font-semibold text-emerald-600">{Math.round(progress * 100)}%</span>
          </div>
        </div>

        <MapContainer
          center={[currentLat, currentLng]}
          zoom={13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Route path */}
          <Polyline
            positions={[startCoords, [currentLat, currentLng], endCoords]}
            pathOptions={{ color: '#059669', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
          />

          {/* Pickup point */}
          <Marker position={startCoords}>
            <Popup>
              <strong>Pickup Point</strong>
              <div>{car?.neighbourhood || 'Addis Ababa'}</div>
            </Popup>
          </Marker>

          {/* Current Vehicle Position */}
          <Marker position={[currentLat, currentLng]}>
            <Popup>
              <strong>{car?.make} {car?.model}</strong>
              <div className="text-xs text-emerald-700 font-semibold">In Transit (Simulated)</div>
            </Popup>
          </Marker>

          {/* Destination */}
          <Marker position={endCoords}>
            <Popup>
              <strong>Handover Destination</strong>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
