import React, { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Truck, Trash2, Wrench } from 'lucide-react';
import api from '../../services/api';

const ProyectoDetalleModal = ({ isOpen, onClose, proyecto }) => {
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadMateriales = async () => {
    if (!proyecto?.id) return;
    setLoading(true);
    try {
      const response = await api.get(`/proyectos/${proyecto.id}/materiales`);
      setMateriales(response.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !proyecto?.id) return;
    loadMateriales();
  }, [isOpen, proyecto?.id]);

  if (!isOpen || !proyecto) return null;

  const handleStateChange = async (asignacionId, estado) => {
    setBusyId(asignacionId);
    try {
      await api.put(`/asignaciones/${asignacionId}/estado`, { estado });
      await loadMateriales();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.error || 'No se pudo actualizar el estado del material');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{proyecto.nombre}</h3>
            <p className="text-sm text-gray-500">Detalle de materiales asignados</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <p className="text-gray-500">Cargando asignaciones...</p>
        ) : (
          <div className="space-y-3">
            {materiales.length === 0 ? (
              <p className="text-gray-500">No hay materiales asignados aún.</p>
            ) : materiales.map((item) => (
              <div key={item.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.material_nombre}</p>
                    <p className="text-sm text-gray-500">{item.tipo || 'Sin tipo'}{item.marca ? ` · ${item.marca}` : ''}</p>
                    <p className="text-sm text-gray-500">Asignado: {item.cantidad_asignada}{item.serial_number ? ` · Serial: ${item.serial_number}` : ''}</p>
                    <p className="text-sm text-gray-500">Área propietaria: {item.area_nombre || 'Sin área asignada'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Usado: {item.cantidad_utilizada}</p>
                    <p className="text-sm text-gray-500">Pendiente: {item.cantidad_pendiente}</p>
                    <p className="text-sm text-gray-500">Estado físico: {item.stock_estado || item.estado}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Number(item.cantidad_pendiente) > 0 && item.stock_estado !== 'instalado' && (
                    <button onClick={() => handleStateChange(item.id, 'instalado')} disabled={busyId === item.id} className="btn-secondary flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar instalado
                    </button>
                  )}
                  {Number(item.cantidad_pendiente) > 0 && item.stock_estado !== 'en_transito' && (
                    <button onClick={() => handleStateChange(item.id, 'en_transito')} disabled={busyId === item.id} className="btn-secondary flex items-center">
                      <Truck className="w-4 h-4 mr-2" /> Marcar en tránsito
                    </button>
                  )}
                  {Number(item.cantidad_pendiente) > 0 && item.stock_estado !== 'en_mantenimiento' && (
                    <button onClick={() => handleStateChange(item.id, 'en_mantenimiento')} disabled={busyId === item.id} className="btn-secondary flex items-center">
                      <Wrench className="w-4 h-4 mr-2" /> Marcar en mantenimiento
                    </button>
                  )}
                  {Number(item.cantidad_pendiente) > 0 && item.stock_estado !== 'disponible' && (
                    <button onClick={() => handleStateChange(item.id, 'disponible')} disabled={busyId === item.id} className="btn-secondary flex items-center">
                      <RotateCcw className="w-4 h-4 mr-2" /> Devolver a disponible
                    </button>
                  )}
                  {Number(item.cantidad_pendiente) > 0 && item.stock_estado !== 'dado_baja' && (
                    <button onClick={() => {
                      if (window.confirm(`¿Dar de baja ${item.material_nombre}? Esta unidad quedará descontada del inventario.`)) handleStateChange(item.id, 'dado_baja');
                    }} disabled={busyId === item.id} className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                      <Trash2 className="w-4 h-4 mr-2" /> Dar de baja
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProyectoDetalleModal;