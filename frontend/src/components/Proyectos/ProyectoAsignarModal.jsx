import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const ProyectoAsignarModal = ({ isOpen, onClose, proyecto, onSaved }) => {
  const [materiales, setMateriales] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [cantidad, setCantidad] = useState('1');
  const [seriales, setSeriales] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedMaterial = materiales.find((item) => String(item.id) === String(selectedMaterialId)) || null;
  const requiereSerial = Boolean(selectedMaterial?.requiere_serial) || Boolean(seriales.trim());

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const response = await api.get('/materiales');
        setMateriales(response.data || []);
      } catch (error) {
        console.error(error);
      }
    };
    load();
  }, [isOpen]);

  useEffect(() => {
    if (!selectedMaterial) {
      setSeriales('');
      setCantidad('1');
      return;
    }
    if (selectedMaterial.requiere_serial) {
      setCantidad('1');
      return;
    }
    setSeriales('');
  }, [selectedMaterialId]);

  if (!isOpen || !proyecto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMaterialId) return;

    const serialList = seriales.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    if (selectedMaterial?.requiere_serial && serialList.length === 0) {
      alert('Este material requiere ingresar los números de serie para la asignación.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/asignaciones/proyecto', {
        proyecto_id: proyecto.id,
        producto_id: Number(selectedMaterialId),
        cantidad: Number(serialList.length > 0 ? serialList.length : (cantidad || 0)),
        seriales: serialList.length > 0 ? serialList : undefined,
        observaciones: `Asignación desde panel de proyectos`
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert('No se pudo asignar el material al proyecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Asignar material</h3>
            <p className="text-sm text-gray-500">{proyecto.nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
            <select value={selectedMaterialId} onChange={(e) => setSelectedMaterialId(e.target.value)} className="input-field" required>
              <option value="">Selecciona un material</option>
              {materiales.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre} (stock {item.stock_total || 0})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Números de serie del material (opcional)</label>
            <textarea value={seriales} onChange={(e) => setSeriales(e.target.value)} className="input-field" rows="4" placeholder="SER-001, SER-002, SER-003" />
            <p className="text-xs text-gray-500 mt-1">Si conoces los seriales instalados en este proyecto, se descuentan del inventario y quedan trazados.</p>
          </div>
          {!selectedMaterial?.requiere_serial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} className="input-field" required />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Asignar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProyectoAsignarModal;
