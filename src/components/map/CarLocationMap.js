'use client';

import { useState, useEffect } from 'react';
import { MapPin, Info } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export default function CarLocationMap({
  latitude = 9.01,
  longitude = 38.76,
  neighbourhood = 'Bole',
  carTitle = 'Vehicle Location',
  height = '350px',
}) {
  const [isClient, setIsClient] = useState(false);
  const [MapComponents, setMapComponents] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically load react-leaflet on client
    Promise.all([import('react-leaflet'), import('leaflet')])
      .then(([reactLeaflet, L]) => {
        // Fix Leaflet default icon paths in Next.js bundle
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
          Circle: reactLeaflet.Circle,
        });
      })
      .catch((err) => {
        console.warn('Leaflet map load failed, using neighbourhood address fallback:', err);
        setLoadError(true);
      });
  }, []);

  if (loadError) {
    return (
      <div
        className="w-full bg-slate-50 rounded-xl p-6 flex flex-col justify-center border border-slate-200 space-y-3"
        style={{ height }}
      >
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
          <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Handover Pickup Zone: {neighbourhood}, Addis Ababa</span>
        </div>
        <p className="text-xs text-slate-600">
          Interactive map preview unavailable. Approximate GPS coordinates: {Number(latitude).toFixed(4)}° N, {Number(longitude).toFixed(4)}° E.
        </p>
        <div className="text-[11px] text-slate-500 bg-white p-3 rounded-lg border border-slate-200">
          The host will coordinate exact street handover in {neighbourhood} upon booking confirmation.
        </div>
      </div>
    );
  }

  if (!isClient || !MapComponents) {
    return (
      <div
        className="w-full bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 animate-pulse border border-slate-200"
        style={{ height }}
      >
        <MapPin className="w-8 h-8 mb-2 text-slate-400" />
        <span className="text-xs font-medium text-slate-500">Loading Addis Ababa Map...</span>
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, Circle } = MapComponents;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs" style={{ height }}>
      {/* Simulation Badge Overlay */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 text-slate-100 text-[11px] font-medium px-2.5 py-1 rounded-md shadow-md backdrop-blur-xs flex items-center gap-1.5 border border-slate-700">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Seeded / Simulation Zone</span>
      </div>

      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pickup area circle */}
        <Circle
          center={[latitude, longitude]}
          radius={450}
          pathOptions={{
            color: '#059669',
            fillColor: '#10b981',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />

        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="p-1 text-slate-900 text-xs">
              <strong className="block font-bold text-sm text-emerald-700">{carTitle}</strong>
              <div className="text-slate-600 mt-0.5">Pickup Zone: {neighbourhood}, Addis Ababa</div>
              <div className="text-[10px] text-slate-400 mt-1 italic">
                Exact street handover shared upon booking confirmation.
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
