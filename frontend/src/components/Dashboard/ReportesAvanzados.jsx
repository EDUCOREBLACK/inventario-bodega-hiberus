import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import api from '../../services/api';

const ReportesAvanzados = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovimientos = async () => {
      try {
        const response = await api.get('/movimientos?limit=10');
        setMovimientos(response.data || []);
      } catch (error) {
        console.error('Error cargando reportes avanzados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMovimientos();
  }, []);

  const exportarCSV = () => {
    const rows = movimientos.map((m) => ({
      fecha: m.fecha_movimiento,
      material: m.material_nombre || '',
      tipo: m.tipo_movimiento_nombre || m.tipo_movimiento || '',
      cantidad: m.cantidad || 0,
      estado: m.estado || ''
    }));

    const csv = [
      ['Fecha', 'Material', 'Tipo', 'Cantidad', 'Estado'].join(','),
      ...rows.map((row) => [row.fecha, row.material, row.tipo, row.cantidad, row.estado].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'reporte-movimientos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return null;

  return (
    <div className="mt-8 card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Últimos movimientos</h3>
          <p className="text-sm text-gray-500">Vista rápida para reportes operativos</p>
        </div>
        <button onClick={exportarCSV} className="btn-secondary flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2">Fecha</th>
              <th className="text-left py-2">Material</th>
              <th className="text-left py-2">Tipo</th>
              <th className="text-left py-2">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="py-2">{m.fecha_movimiento}</td>
                <td className="py-2">{m.material_nombre}</td>
                <td className="py-2">{m.tipo_movimiento_nombre || m.tipo_movimiento}</td>
                <td className="py-2">{m.cantidad || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportesAvanzados;
