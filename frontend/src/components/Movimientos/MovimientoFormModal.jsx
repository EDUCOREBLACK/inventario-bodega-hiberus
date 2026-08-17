import React, { useState } from 'react';
import api from '../../services/api';

const initialForm = {
  producto_id: '',
  cantidad: '1',
  ubicacion_id: '1',
  tipo: 'entrada',
  observaciones: ''
};

const MovimientoFormModal = ({ isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        producto_id: Number(form.producto_id),
        cantidad: Number(form.cantidad),
        ubicacion_id: Number(form.ubicacion_id)
      };

      if (form.tipo === 'entrada') {
        await api.post('/movimientos/entrada', payload);
      } else {
        await api.post('/movimientos/salida', payload);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      alert('No se pudo registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Registrar movimiento</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="input-field">
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Producto ID</label>
              <input type="number" name="producto_id" value={form.producto_id} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
              <input type="number" name="cantidad" value={form.cantidad} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación ID</label>
              <input type="number" name="ubicacion_id" value={form.ubicacion_id} onChange={handleChange} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea name="observaciones" value={form.observaciones} onChange={handleChange} className="input-field" rows="3" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MovimientoFormModal;
