import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search } from 'lucide-react';

const API_URL = 'http://localhost:5001/api';

const MaterialesList = () => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMateriales = async () => {
      try {
        const response = await axios.get(`${API_URL}/materiales`);
        setMateriales(response.data || []);
      } catch (error) {
        console.error('Error al cargar materiales:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMateriales();
  }, []);

  const filteredMateriales = materiales.filter(m =>
    m.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Materiales</h1>
          <p className="text-gray-600">Gestión de inventario</p>
        </div>
        <button className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Material
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar materiales..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="text-sm text-gray-500">
            {filteredMateriales.length} materiales
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Tipo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredMateriales.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-500">
                    No hay materiales registrados
                  </td>
                </tr>
              ) : (
                filteredMateriales.map((material) => (
                  <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {material.sku}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700">
                      {material.nombre}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      <span className="badge badge-info">
                        {material.tipo_nombre || material.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${(material.stock_total || material.cantidad || 0) > 10 ? 'badge-success' : 'badge-danger'}`}>
                        {material.stock_total || material.cantidad || 0}
                      </span>
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

export default MaterialesList;