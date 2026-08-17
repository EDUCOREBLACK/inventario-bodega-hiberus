import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ProyectoBulkAsignarModal = ({ isOpen, onClose, proyecto, onSaved }) => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // selectedItems = { [materialId]: { selected: boolean, cantidad: number, seriales: string } }
  const [selectedItems, setSelectedItems] = useState({});

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/materiales');
        setMateriales(response.data || []);
      } catch (error) {
        console.error(error);
        toast.error('Error cargando materiales');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  if (!isOpen || !proyecto) return null;

  const handleToggle = (id) => {
    setSelectedItems(prev => {
      const isSelected = prev[id]?.selected;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          selected: !isSelected,
          cantidad: !isSelected && !prev[id]?.cantidad ? 1 : (prev[id]?.cantidad || 1)
        }
      };
    });
  };

  const handleCantidadChange = (id, val) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: { ...prev[id], cantidad: val }
    }));
  };

  const handleSerialesChange = (id, val) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: { ...prev[id], seriales: val }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const itemsToAssign = Object.entries(selectedItems)
      .filter(([id, data]) => data.selected)
      .map(([id, data]) => {
        const material = materiales.find(m => String(m.id) === String(id));
        const serialList = (data.seriales || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
        return {
          producto_id: Number(id),
          cantidad: Number(serialList.length > 0 ? serialList.length : (data.cantidad || 0)),
          seriales: serialList.length > 0 ? serialList : undefined,
          requiere_serial: material?.requiere_serial
        };
      });

    if (itemsToAssign.length === 0) {
      toast.error('Selecciona al menos un material');
      return;
    }

    const errors = itemsToAssign.filter(item => item.requiere_serial && (!item.seriales || item.seriales.length === 0));
    if (errors.length > 0) {
      toast.error('Has seleccionado materiales que requieren números de serie, pero no los ingresaste.');
      return;
    }

    setSaving(true);
    let successCount = 0;
    
    try {
      // Usar Promise.all para enviar todas las asignaciones
      const requests = itemsToAssign.map(item => 
        api.post('/asignaciones/proyecto', {
          proyecto_id: proyecto.id,
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          seriales: item.seriales,
          observaciones: 'Asignación masiva desde panel de proyectos'
        }).then(() => { successCount++; })
      );
      
      await Promise.all(requests);
      toast.success(`Se asignaron ${successCount} materiales al proyecto`);
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'Error al procesar algunas asignaciones');
      if (successCount > 0) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Asignación Masiva de Materiales</h3>
            <p className="text-sm text-gray-500">Proyecto: {proyecto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando inventario...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1 mb-4 border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seleccionar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Base</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad a Asignar</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seriales (Opcional/Req)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {materiales.filter(m => m.stock_total > 0).map((item) => {
                    const isSelected = selectedItems[item.id]?.selected || false;
                    return (
                      <tr key={item.id} className={isSelected ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggle(item.id)}
                            className="h-5 w-5 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="font-medium">{item.nombre}</div>
                          <div className="text-xs text-gray-500">{item.tipo_nombre || 'Sin tipo'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {item.stock_total}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            min="1"
                            max={item.stock_total}
                            disabled={!isSelected || item.requiere_serial}
                            value={selectedItems[item.id]?.cantidad || ''}
                            onChange={(e) => handleCantidadChange(item.id, e.target.value)}
                            className="input-field py-1 text-sm w-24"
                            placeholder="Cant."
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            disabled={!isSelected}
                            value={selectedItems[item.id]?.seriales || ''}
                            onChange={(e) => handleSerialesChange(item.id, e.target.value)}
                            className="input-field py-1 text-sm"
                            placeholder={item.requiere_serial ? "Requerido (sep coma)" : "Opcional"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 flex-shrink-0 pt-2 border-t">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando asignaciones...' : 'Asignar Marcados'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ProyectoBulkAsignarModal;
