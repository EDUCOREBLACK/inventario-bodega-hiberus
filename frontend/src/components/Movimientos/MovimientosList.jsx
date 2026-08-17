import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../../services/api';
import MovimientoFormModal from './MovimientoFormModal';

const MovimientosList = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMovimientos = async () => {
    try {
      const response = await api.get('/movimientos');
      setMovimientos(response.data || []);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimientos();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hiberus-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-gray-600">Historial de movimientos de inventario</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Movimiento
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Material</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {new Date(mov.fecha_movimiento).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {mov.material_nombre}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        mov.tipo_movimiento_nombre === 'Entrada' ? 'badge-success' : 
                        mov.tipo_movimiento_nombre === 'Salida' ? 'badge-danger' : 
                        'badge-warning'
                      }`}>
                        {mov.tipo_movimiento_nombre || 'Movimiento'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {mov.cantidad || 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {mov.responsable_nombre || mov.proyecto_nombre || 'Sistema'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MovimientoFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchMovimientos}
      />
    </div>
  );
};

export default MovimientosList;