import toast from 'react-hot-toast';
import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value));
};

const StockUnitsModal = ({ isOpen, onClose, material, onUnitsChanged }) => {
  const [units, setUnits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleSerial, setSingleSerial] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [editForm, setEditForm] = useState({ serial_number: '', estado: 'disponible', proyecto_id: '', area_id: '', estado_fisico: 'bueno' });

  const loadUnits = async () => {
    if (!material?.id) return;
    setLoading(true);
    try {
      const response = await api.get(`/materiales/${material.id}/stock`);
      const loadedUnits = response.data || [];
      setUnits(loadedUnits);
      return loadedUnits;
    } catch (error) {
      console.error(error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const [projectsResponse, areasResponse] = await Promise.all([api.get('/proyectos'), api.get('/areas')]);
      setProjects(projectsResponse.data || []);
      setAreas(areasResponse.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isOpen && material?.id) {
      loadUnits();
      loadProjects();
    }
  }, [isOpen, material?.id]);

  if (!isOpen || !material) return null;

  const handleAddSingle = async (e) => {
    e.preventDefault();

    const serialList = material?.requiere_serial ? [singleSerial.trim()].filter(Boolean) : [];

    if (material?.requiere_serial && serialList.length === 0) {
      toast.error('Debes ingresar el número de serie de la unidad');
      return;
    }

    setSaving(true);
    try {
      const metrajeBase = Number(material?.metraje ?? material?.metraje_unitario ?? 0);
      await api.put(`/materiales/${material.id}/stock`, {
        operacion: 'agregar',
        cantidad: 1,
        seriales: serialList,
        metraje: metrajeBase,
        ubicacion_id: material.ubicacion_id || 1,
        motivo: 'Ingreso unitario desde el listado'
      });
      setSingleSerial('');
      const updatedUnits = await loadUnits();
      await onUnitsChanged?.(material.id, updatedUnits);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'No se pudo agregar la unidad');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignToProject = async (unit, proyectoId) => {
    if (!proyectoId) {
      toast.error('Selecciona un proyecto antes de asignar');
      return;
    }

    setSaving(true);
    try {
      await api.post('/asignaciones/proyecto', {
        proyecto_id: Number(proyectoId),
        producto_id: Number(material.id),
        stock_id: Number(unit.id),
        cantidad: Number(unit.cantidad || 1),
        seriales: unit.serial_number ? [unit.serial_number] : undefined,
        observaciones: 'Asignación desde la edición de una unidad'
      });
      toast.success('Unidad asignada al proyecto correctamente');
      cancelEdit();
      await loadUnits();
      await onUnitsChanged?.();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'No se pudo asignar la unidad al proyecto');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (unit) => {
    setEditingUnitId(unit.id);
    setEditForm({
      serial_number: unit.serial_number || '',
      estado: unit.estado || 'disponible',
      proyecto_id: '',
      area_id: unit.area_id ? String(unit.area_id) : '',
      estado_fisico: unit.estado_fisico || 'bueno'
    });
  };

  const cancelEdit = () => {
    setEditingUnitId(null);
    setEditForm({ serial_number: '', estado: 'disponible', proyecto_id: '', area_id: '', estado_fisico: 'bueno' });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingUnitId) return;
    setSaving(true);
    try {
      await api.put(`/materiales/${material.id}/stock/${editingUnitId}`, {
        serial_number: editForm.serial_number,
        estado: editForm.estado,
        estado_fisico: editForm.estado_fisico,
        ubicacion_id: material.ubicacion_id || 1,
        area_id: editForm.area_id ? Number(editForm.area_id) : null
      });
      cancelEdit();
      const updatedUnits = await loadUnits();
      await onUnitsChanged?.(material.id, updatedUnits);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo actualizar la unidad');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (unit) => {
    const cantidad = Number(unit.cantidad || 1);
    const confirmMessage = unit.serial_number || cantidad <= 1
      ? `¿Seguro que quieres eliminar esta unidad de ${material.nombre}?`
      : `Esta fila tiene ${cantidad} unidades. ¿Quieres quitar exactamente ${cantidad} unidades y dejarla en 0?`;

    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    try {
      await api.delete(`/materiales/${material.id}/stock/${unit.id}`, {
        data: {
          cantidad,
          motivo: 'Eliminación por ingreso extra'
        }
      });
      const updatedUnits = await loadUnits();
      await onUnitsChanged?.(material.id, updatedUnits);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'No se pudo eliminar la unidad');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Productos individuales de {material.nombre}</h3>
            <p className="text-sm text-gray-500">Cada unidad toma la información del producto base. Si agregas más seriales, se registran como unidades independientes.</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="mb-5 space-y-4">
          <form onSubmit={handleAddSingle} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">Agregar 1 unidad</label>
              <span className="text-xs text-gray-500">Se heredan marca, precio, metraje y datos del producto</span>
            </div>

            {material.requiere_serial && (
              <input
                className="input-field"
                value={singleSerial}
                onChange={(e) => setSingleSerial(e.target.value)}
                placeholder="Ej: DAC-001"
              />
            )}

            {material.requiere_metraje && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                Metraje por unidad: {Number(material?.metraje ?? material?.metraje_unitario ?? 0)} m
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Agregar 1 unidad'}
            </button>
          </form>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Productos actuales</h4>
          {loading ? <p className="text-gray-500">Cargando unidades...</p> : (
            <div className="space-y-2">
              {units.length === 0 ? <p className="text-gray-500">No hay productos individuales registrados</p> : units.map((unit) => (
                <div key={unit.id} className="border rounded-lg p-3 bg-gray-50">
                  {editingUnitId === unit.id ? (
                    <form onSubmit={handleEditSave} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Serial</label>
                          <input className="input-field" value={editForm.serial_number} onChange={(e) => setEditForm({ ...editForm, serial_number: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                          <select className="input-field" value={editForm.estado} onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}>
                            {!['disponible', 'en_mantenimiento', 'dado_baja'].includes(editForm.estado) && <option value={editForm.estado}>{editForm.estado}</option>}
                            <option value="disponible">Disponible</option>
                            <option value="en_mantenimiento">En mantenimiento</option>
                            <option value="dado_baja">Dado de baja</option>
                          </select>
                        </div>
                        {editForm.estado === 'disponible' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado Físico de Retorno</label>
                            <select className="input-field" value={editForm.estado_fisico} onChange={(e) => setEditForm({ ...editForm, estado_fisico: e.target.value })}>
                              <option value="nuevo">Nuevo</option>
                              <option value="bueno">Usado - Buen Estado</option>
                              <option value="regular">Usado - Estado Regular</option>
                              <option value="malo">Malo / Dañado</option>
                            </select>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Área propietaria</label>
                          <select className="input-field" value={editForm.area_id} onChange={(e) => setEditForm({ ...editForm, area_id: e.target.value })}>
                            <option value="">Sin área asignada</option>
                            {areas.map((area) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
                          </select>
                        </div>
                        {editForm.estado === 'disponible' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a proyecto</label>
                            <select className="input-field" value={editForm.proyecto_id} onChange={(e) => setEditForm({ ...editForm, proyecto_id: e.target.value })}>
                              <option value="">Sin asignar</option>
                              {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secondary" onClick={cancelEdit}>Cancelar</button>
                        {editForm.estado === 'disponible' && editForm.proyecto_id && (
                          <button type="button" className="btn-secondary" onClick={() => handleAssignToProject(unit, editForm.proyecto_id)} disabled={saving}>
                            Asignar proyecto
                          </button>
                        )}
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{unit.serial_number || `Producto ${unit.id}`}</p>
                        <p className="text-sm text-gray-500">Cantidad: {unit.cantidad || 1} · Metraje: {unit.metraje || 0} m · Precio: {formatCurrency(material?.precio_unitario)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{unit.estado}</span>
                        <button type="button" className="text-sm text-blue-600 font-medium" onClick={() => startEdit(unit)}>Editar</button>
                        {(!unit.serial_number && unit.estado === 'disponible') ? (
                          <button type="button" className="text-sm text-red-600 font-medium" onClick={() => handleDeleteUnit(unit)}>Eliminar</button>
                        ) : (
                          <span className="text-sm text-gray-400 cursor-not-allowed" title="No se puede eliminar un ítem con serial o asignado">Eliminar</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockUnitsModal;
