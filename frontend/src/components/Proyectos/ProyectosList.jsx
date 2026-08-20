import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Eye, Pencil, Trash2, Users, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import ProyectoDetalleModal from './ProyectoDetalleModal';
import ProyectoFormModal from './ProyectoFormModal';
import ProyectoBulkAsignarModal from './ProyectoBulkAsignarModal';

const ProyectosList = () => {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);

  const fetchProyectos = async () => {
    try {
      const response = await api.get('/proyectos');
      setProyectos(response.data || []);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleCreate = () => {
    setSelectedProyecto(null);
    setIsFormOpen(true);
  };

  const handleEdit = (proyecto) => {
    setSelectedProyecto(proyecto);
    setIsFormOpen(true);
  };

  const handleDelete = async (proyecto) => {
    if (!window.confirm(`¿Eliminar el proyecto "${proyecto.nombre}"? Esta acción no se puede deshacer.`)) return;

    try {
      await api.delete(`/proyectos/${proyecto.id}`);
      if (selectedProyecto?.id === proyecto.id) {
        setSelectedProyecto(null);
        setIsDetailOpen(false);
      }
      await fetchProyectos();
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'No se pudo eliminar el proyecto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600">Gestión de proyectos y seguimiento de tareas</p>
        </div>
        <button onClick={handleCreate} className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Proyecto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {proyectos.length === 0 ? (
          <div className="col-span-3 card text-center py-12">
            <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay proyectos registrados</p>
          </div>
        ) : (
          proyectos.map((proyecto) => (
            <div key={proyecto.id} className="card hover:shadow-lg transition-shadow border-t-4 border-indigo-500">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {proyecto.nombre}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {proyecto.codigo}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${
                    proyecto.estado === 'activo' ? 'badge-success' : 
                    proyecto.estado === 'completado' ? 'badge-info' : 
                    'badge-warning'
                  }`}>
                    {proyecto.estado}
                  </span>
                  {proyecto.tareas_vencidas > 0 && (
                    <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {proyecto.tareas_vencidas} vencidas
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">Avance ({proyecto.tareas_completadas}/{proyecto.total_tareas} tareas)</span>
                  <span className="font-semibold text-indigo-600">{proyecto.porcentaje_avance}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${proyecto.porcentaje_avance === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} 
                    style={{ width: `${proyecto.porcentaje_avance}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">Fechas:</span>
                  {proyecto.fecha_inicio || '-'}
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-medium mr-2">Mat. Asignados:</span>
                  {proyecto.total_asignaciones || 0}
                </div>
                <div className="flex items-center text-gray-600">
                  <Users className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="font-medium mr-1">Personas:</span>
                  {proyecto.cantidad_personas || 0}
                </div>
                <div className="flex items-center text-gray-600">
                  <Clock className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="font-medium mr-1">Hrs Hmbre:</span>
                  {proyecto.horas_hombre || 0}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
                <div className="text-gray-500">Costo Materiales:</div>
                <div className="font-medium">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(proyecto.costo_materiales || 0)}</div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="text-gray-500">Costo Laboral:</div>
                <div className="font-medium">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(proyecto.costo_laboral || 0)}</div>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <div className="font-semibold text-gray-900">Costo Total:</div>
                <div className="font-bold text-indigo-700">{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(proyecto.costo_total || 0)}</div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleEdit(proyecto)}
                  className="btn-primary flex items-center bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex-1 justify-center"
                >
                  <Pencil className="w-4 h-4 mr-1" /> Editar / Tareas
                </button>
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsBulkAssignOpen(true); }}
                  className="btn-secondary flex items-center justify-center flex-1" title="Asignar materiales"
                >
                  <Plus className="w-4 h-4 mr-1" /> Materiales
                </button>
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsDetailOpen(true); }}
                  className="btn-secondary flex items-center justify-center" title="Ver materiales"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(proyecto)}
                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100" title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isBulkAssignOpen && (
        <ProyectoBulkAsignarModal
          isOpen={isBulkAssignOpen}
          onClose={() => setIsBulkAssignOpen(false)}
          proyecto={selectedProyecto}
          onSaved={fetchProyectos}
        />
      )}

      <ProyectoDetalleModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        proyecto={selectedProyecto}
      />

      <ProyectoFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        proyecto={selectedProyecto}
        onSaved={fetchProyectos}
      />
    </div>
  );
};

export default ProyectosList;