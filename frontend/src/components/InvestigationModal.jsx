import React, { useState, useEffect } from 'react';

const InvestigationModal = ({ isOpen, onClose, wellId, alertId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && wellId) {
      fetchInvestigationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, wellId, alertId]);

  const fetchInvestigationData = async () => {
    setLoading(true);
    try {
      const url = alertId
        ? `/api/wells/${wellId}/investigate/?alert_id=${alertId}`
        : `/api/wells/${wellId}/investigate/`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching investigation data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">🔍 Расследование инцидента</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {data && (
          <div>
            <div className="mb-4 p-4 bg-gray-700 rounded">
              <h3 className="font-bold mb-2">Скважина №{data.well.number}</h3>
              <p>ЦДНГ: {data.well.cdng}</p>
              <p>Статус: {data.well.status}</p>
            </div>

            {data.alerts_24h && data.alerts_24h.length > 0 && (
              <div className="mb-4 p-4 bg-red-900 rounded">
                <h3 className="font-bold mb-2">Последний алерт</h3>
                {(() => {
                  const alert = data.alerts_24h[data.alerts_24h.length - 1];
                  return (
                    <>
                      <p>Тип: {alert.alert_type}</p>
                      <p>Параметр: {alert.parameter}</p>
                      <p>Сообщение: {alert.message}</p>
                      <p>Значение: {alert.value}</p>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-bold mb-2">Обнаруженные аномалии: {data.anomalies.length}</h3>
              {data.anomalies.length > 0 ? (
                <div className="space-y-2">
                  {data.anomalies.slice(0, 10).map((anomaly, idx) => (
                    <div key={idx} className="p-2 bg-yellow-900 rounded text-sm">
                      <strong>{anomaly.parameter}</strong>: {anomaly.value.toFixed(2)}
                      {' '}(среднее: {anomaly.mean.toFixed(2)}, z-score: {anomaly.z_score.toFixed(2)})
                    </div>
                  ))}
                  {data.anomalies.length > 10 && (
                    <p className="text-sm text-gray-400">... и ещё {data.anomalies.length - 10} аномалий</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Аномалий не обнаружено</p>
              )}
            </div>

            <div>
              <h3 className="font-bold mb-2">Телеметрия за 24 часа: {data.telemetry_24h.length} записей</h3>
              <p className="text-sm text-gray-400">
                Период: {data.telemetry_24h[0]?.timestamp} — {data.telemetry_24h[data.telemetry_24h.length - 1]?.timestamp}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationModal;
