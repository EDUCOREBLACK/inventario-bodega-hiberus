import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Store } from 'lucide-react';
import api from '../../services/api';

const emptyForm = { nombre: '', rut: '', telefono: '', email: '', direccion: '', contacto_nombre: '', contacto_telefono: '', contacto_email: '', condiciones_pago: '', plazo_entrega: '' };

const ProveedoresList = () => {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadProveedores = async () => {
    setLoading(true);
    try {
      const response = await api.get('/proveedores');
      setProveedores(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProveedores(); }, []);

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
        await api.put(`/proveedores/${editingId}`, form);
      } else {
        await api.post('/proveedores', form);
      }
      resetForm();
      await loadProveedores();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (proveedor) => {
    setEditingId(proveedor.id);
    setForm({
      nombre: proveedor.nombre || '',
      rut: proveedor.rut || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      direccion: proveedor.direccion || '',
      contacto_nombre: proveedor.contacto_nombre || '',
      contacto_telefono: proveedor.contacto_telefono || '',
      contacto_email: proveedor.contacto_email || '',
      condiciones_pago: proveedor.condiciones_pago || '',
      plazo_entrega: proveedor.plazo_entrega || ''
    });
  };

  const handleDelete = async (proveedor) => {
    if (!window.confirm(`¿Eliminar a ${proveedor.nombre}?`)) return;
    try {
      await api.delete(`/proveedores/${proveedor.id}`);
      await loadProveedores();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo eliminar el proveedor');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-hiberus-blue" />
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input-field" placeholder="RUT" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
            <input className="input-field" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input-field" placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            <input className="input-field" placeholder="Contacto" value={form.contacto_nombre} onChange={(e) => setForm({ ...form, contacto_nombre: e.target.value })} />
            <input className="input-field" placeholder="Teléfono contacto" value={form.contacto_telefono} onChange={(e) => setForm({ ...form, contacto_telefono: e.target.value })} />
            <input className="input-field" placeholder="Email contacto" value={form.contacto_email} onChange={(e) => setForm({ ...form, contacto_email: e.target.value })} />
            <input className="input-field" placeholder="Condiciones de pago" value={form.condiciones_pago} onChange={(e) => setForm({ ...form, condiciones_pago: e.target.value })} />
            <input className="input-field" placeholder="Plazo de entrega" value={form.plazo_entrega} onChange={(e) => setForm({ ...form, plazo_entrega: e.target.value })} />
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
            <h2 className="text-lg font-semibold text-gray-900">Listado de proveedores</h2>
            <span className="text-sm text-gray-500">{proveedores.length} registros</span>
          </div>
          {loading ? <p className="text-gray-500">Cargando proveedores...</p> : (
            <div className="space-y-3">
              {proveedores.length === 0 ? <p className="text-gray-500">No hay proveedores registrados</p> : proveedores.map((proveedor) => (
                <div key={proveedor.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{proveedor.nombre}</p>
                    <p className="text-sm text-gray-500">{proveedor.email || proveedor.telefono || 'Sin contacto'}</p>
                    <p className="text-xs text-gray-400">{proveedor.contacto_nombre || 'Sin contacto principal'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-hiberus-blue" onClick={() => handleEdit(proveedor)}><Pencil className="w-4 h-4" /></button>
                    <button className="text-red-500" onClick={() => handleDelete(proveedor)}><Trash2 className="w-4 h-4" /></button>
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

export default ProveedoresList;
