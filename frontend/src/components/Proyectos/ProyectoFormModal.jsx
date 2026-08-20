import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Trash2 } from 'lucide-react';

const initialForm = {
  nombre: '',
  codigo: '',
  tipo: 'interno',
  cliente_id: '',
  responsable_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  descripcion: '',
  estado: 'activo',
  especificaciones: '',
  configuracion: '',
  cantidad_personas: 0,
  horas_hombre: 0,
  costo_hora_hombre: 0
};

const ProyectoFormModal = ({ isOpen, onClose, onSaved, proyecto }) => {
  const [activeTab, setActiveTab] = useState('detalles');
  const [form, setForm] = useState(initialForm);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tareas State
  const [tareas, setTareas] = useState([]);
  const [newTarea, setNewTarea] = useState({ nombre: '', fecha_inicio: '', fecha_fin: '', estado: 'pendiente' });

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
  }, []);

  useEffect(() => {
    if (proyecto && isOpen) {
      setForm({
        ...initialForm,
        ...proyecto,
        cliente_id: proyecto.cliente_id?.toString() || '',
        responsable_id: proyecto.responsable_id?.toString() || '',
        fecha_inicio: proyecto.fecha_inicio || '',
        fecha_fin: proyecto.fecha_fin || '',
        estado: proyecto.estado || 'activo',
        especificaciones: proyecto.especificaciones || '',
        configuracion: proyecto.configuracion || '',
        cantidad_personas: proyecto.cantidad_personas || 0,
        horas_hombre: proyecto.horas_hombre || 0,
        costo_hora_hombre: proyecto.costo_hora_hombre || 0
      });
      setClienteSeleccionado(proyecto.cliente_id?.toString() || '');
      setClienteNombre('');
      loadTareas(proyecto.id);
    } else {
      setForm(initialForm);
      setClienteSeleccionado('');
      setClienteNombre('');
      setTareas([]);
      setActiveTab('detalles');
    }
  }, [proyecto, isOpen]);

  const loadTareas = async (id) => {
    try {
      const res = await api.get(`/proyectos/${id}/tareas`);
      setTareas(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

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
      console.error(error);
      toast.error('No se pudo guardar el proyecto');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTarea = async () => {
    if(!newTarea.nombre || !newTarea.fecha_inicio || !newTarea.fecha_fin) {
      toast.error('Faltan datos de la tarea');
      return;
    }
    if (!proyecto?.id) {
      toast.error('Primero debes crear el proyecto para asignarle tareas');
      return;
    }
    try {
      await api.post(`/proyectos/${proyecto.id}/tareas`, newTarea);
      setNewTarea({ nombre: '', fecha_inicio: '', fecha_fin: '', estado: 'pendiente' });
      loadTareas(proyecto.id);
      onSaved(); // update list progress
    } catch (e) {
      toast.error('Error al agregar tarea');
    }
  };

  const handleUpdateTareaEstado = async (tId, estado) => {
    try {
      await api.put(`/proyectos/${proyecto.id}/tareas/${tId}`, { estado });
      loadTareas(proyecto.id);
      onSaved(); // update list progress
    } catch (e) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteTarea = async (tId) => {
    if(!window.confirm('¿Eliminar tarea?')) return;
    try {
      await api.delete(`/proyectos/${proyecto.id}/tareas/${tId}`);
      loadTareas(proyecto.id);
      onSaved();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const isOverdue = (dateStr) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const dateObj = new Date(dateStr);
    dateObj.setDate(dateObj.getDate() + 1); // fix timezone offset bias slightly
    return dateObj < today;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            {proyecto?.id ? `Proyecto: ${form.nombre}` : 'Nuevo Proyecto'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 mt-2 gap-4">
          <button type="button" onClick={() => setActiveTab('detalles')} className={`pb-2 text-sm font-medium ${activeTab === 'detalles' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Detalles Generales</button>
          <button type="button" onClick={() => setActiveTab('costos')} className={`pb-2 text-sm font-medium ${activeTab === 'costos' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Laboral y Configuración</button>
          {proyecto?.id && <button type="button" onClick={() => setActiveTab('tareas')} className={`pb-2 text-sm font-medium ${activeTab === 'tareas' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Seguimiento Tareas</button>}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          
          {activeTab === 'detalles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input name="nombre" value={form.nombre} onChange={handleChange} className="input-field" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Código</label><input name="codigo" value={form.codigo} onChange={handleChange} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select name="tipo" value={form.tipo} onChange={handleChange} className="input-field"><option value="interno">Interno</option><option value="externo">Externo</option></select></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select value={clienteSeleccionado} onChange={handleClienteChange} className="input-field"><option value="">Sin cliente</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}<option value="__new__">Crear nuevo cliente</option></select>
                {clienteSeleccionado === '__new__' && <input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="input-field mt-2" placeholder="Nombre cliente" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                <select name="responsable_id" value={form.responsable_id} onChange={handleChange} className="input-field"><option value="">Sin responsable</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label><select name="estado" value={form.estado} onChange={handleChange} className="input-field"><option value="activo">Activo</option><option value="completado">Completado</option><option value="pausado">Pausado</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha inicio</label><input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha fin</label><input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} className="input-field" /></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="input-field" rows="3" />
              </div>
            </div>
          )}

          {activeTab === 'costos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Cant. Personas</label><input type="number" name="cantidad_personas" value={form.cantidad_personas} onChange={handleChange} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Horas Hombre</label><input type="number" name="horas_hombre" value={form.horas_hombre} onChange={handleChange} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo / Hora</label><input type="number" name="costo_hora_hombre" value={form.costo_hora_hombre} onChange={handleChange} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Especificaciones</label><textarea name="especificaciones" value={form.especificaciones} onChange={handleChange} className="input-field" rows="4" placeholder="Requerimientos, detalles funcionales..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Configuración / Script</label><textarea name="configuracion" value={form.configuracion} onChange={handleChange} className="input-field font-mono text-sm bg-gray-50" rows="5" placeholder="Pega el script o config JSON aquí..." /></div>
            </div>
          )}

          {activeTab === 'tareas' && (
            <div className="space-y-4">
              <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border">
                <div className="flex-1"><label className="block text-xs font-medium text-gray-700 mb-1">Nueva Tarea</label><input value={newTarea.nombre} onChange={e => setNewTarea({...newTarea, nombre: e.target.value})} className="input-field text-sm" placeholder="Ej: Cableado" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Inicio</label><input type="date" value={newTarea.fecha_inicio} onChange={e => setNewTarea({...newTarea, fecha_inicio: e.target.value})} className="input-field text-sm" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Fin</label><input type="date" value={newTarea.fecha_fin} onChange={e => setNewTarea({...newTarea, fecha_fin: e.target.value})} className="input-field text-sm" /></div>
                <button type="button" onClick={handleAddTarea} className="btn-primary py-2 text-sm">Agregar</button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tarea</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Fechas</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th><th className="px-4 py-2"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tareas.map(t => {
                      const overdue = t.estado !== 'realizada' && isOverdue(t.fecha_fin);
                      return (
                        <tr key={t.id} className={overdue ? 'bg-red-50' : 'bg-white'}>
                          <td className={`px-4 py-2 text-sm ${overdue ? 'text-red-700 font-medium' : 'text-gray-900'}`}>{t.nombre}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{t.fecha_inicio} al {t.fecha_fin}</td>
                          <td className="px-4 py-2 text-sm">
                            <select value={t.estado} onChange={e => handleUpdateTareaEstado(t.id, e.target.value)} className={`text-sm border-gray-300 rounded-md ${overdue ? 'bg-red-100 text-red-800' : ''}`}>
                              <option value="pendiente">Pendiente</option>
                              <option value="en_curso">En curso</option>
                              <option value="realizada">Realizada</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right"><button onClick={() => handleDeleteTarea(t.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4"/></button></td>
                        </tr>
                      )
                    })}
                    {tareas.length === 0 && <tr><td colSpan="4" className="px-4 py-4 text-center text-sm text-gray-500">No hay tareas creadas</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
          {activeTab !== 'tareas' && (
            <button type="button" onClick={handleSubmit} className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : proyecto?.id ? 'Actualizar Proyecto' : 'Crear Proyecto'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProyectoFormModal;
