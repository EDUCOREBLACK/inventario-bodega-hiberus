import toast from 'react-hot-toast';
import React, { useState } from 'react';
import api from '../../services/api';

const StockAdjustModal = ({ isOpen, onClose, material, onSaved }) => {
  const [form, setForm] = useState({ operacion: 'agregar', cantidad: '1', metraje: '0', ubicacion_id: '1', motivo: '' });
  const [saving, setSaving] = useState(false);

  if (!isOpen || !material) return null;

  const stockActual = Number(material.stock_total || material.cantidad || 0);
  const metrajeActual = Number(material.metraje_unitario ?? material.metraje ?? material.metraje_inicial ?? 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/materiales/${material.id}/stock`, {
        operacion: form.operacion,
        cantidad: Number(form.cantidad || 0),
        metraje: Number(form.metraje || 0),
        ubicacion_id: Number(form.ubicacion_id || 1),
        motivo: form.motivo || 'Movimiento de inventario desde el panel'
      });
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error ajustando stock:', error);
      toast.error('No se pudo ajustar el stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Control de stock</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
          <div className="flex justify-between">
            <span>Stock actual:</span>
            <span className="font-semibold">{stockActual}</span>
          </div>
          <div className="flex justify-between">
            <span>Metraje actual:</span>
            <span className="font-semibold">{metrajeActual.toFixed(2)} m</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Usa <span className="font-semibold">Agregar</span> o <span className="font-semibold">Retirar</span> para movimientos reales. Usa <span className="font-semibold">Ajustar por conteo</span> solo para corregir el total final cuando revisaste físicamente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operación</label>
            <select name="operacion" value={form.operacion} onChange={handleChange} className="input-field">
              <option value="agregar">Agregar stock</option>
              <option value="retirar">Retirar stock</option>
              <option value="ajustar">Ajustar por conteo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <input type="number" name="cantidad" value={form.cantidad} onChange={handleChange} className="input-field" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metraje</label>
            <input type="number" name="metraje" value={form.metraje} onChange={handleChange} className="input-field" min="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
            <input type="number" name="ubicacion_id" value={form.ubicacion_id} onChange={handleChange} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
            <textarea name="motivo" value={form.motivo} onChange={handleChange} className="input-field" rows="3" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockAdjustModal;
