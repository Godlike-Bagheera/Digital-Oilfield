import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ИСПРАВЛЕНИЕ известной проблемы Leaflet в React (иконки не загружаются)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCustomIcon = (status) => {
  const colors = {
    online: '#10b981', warning: '#f59e0b', alarm: '#ef4444',
    maintenance: '#f97316', offline: '#6b7280',
  };
  const color = colors[status] || '#6b7280';

  return L.divIcon({
    className: 'custom-well-marker',
    html: `<div style="
      background-color: ${color};
      width: 28px; height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold; font-size: 10px;
      cursor: pointer; transition: transform 0.2s;
    ">${status === 'alarm' ? '!' : ''}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const statusLabels = {
  online: 'В работе', warning: 'Внимание', alarm: 'Авария',
  maintenance: 'В ремонте', offline: 'Офлайн',
};
const statusColors = {
  online: 'bg-emerald-500', warning: 'bg-amber-500', alarm: 'bg-rose-500',
  maintenance: 'bg-orange-500', offline: 'bg-zinc-500',
};

export default function MapPage() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/wells/')
      .then(res => res.json())
      .then(data => {
        setWells(data.results || data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching wells:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-zinc-400 animate-pulse">Загрузка карты...</div>;
  }

  const center = [54.8840, 52.3210]; // Центр между всеми 3 кустами

  const statusCounts = wells.reduce((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 pb-4">
        <h1 className="text-3xl font-bold text-zinc-50 mb-2">Карта месторождения</h1>
        <p className="text-zinc-400 text-sm">
          Ромашкинское нефтяное месторождение • 3 куста скважин • {wells.length} скважин в работе
        </p>
      </div>

      <div className="px-6 pb-4">
        <div className="flex gap-4 flex-wrap p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-xs text-zinc-300">
              <div className={`w-3 h-3 rounded-full ${statusColors[key]}`}></div>
              <span>{label}</span>
              {statusCounts[key] && <span className="text-zinc-500">({statusCounts[key]})</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 min-h-[500px]">
        <div className="h-full rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
          <MapContainer
            center={center} zoom={11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {wells.map(well => (
              <Marker
                key={well.id}
                position={[parseFloat(well.latitude), parseFloat(well.longitude)]}
                icon={createCustomIcon(well.status)}
                eventHandlers={{ click: () => navigate(`/well/${well.id}`) }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-bold text-lg mb-1">Скважина №{well.number}</h3>
                    <p className="text-gray-400 mb-1">ЦДНГ: <b>{well.cdng}</b></p>
                    <p className="mb-2">Статус: <b>{statusLabels[well.status]}</b></p>
                    <p className="text-xs text-gray-500 mb-2 font-mono">
                      {well.latitude}, {well.longitude}
                    </p>
                    <p className="text-xs text-blue-500 font-semibold">
                      Кликните для подробностей →
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
