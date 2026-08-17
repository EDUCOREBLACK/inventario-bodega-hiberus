import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const initialForm = {
  nombre: '',
  codigo: '',
  tipo: 'interno',
  cliente_id: '',
  responsable_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  descripcion: '',
  estado: 'activo'
};

const ProyectoFormModal = ({ isOpen, onClose, proyecto, onSaved }) => {
  const [form, setForm] = useState(initialForm);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [clientesRes, usuariosRes] = await Promise.all([
          api.get('/clientes'),
          api.get('/usuarios')
        ]);
        setClientes(clientesRes.data || []);
        setUsuarios(usuariosRes.data || []);
      } catch (error) {
        console.error(error);
      }
    };

    loadCatalogos();

    if (proyecto) {
      setForm({
        ...initialForm,
        ...proyecto,
        cliente_id: proyecto.cliente_id?.toString() || '',
        responsable_id: proyecto.responsable_id?.toString() || '',
        fecha_inicio: proyecto.fecha_inicio || '',
        fecha_fin: proyecto.fecha_fin || '',
        estado: proyecto.estado || 'activo'
      });
      setClienteSeleccionado(proyecto.cliente_id?.toString() || '');
      setClienteNombre('');
    } else {
      setForm(initialForm);
      setClienteSeleccionado('');
      setClienteNombre('');
    }
  }, [proyecto, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClienteChange = (e) => {
    const value = e.target.value;
    setClienteSeleccionado(value);
    if (value === '__new__') {
      setForm((prev) => ({ ...prev, cliente_id: '' }));
      setClienteNombre('');
    } else {
      setForm((prev) => ({ ...prev, cliente_id: value }));
      setClienteNombre('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nombre = form.nombre.trim();
    if (!nombre) {
      setError('El nombre del proyecto es obligatorio.');
      return;
    }
    if (form.fecha_inicio && form.fecha_fin && form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }
    if (clienteSeleccionado === '__new__' && !clienteNombre.trim()) {
      setError('Ingresa el nombre del nuevo cliente o selecciona uno existente.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      let clienteId = form.cliente_id ? Number(form.cliente_id) : null;

      if (!clienteId && clienteNombre.trim()) {
        const clienteResponse = await api.post('/clientes', {
          nombre: clienteNombre.trim(),
          tipo: 'empresa'
        });
        clienteId = clienteResponse.data?.id || null;
      }

      const payload = {
        ...form,
        nombre,
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        cliente_id: clienteId,
        responsable_id: form.responsable_id ? Number(form.responsable_id) : null
      };

      if (proyecto?.id) {
        await api.put(`/proyectos/${proyecto.id}`, payload);
      } else {
        await api.post('/proyectos', payload);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      alert('No se pudo guardar el proyecto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            {proyecto?.id ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} className="input-field" maxLength="120" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
              <input name="codigo" value={form.codigo} onChange={handleChange} className="input-field" maxLength="20" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="input-field">
                <option value="interno">Interno</option>
                <option value="externo">Externo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={clienteSeleccionado} onChange={handleClienteChange} className="input-field">
                <option value="">Sin cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                ))}
                <option value="__new__">Crear nuevo cliente</option>
              </select>
              {clienteSeleccionado === '__new__' && (
                <input
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="input-field mt-2"
                  placeholder="Nombre del cliente nuevo"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
              <select name="responsable_id" value={form.responsable_id} onChange={handleChange} className="input-field">
                <option value="">Sin responsable</option>
                {usuarios.map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>
                    {usuario.nombre} {usuario.apellido}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange} className="input-field">
                <option value="activo">Activo</option>
                <option value="completado">Completado</option>
                <option value="pausado">Pausado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label>
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label>
              <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} min={form.fecha_inicio || undefined} className="input-field" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="input-field" rows="3" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : proyecto?.id ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProyectoFormModal;
