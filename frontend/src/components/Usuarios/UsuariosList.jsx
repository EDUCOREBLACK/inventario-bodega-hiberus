import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Plus, UserCog, ShieldCheck, Pencil, Trash2 } from 'lucide-react';

const emptyForm = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  rol: 'operador',
  telefono: '',
  departamento: '',
  activo: true,
};

const UsuariosList = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsuarios = async () => {
    try {
      const response = await api.get('/usuarios');
      setUsuarios(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsuarios(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.nombre) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, form);
      } else {
        await api.post('/usuarios', form);
      }
      resetForm();
      await fetchUsuarios();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (usuario) => {
    setEditingId(usuario.id);
    setForm({
      nombre: usuario.nombre || '',
      apellido: usuario.apellido || '',
      email: usuario.email || '',
      password: '',
      rol: usuario.rol || 'operador',
      telefono: usuario.telefono || '',
      departamento: usuario.departamento || '',
      activo: Boolean(usuario.activo),
    });
  };

  const handleDelete = async (usuario) => {
    if (!window.confirm(`¿Eliminar a ${usuario.nombre}?`)) return;
    try {
      await api.delete(`/usuarios/${usuario.id}`);
      await fetchUsuarios();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el usuario');
    }
  };

  if (loading) return <div className="text-gray-500">Cargando usuarios...</div>;

  return (
    <div className="space-y-4">
      <div className="card border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Usuarios</h3>
            <p className="text-sm text-gray-500">Mantenedor de acceso y permisos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <input className="input-field" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <input className="input-field" placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
          <input className="input-field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <input className="input-field" placeholder="Contraseña" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select className="input-field" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
            <option value="admin">Admin</option>
            <option value="gerente">Gerente</option>
            <option value="supervisor">Supervisor</option>
            <option value="operador">Operador</option>
          </select>
          <input className="input-field" placeholder="Departamento" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
          <input className="input-field" placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
            Activo
          </label>
          <div className="md:col-span-2 flex gap-2">
            <button className="btn-primary flex items-center" type="submit" disabled={saving}>
              <Plus className="w-4 h-4 mr-2" /> {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
            </button>
            {editingId ? <button type="button" className="btn-secondary" onClick={resetForm}>Cancelar</button> : null}
          </div>
        </form>
      </div>

      <div className="card border border-gray-200 shadow-sm">
        <div className="space-y-3">
          {usuarios.map((u) => (
            <div key={u.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-hiberus-blue text-white flex items-center justify-center">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{u.nombre} {u.apellido}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-2">
                <div>
                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">
                    <ShieldCheck className="w-3 h-3 mr-1" /> {u.rol}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{u.activo ? 'Activo' : 'Inactivo'}</p>
                </div>
                <button className="text-hiberus-blue" onClick={() => handleEdit(u)}><Pencil className="w-4 h-4" /></button>
                <button className="text-red-500" onClick={() => handleDelete(u)}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsuariosList;