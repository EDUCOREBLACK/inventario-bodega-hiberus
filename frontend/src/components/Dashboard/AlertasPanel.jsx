import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const AlertasPanel = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const response = await api.get('/dashboard/stock-bajo');
        setAlertas(response.data || []);
      } catch (error) {
        console.error('Error cargando alertas:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAlertas();
  }, []);

  if (loading) return null;

  return (
    <div className="mt-8 card">
      <div className="flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Alertas de stock bajo</h3>
      </div>
      {alertas.length === 0 ? (
        <p className="text-gray-500">No hay alertas por el momento.</p>
      ) : (
        <div className="space-y-3">
          {alertas.map((item) => (
            <div key={item.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-gray-900">{item.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-amber-600">Stock {item.stock_total}</p>
                <p className="text-xs text-gray-500">Mínimo {item.stock_minimo}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertasPanel;
