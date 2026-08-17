import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, TrendingDown, Package, Boxes } from 'lucide-react';
import api from '../../services/api';
import MaterialFormModal from './MaterialFormModal';
import StockAdjustModal from './StockAdjustModal';
import StockUnitsModal from '../Stock/StockUnitsModal';
import MaterialFilters from './MaterialFilters';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value));
};

const getUnidadLabel = (unidadId) => {
  if (Number(unidadId) === 2) return 'Metro';
  return 'Unidad';
};

const getImageUrl = (imagePath) => imagePath ? `http://localhost:5001${imagePath}` : null;

const MaterialesList = () => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isUnitsModalOpen, setIsUnitsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [stockTotals, setStockTotals] = useState({});

  const fetchMateriales = async () => {
    try {
      const response = await api.get('/materiales');
      setMateriales(response.data || []);
    } catch (error) {
      console.error('Error al cargar materiales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriales();
  }, []);

  useEffect(() => {
    let active = true;

    const loadPhysicalStockTotals = async () => {
      const totals = await Promise.all(materiales.map(async (material) => {
        try {
          const response = await api.get(`/materiales/${material.id}/stock`);
          const total = (response.data || []).reduce((sum, unit) => {
            const isAvailable = unit.estado === 'disponible';
            const isUnassignedMaintenance = unit.estado === 'en_mantenimiento' && !unit.proyecto_asignado_id;
            return sum + (isAvailable || isUnassignedMaintenance ? Number(unit.cantidad || 0) : 0);
          }, 0);
          return [material.id, total];
        } catch (error) {
          console.error(`Error al cargar el stock de ${material.id}:`, error);
          return [material.id, Number(material.stock_total || material.cantidad || 0)];
        }
      }));

      if (active) {
        setStockTotals(Object.fromEntries(totals));
      }
    };

    if (materiales.length > 0) {
      loadPhysicalStockTotals();
    } else {
      setStockTotals({});
    }

    return () => {
      active = false;
    };
  }, [materiales]);

  const filteredMateriales = materiales.filter((m) => {
    const modelText = (m.modelo || m.nombre || '').toLowerCase();
    return modelText.includes(searchTerm.toLowerCase()) ||
      (m.tipo_nombre || m.tipo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.marca_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.proveedor_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalValorInventario = filteredMateriales.reduce((sum, material) => {
    const stockTotal = Number(stockTotals[material.id] ?? material.stock_total ?? material.cantidad ?? 0);
    const precioUnitario = Number(material.precio_unitario || 0);
    return sum + (stockTotal * precioUnitario);
  }, 0);

  const groupedMateriales = filteredMateriales.reduce((acc, material) => {
    const tipo = material.tipo_nombre || material.tipo || 'Sin tipo';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(material);
    return acc;
  }, {});

  const handleCreate = () => {
    setSelectedMaterial(null);
    setIsModalOpen(true);
  };

  const handleEdit = (material) => {
    setSelectedMaterial(material);
    setIsModalOpen(true);
  };

  const handleDelete = async (material) => {
    if (!window.confirm(`¿Eliminar ${material.nombre}?`)) return;
    try {
      await api.delete(`/materiales/${material.id}`);
      await fetchMateriales();
    } catch (error) {
      console.error('Error al eliminar material:', error);
      alert('No se pudo eliminar el material');
    }
  };

  const handleAdjustStock = (material) => {
    setSelectedMaterial(material);
    setIsStockModalOpen(true);
  };

  const handleUnits = (material) => {
    setSelectedMaterial(material);
    setIsUnitsModalOpen(true);
  };

  const handleUnitsChanged = async (materialId, units) => {
    const total = (units || []).reduce((sum, unit) => {
      const isAvailable = unit.estado === 'disponible';
      const isUnassignedMaintenance = unit.estado === 'en_mantenimiento' && !unit.proyecto_asignado_id;
      return sum + (isAvailable || isUnassignedMaintenance ? Number(unit.cantidad || 0) : 0);
    }, 0);
    setStockTotals((currentTotals) => ({ ...currentTotals, [materialId]: total }));
    await fetchMateriales();
  };

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
        <div className="flex items-center gap-2">
          <button onClick={handleCreate} className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Material
          </button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <MaterialFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} onClear={() => setSearchTerm('')} />
          </div>
          <span className="text-sm text-gray-500">
            {filteredMateriales.length} productos
          </span>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 mb-4 text-sm text-blue-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4" />
            <span>Listado de productos con datos técnicos y valor total del inventario.</span>
          </div>
          <div className="font-semibold text-blue-800 whitespace-nowrap">
            Valor total: {formatCurrency(totalValorInventario)}
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-left text-[11px] uppercase text-gray-500">
              <tr>
                <th className="px-3 py-3 font-medium">Producto</th>
                <th className="px-3 py-3 font-medium">Tipo / marca</th>
                <th className="px-3 py-3 font-medium">Proveedor</th>
                <th className="px-3 py-3 font-medium text-right">Stock</th>
                <th className="px-3 py-3 font-medium text-right">Metraje Unitario</th>
                <th className="px-3 py-3 font-medium text-right">Precio Unitario</th>
                <th className="px-3 py-3 font-medium text-right">Valor</th>
                <th className="px-3 py-3 font-medium">Estado</th>
                <th className="px-3 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredMateriales.length === 0 ? (
                <tr><td colSpan="9" className="py-8 text-center text-gray-500">No hay materiales registrados</td></tr>
              ) : filteredMateriales.map((material) => {
                const modelo = material.modelo || material.nombre || 'Sin modelo';
                const stockTotal = Number(stockTotals[material.id] ?? material.stock_total ?? material.cantidad ?? 0);
                const precioUnitario = Number(material.precio_unitario || 0);
                const valorTotalProducto = stockTotal * precioUnitario;
                const imageUrl = getImageUrl(material.imagen_principal_url);

                return (
                  <tr key={material.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        {imageUrl ? <img src={imageUrl} alt="" className="h-10 w-10 rounded object-cover border border-gray-200" /> : <div className="h-10 w-10 rounded border border-dashed border-gray-300 bg-gray-50" />}
                        <div>
                          <p className="font-medium text-gray-900">{modelo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-700"><div>{material.tipo_nombre || 'Sin tipo'}</div><div className="text-xs text-gray-500">{material.marca_nombre || 'Sin marca'}</div></td>
                    <td className="px-3 py-3 text-gray-700">{material.proveedor_nombre || 'Sin proveedor'}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{stockTotal}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{material.requiere_metraje ? `${Number(material.metraje_unitario ?? material.metraje ?? 0)} m` : '—'}</td>
                    <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(precioUnitario)}</td>
                    <td className="px-3 py-3 text-right font-medium text-gray-900">{formatCurrency(valorTotalProducto)}</td>
                    <td className="px-3 py-3"><span className={`badge ${material.estado === 'activo' ? 'badge-success' : 'badge-danger'}`}>{material.estado === 'activo' ? 'Activo' : 'Inactivo'}</span></td>
                    <td className="px-3 py-3"><div className="flex justify-end gap-1">
                      <button onClick={() => handleUnits(material)} className="p-2 text-blue-700 hover:bg-blue-50 rounded" title="Listar unidades"><Package className="w-4 h-4" /></button>
                      <button onClick={() => handleEdit(material)} className="p-2 text-gray-700 hover:bg-gray-100 rounded" title="Editar producto"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(material)} className="p-2 text-red-700 hover:bg-red-50 rounded" title="Eliminar producto"><Trash2 className="w-4 h-4" /></button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        material={selectedMaterial}
        onSaved={fetchMateriales}
      />



      <StockUnitsModal
        isOpen={isUnitsModalOpen}
        onClose={() => setIsUnitsModalOpen(false)}
        material={selectedMaterial}
        onUnitsChanged={handleUnitsChanged}
      />

    </div>
  );
};

export default MaterialesList;