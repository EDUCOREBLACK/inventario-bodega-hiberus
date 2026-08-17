import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { FolderKanban, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import ProyectoDetalleModal from './ProyectoDetalleModal';
import ProyectoFormModal from './ProyectoFormModal';

const ProyectosList = () => {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hiberus-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
          <p className="text-gray-600">Gestión de proyectos</p>
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
            <div key={proyecto.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {proyecto.nombre}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {proyecto.codigo}
                  </p>
                </div>
                <span className={`badge ${
                  proyecto.estado === 'activo' ? 'badge-success' : 
                  proyecto.estado === 'completado' ? 'badge-info' : 
                  'badge-warning'
                }`}>
                  {proyecto.estado}
                </span>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Tipo:</span>
                  {proyecto.tipo === 'interno' ? '🔵 Interno' : '🟢 Externo'}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Materiales:</span>
                  {proyecto.total_asignaciones || 0}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium mr-2">Fechas:</span>
                  {proyecto.fecha_inicio} - {proyecto.fecha_fin}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedProyecto(proyecto); setIsDetailOpen(true); }}
                  className="btn-secondary flex items-center"
                >
                  <Eye className="w-4 h-4 mr-2" /> Ver materiales
                </button>
                <button
                  onClick={() => handleEdit(proyecto)}
                  className="btn-secondary flex items-center"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </button>
                <button
                  onClick={() => handleDelete(proyecto)}
                  className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
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