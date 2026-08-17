import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import api from '../../services/api';

const emptyForm = { nombre: '', rut: '', telefono: '', email: '', direccion: '', tipo: 'empresa' };

const ClientesList = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadClientes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clientes');
      setClientes(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClientes(); }, []);

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
        await api.put(`/clientes/${editingId}`, form);
      } else {
        await api.post('/clientes', form);
      }
      resetForm();
      await loadClientes();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cliente) => {
    setEditingId(cliente.id);
    setForm({
      nombre: cliente.nombre || '',
      rut: cliente.rut || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      tipo: cliente.tipo || 'empresa'
    });
  };

  const handleDelete = async (cliente) => {
    if (!window.confirm(`¿Eliminar a ${cliente.nombre}?`)) return;
    try {
      await api.delete(`/clientes/${cliente.id}`);
      await loadClientes();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el cliente');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gestión de clientes para proyectos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-hiberus-blue" />
            <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            <input className="input-field" placeholder="RUT" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} />
            <input className="input-field" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input className="input-field" placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            <select className="input-field" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="empresa">Empresa</option>
              <option value="persona">Persona</option>
              <option value="gobierno">Gobierno</option>
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
            <h2 className="text-lg font-semibold text-gray-900">Listado de clientes</h2>
            <span className="text-sm text-gray-500">{clientes.length} registros</span>
          </div>
          {loading ? <p className="text-gray-500">Cargando clientes...</p> : (
            <div className="space-y-3">
              {clientes.length === 0 ? <p className="text-gray-500">No hay clientes registrados</p> : clientes.map((cliente) => (
                <div key={cliente.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between bg-gray-50">
                  <div>
                    <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                    <p className="text-sm text-gray-500">{cliente.email || cliente.telefono || 'Sin contacto'}</p>
                    <p className="text-xs text-gray-400">{cliente.rut || 'Sin RUT'} · {cliente.tipo || 'empresa'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-hiberus-blue" onClick={() => handleEdit(cliente)}><Pencil className="w-4 h-4" /></button>
                    <button className="text-red-500" onClick={() => handleDelete(cliente)}><Trash2 className="w-4 h-4" /></button>
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

export default ClientesList;
