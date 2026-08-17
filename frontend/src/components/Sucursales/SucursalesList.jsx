import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import api from '../../services/api';

const emptyForm = { nombre: '', direccion: '', telefono: '', email: '', tipo: 'bodega' };

const SucursalesList = () => {
  const [sucursales, setSucursales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadSucursales = async () => {
    setLoading(true);
    try {
      const response = await api.get('/sucursales');
      setSucursales(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSucursales(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/sucursales/${editingId}`, form);
      } else {
        await api.post('/sucursales', form);
      }
      resetForm();
      await loadSucursales();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar la sucursal');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (sucursal) => {
    setEditingId(sucursal.id);
    setForm({
      nombre: sucursal.nombre || '',
      direccion: sucursal.direccion || '',
      telefono: sucursal.telefono || '',
      email: sucursal.email || '',
      tipo: sucursal.tipo || 'bodega'
    });
  };

  const handleDelete = async (sucursal) => {
    if (!window.confirm(`¿Eliminar ${sucursal.nombre}?`)) return;
    try {
      await api.delete(`/sucursales/${sucursal.id}`);
      await loadSucursales();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo eliminar la sucursal');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-hiberus-blue" />
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar sucursal' : 'Nueva sucursal'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input-field" placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            <input className="input-field" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <select className="input-field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="bodega">Bodega</option>
              <option value="oficina">Oficina</option>
              <option value="tienda">Tienda</option>
              <option value="datacenter">Datacenter</option>
            </select>
            <div className="flex gap-2">
              <button className="btn-primary flex items-center" type="submit" disabled={saving}>
                <Plus className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              {editingId ? <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button> : null}
            </div>
          </form>
        </div>
        <div className="lg:col-span-2 card border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Listado de sucursales</h2>
            <span className="text-sm text-gray-500">{sucursales.length} registros</span>
          </div>
          {loading ? <p className="text-gray-500">Cargando sucursales...</p> : (
            <div className="space-y-3">
              {sucursales.length === 0 ? <p className="text-gray-500">No hay sucursales registradas</p> : sucursales.map((sucursal) => (
                <div key={sucursal.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{sucursal.nombre}</p>
                    <p className="text-sm text-gray-500">{sucursal.direccion || 'Sin dirección'}</p>
                    <p className="text-xs text-gray-400">{sucursal.telefono || 'Sin teléfono'} · {sucursal.tipo || 'bodega'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-hiberus-blue" onClick={() => handleEdit(sucursal)}><Pencil className="w-4 h-4" /></button>
                    <button className="text-red-500" onClick={() => handleDelete(sucursal)}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SucursalesList;
