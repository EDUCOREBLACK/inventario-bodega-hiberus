import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const MovimientosList = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovimientos = async () => {
      try {
        const response = await axios.get(`${API_URL}/movimientos`);
        setMovimientos(response.data || []);
      } catch (error) {
        console.error('Error al cargar movimientos:', error);
      } finally {
        setLoading(false);
      }
    };
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Movimientos</h1>
        <p className="text-gray-600">Historial de movimientos de inventario</p>
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
                      {mov.material_nombre || mov.material_sku}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        mov.tipo_movimiento === 'entrada' ? 'badge-success' : 
                        mov.tipo_movimiento === 'salida' ? 'badge-danger' : 
                        'badge-warning'
                      }`}>
                        {mov.tipo_movimiento || mov.tipo_movimiento_nombre}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-medium">
                      {mov.cantidad || 0}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {mov.responsable || 'Sistema'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MovimientosList;