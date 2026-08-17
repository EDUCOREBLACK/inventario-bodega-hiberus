import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Store, Trash2 } from 'lucide-react';
import api from '../../services/api';
import CatalogCreateModal from './CatalogCreateModal';

const initialMarcaForm = { nombre: '', descripcion: '' };
const initialProveedorForm = {
  nombre: '',
  rut: '',
  telefono: '',
  email: '',
  direccion: '',
  contacto_nombre: '',
  contacto_telefono: '',
  contacto_email: '',
  condiciones_pago: '',
  plazo_entrega: ''
};
const initialTipoForm = {
  nombre: '',
  descripcion: '',
  requiere_serial: false,
  requiere_metraje: false,
  requiere_vencimiento: false,
  unidad_medida_default: 'unidad'
};
const initialAreaForm = { nombre: '', codigo: '', descripcion: '' };

const CatalogosPanel = () => {
  const [marcas, setMarcas] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [editingMarcaId, setEditingMarcaId] = useState(null);
  const [editingProveedorId, setEditingProveedorId] = useState(null);
  const [editingTipoId, setEditingTipoId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [marcaForm, setMarcaForm] = useState(initialMarcaForm);
  const [proveedorForm, setProveedorForm] = useState(initialProveedorForm);
  const [tipoForm, setTipoForm] = useState(initialTipoForm);
  const [areaForm, setAreaForm] = useState(initialAreaForm);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState(null);

  const loadCatalogos = async () => {
    try {
      const [marcasRes, proveedoresRes, tiposRes, areasRes] = await Promise.all([
        api.get('/catalogos/marcas'),
        api.get('/proveedores'),
        api.get('/catalogos/tipos-material'),
        api.get('/areas')
      ]);
      setMarcas(marcasRes.data || []);
      setProveedores(proveedoresRes.data || []);
      setTipos(tiposRes.data || []);
      setAreas(areasRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadCatalogos();
  }, []);

  const openCreateModal = (type) => {
    setCreateType(type);
    setIsCreateModalOpen(true);
  };

  const handleMarcaEdit = (marca) => {
    setEditingMarcaId(marca.id);
    setMarcaForm({ nombre: marca.nombre || '', descripcion: marca.descripcion || '' });
  };

  const handleMarcaDelete = async (marca) => {
    if (!window.confirm(`¿Eliminar la marca "${marca.nombre}"?`)) return;
    try {
      await api.delete(`/catalogos/marcas/${marca.id}`);
      if (editingMarcaId === marca.id) {
        setEditingMarcaId(null);
        setMarcaForm(initialMarcaForm);
      }
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar la marca');
    }
  };

  const handleMarcaSave = async () => {
    if (!marcaForm.nombre.trim()) {
      alert('El nombre de la marca es obligatorio');
      return;
    }
    try {
      await api.put(`/catalogos/marcas/${editingMarcaId}`, {
        ...marcaForm,
        nombre: marcaForm.nombre.trim(),
        descripcion: marcaForm.descripcion.trim()
      });
      setEditingMarcaId(null);
      setMarcaForm(initialMarcaForm);
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar la marca');
    }
  };

  const handleProveedorEdit = (proveedor) => {
    setEditingProveedorId(proveedor.id);
    setProveedorForm({
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

  const handleProveedorDelete = async (proveedor) => {
    if (!window.confirm(`¿Eliminar el proveedor "${proveedor.nombre}"?`)) return;
    try {
      await api.delete(`/proveedores/${proveedor.id}`);
      if (editingProveedorId === proveedor.id) {
        setEditingProveedorId(null);
        setProveedorForm(initialProveedorForm);
      }
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el proveedor');
    }
  };

  const handleProveedorSave = async () => {
    if (!proveedorForm.nombre.trim()) {
      alert('El nombre del proveedor es obligatorio');
      return;
    }
    try {
      await api.put(`/proveedores/${editingProveedorId}`, {
        ...proveedorForm,
        nombre: proveedorForm.nombre.trim(),
        rut: proveedorForm.rut?.trim() || '',
        telefono: proveedorForm.telefono?.trim() || '',
        email: proveedorForm.email?.trim() || '',
        direccion: proveedorForm.direccion?.trim() || '',
        contacto_nombre: proveedorForm.contacto_nombre?.trim() || '',
        contacto_telefono: proveedorForm.contacto_telefono?.trim() || '',
        contacto_email: proveedorForm.contacto_email?.trim() || '',
        condiciones_pago: proveedorForm.condiciones_pago?.trim() || '',
        plazo_entrega: proveedorForm.plazo_entrega?.trim() || ''
      });
      setEditingProveedorId(null);
      setProveedorForm(initialProveedorForm);
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el proveedor');
    }
  };

  const handleTipoEdit = (tipo) => {
    setEditingTipoId(tipo.id);
    setTipoForm({
      nombre: tipo.nombre || '',
      descripcion: tipo.descripcion || '',
      requiere_serial: Boolean(tipo.requiere_serial),
      requiere_metraje: Boolean(tipo.requiere_metraje),
      requiere_vencimiento: Boolean(tipo.requiere_vencimiento),
      unidad_medida_default: tipo.unidad_medida_default || 'unidad'
    });
  };

  const handleTipoDelete = async (tipo) => {
    if (!window.confirm(`¿Eliminar el tipo "${tipo.nombre}"?`)) return;
    try {
      await api.delete(`/catalogos/tipos-material/${tipo.id}`);
      if (editingTipoId === tipo.id) {
        setEditingTipoId(null);
        setTipoForm(initialTipoForm);
      }
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo eliminar el tipo de material');
    }
  };

  const handleTipoSave = async () => {
    if (!tipoForm.nombre.trim()) {
      alert('El nombre del tipo es obligatorio');
      return;
    }

    try {
      await api.put(`/catalogos/tipos-material/${editingTipoId}`, {
        ...tipoForm,
        nombre: tipoForm.nombre.trim(),
        descripcion: tipoForm.descripcion.trim(),
        requiere_serial: tipoForm.requiere_serial ? 1 : 0,
        requiere_metraje: tipoForm.requiere_metraje ? 1 : 0,
        requiere_vencimiento: tipoForm.requiere_vencimiento ? 1 : 0,
        unidad_medida_default: tipoForm.unidad_medida_default || 'unidad'
      });
      setEditingTipoId(null);
      setTipoForm(initialTipoForm);
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el tipo de material');
    }
  };

  const handleAreaEdit = (area) => {
    setEditingAreaId(area.id);
    setAreaForm({ nombre: area.nombre || '', codigo: area.codigo || '', descripcion: area.descripcion || '' });
  };

  const handleAreaSave = async () => {
    if (!areaForm.nombre.trim()) {
      alert('El nombre del área es obligatorio');
      return;
    }
    try {
      await api.put(`/areas/${editingAreaId}`, {
        nombre: areaForm.nombre.trim(),
        codigo: areaForm.codigo.trim() || undefined,
        descripcion: areaForm.descripcion.trim()
      });
      setEditingAreaId(null);
      setAreaForm(initialAreaForm);
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar el área');
    }
  };

  const handleAreaDelete = async (area) => {
    if (!window.confirm(`¿Eliminar el área propietaria "${area.nombre}"?`)) return;
    try {
      await api.delete(`/areas/${area.id}`);
      await loadCatalogos();
    } catch (error) {
      console.error(error);
      alert('No se puede eliminar el área porque tiene unidades asociadas');
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-6">
        <div className="card border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Marcas <span className="text-sm font-normal text-gray-500">({marcas.length})</span></h3>
            <button type="button" onClick={() => openCreateModal('marca')} className="btn-secondary text-xs">Nuevo</button>
          </div>
          <div className="space-y-2">
            {marcas.length === 0 ? (
              <p className="text-sm text-gray-500">No hay marcas registradas</p>
            ) : (
              marcas.map((m) => (
                <div key={m.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  {editingMarcaId === m.id ? (
                    <div className="space-y-2">
                      <input
                        className="input-field"
                        value={marcaForm.nombre}
                        onChange={(e) => setMarcaForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre"
                      />
                      <input
                        className="input-field"
                        value={marcaForm.descripcion}
                        onChange={(e) => setMarcaForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={handleMarcaSave} className="btn-primary text-sm">Guardar</button>
                        <button type="button" onClick={() => { setEditingMarcaId(null); setMarcaForm(initialMarcaForm); }} className="btn-secondary text-sm">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{m.nombre}</p>
                        <p className="text-sm text-gray-500">{m.descripcion || 'Sin descripción'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleMarcaEdit(m)} className="text-hiberus-blue hover:text-hiberus-light" title="Editar marca">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleMarcaDelete(m)} className="text-red-500 hover:text-red-700" title="Eliminar marca">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Áreas propietarias <span className="text-sm font-normal text-gray-500">({areas.length})</span></h3>
              <p className="text-xs text-gray-500">Departamento dueño del material</p>
            </div>
            <button type="button" onClick={() => openCreateModal('area')} className="btn-secondary text-xs">Nuevo</button>
          </div>
          <div className="space-y-2">
            {areas.length === 0 ? (
              <p className="text-sm text-gray-500">No hay áreas registradas</p>
            ) : areas.map((area) => (
              <div key={area.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                {editingAreaId === area.id ? (
                  <div className="space-y-2">
                    <input className="input-field" value={areaForm.nombre} onChange={(e) => setAreaForm((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre" />
                    <input className="input-field" value={areaForm.codigo} onChange={(e) => setAreaForm((prev) => ({ ...prev, codigo: e.target.value }))} placeholder="Código" />
                    <input className="input-field" value={areaForm.descripcion} onChange={(e) => setAreaForm((prev) => ({ ...prev, descripcion: e.target.value }))} placeholder="Responsabilidad" />
                    <div className="flex gap-2">
                      <button type="button" onClick={handleAreaSave} className="btn-primary text-sm">Guardar</button>
                      <button type="button" onClick={() => { setEditingAreaId(null); setAreaForm(initialAreaForm); }} className="btn-secondary text-sm">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{area.nombre}</p>
                      <p className="text-xs text-gray-500">{area.codigo}</p>
                      <p className="text-sm text-gray-500">{area.descripcion || 'Sin descripción de responsabilidad'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleAreaEdit(area)} className="text-hiberus-blue hover:text-hiberus-light" title="Editar área"><Pencil className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleAreaDelete(area)} className="text-red-500 hover:text-red-700" title="Eliminar área"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Proveedores <span className="text-sm font-normal text-gray-500">({proveedores.length})</span></h3>
            <button type="button" onClick={() => openCreateModal('proveedor')} className="btn-secondary text-xs">Nuevo</button>
          </div>
          <div className="space-y-2">
            {proveedores.length === 0 ? (
              <p className="text-sm text-gray-500">No hay proveedores registrados</p>
            ) : (
              proveedores.map((p) => (
                <div key={p.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  {editingProveedorId === p.id ? (
                    <div className="space-y-2">
                      <input className="input-field" value={proveedorForm.nombre} onChange={(e) => setProveedorForm((prev) => ({ ...prev, nombre: e.target.value }))} placeholder="Nombre" />
                      <input className="input-field" value={proveedorForm.email} onChange={(e) => setProveedorForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
                      <input className="input-field" value={proveedorForm.telefono} onChange={(e) => setProveedorForm((prev) => ({ ...prev, telefono: e.target.value }))} placeholder="Teléfono" />
                      <input className="input-field" value={proveedorForm.contacto_nombre} onChange={(e) => setProveedorForm((prev) => ({ ...prev, contacto_nombre: e.target.value }))} placeholder="Contacto" />
                      <input className="input-field" value={proveedorForm.direccion} onChange={(e) => setProveedorForm((prev) => ({ ...prev, direccion: e.target.value }))} placeholder="Dirección" />
                      <div className="flex gap-2">
                        <button type="button" onClick={handleProveedorSave} className="btn-primary text-sm">Guardar</button>
                        <button type="button" onClick={() => { setEditingProveedorId(null); setProveedorForm(initialProveedorForm); }} className="btn-secondary text-sm">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{p.nombre}</p>
                        <p className="text-sm text-gray-500">{p.email || p.telefono || 'Sin contacto principal'}</p>
                        <p className="text-xs text-gray-400">{p.contacto_nombre || 'Sin contacto'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleProveedorEdit(p)} className="text-hiberus-blue hover:text-hiberus-light" title="Editar proveedor">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleProveedorDelete(p)} className="text-red-500 hover:text-red-700" title="Eliminar proveedor">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tipos de material <span className="text-sm font-normal text-gray-500">({tipos.length})</span></h3>
            <button type="button" onClick={() => openCreateModal('tipo')} className="btn-secondary text-xs">Nuevo</button>
          </div>
          <div className="space-y-2">
            {tipos.length === 0 ? (
              <p className="text-sm text-gray-500">No hay tipos de material registrados</p>
            ) : (
              tipos.map((t) => (
                <div key={t.id} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  {editingTipoId === t.id ? (
                    <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
                      <input
                        className="input-field"
                        value={tipoForm.nombre}
                        onChange={(e) => setTipoForm((prev) => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Nombre"
                      />
                      <input
                        className="input-field"
                        value={tipoForm.descripcion}
                        onChange={(e) => setTipoForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                        placeholder="Descripción"
                      />
                      <div className="flex gap-3 text-sm text-gray-700 flex-wrap">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={tipoForm.requiere_serial} onChange={(e) => setTipoForm((prev) => ({ ...prev, requiere_serial: e.target.checked }))} /> Serial</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={tipoForm.requiere_metraje} onChange={(e) => setTipoForm((prev) => ({ ...prev, requiere_metraje: e.target.checked }))} /> Metraje</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={tipoForm.requiere_vencimiento} onChange={(e) => setTipoForm((prev) => ({ ...prev, requiere_vencimiento: e.target.checked }))} /> Vencimiento</label>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={handleTipoSave} className="btn-primary text-sm">Guardar</button>
                        <button type="button" onClick={() => { setEditingTipoId(null); setTipoForm(initialTipoForm); }} className="btn-secondary text-sm">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{t.nombre}</p>
                        <p className="text-sm text-gray-500">{t.descripcion || 'Sin descripción'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleTipoEdit(t)} className="text-hiberus-blue hover:text-hiberus-light" title="Editar tipo">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleTipoDelete(t)} className="text-red-500 hover:text-red-700" title="Eliminar tipo">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CatalogCreateModal
        isOpen={isCreateModalOpen}
        type={createType}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={async () => {
          setIsCreateModalOpen(false);
          await loadCatalogos();
        }}
      />
    </div>
  );
};

export default CatalogosPanel;