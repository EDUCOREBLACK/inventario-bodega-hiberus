import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const ReportesPanel = () => {
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResumen = async () => {
      try {
        const response = await api.get('/dashboard/resumen');
        setResumen(response.data);
      } catch (error) {
        console.error('Error cargando reportes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResumen();
  }, []);

  if (loading) return <div className="text-gray-500">Cargando reportes...</div>;

  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2">Inventario total</h3>
        <p className="text-3xl font-bold text-hiberus-blue">{resumen?.totalStock || 0}</p>
        <p className="text-sm text-gray-500 mt-1">Unidades en stock</p>
      </div>
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2">Proyectos activos</h3>
        <p className="text-3xl font-bold text-hiberus-blue">{resumen?.totalProyectos || 0}</p>
        <p className="text-sm text-gray-500 mt-1">En seguimiento</p>
      </div>
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2">Valor estimado</h3>
        <p className="text-3xl font-bold text-hiberus-blue">${(resumen?.valorTotal || 0).toLocaleString()}</p>
        <p className="text-sm text-gray-500 mt-1">USD</p>
      </div>
    </div>
  );
};

export default ReportesPanel;
