import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const initialForm = {
  nombre: '',
  modelo: '',
  descripcion: '',
  tipo_material_id: '1',
  marca_id: '',
  proveedor_id: '',
  area_id: '',
  cantidad_inicial: '0',
  metraje_inicial: '0',
  precio_unitario: '0',
  numero_serie: '',
  requiere_metraje: false,
  metraje: '',
};

const MaterialFormModal = ({ isOpen, onClose, material, onSaved }) => {
  const [form, setForm] = useState(initialForm);
  const isEditing = Boolean(material?.id);
  const [saving, setSaving] = useState(false);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [tiposMaterial, setTiposMaterial] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [showAreaCreate, setShowAreaCreate] = useState(false);
  const [areaForm, setAreaForm] = useState({ codigo: '', nombre: '', tipo: 'zona', sucursal_id: '1' });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    const loadCatalogos = async () => {
      try {
        const [sucursalesRes, areasRes, marcasRes, tiposRes, proveedoresRes] = await Promise.all([
          api.get('/sucursales'),
          api.get('/areas'),
          api.get('/catalogos/marcas'),
          api.get('/catalogos/tipos-material'),
          api.get('/proveedores')
        ]);

        const ubicacionesBase = sucursalesRes.data?.map((s) => ({ id: s.id, nombre: s.nombre, codigo: s.codigo, tipo: 'sucursal' })) || [];
        setUbicaciones(ubicacionesBase);
        setMarcas(marcasRes.data || []);
        setTiposMaterial(tiposRes.data || []);
        setProveedores(proveedoresRes.data || []);
        setAreas(areasRes.data || []);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };

    if (isOpen) {
      loadCatalogos();
    }

    if (material) {
      setForm({
        ...initialForm,
        ...material,
        nombre: material.nombre || material.modelo || '',
        modelo: material.modelo || material.nombre || '',
        tipo_material_id: material.tipo_material_id?.toString() || '1',
        marca_id: material.marca_id?.toString() || '',
        proveedor_id: material.proveedor_id?.toString() || '',
        area_id: material.area_id?.toString() || '',
        cantidad_inicial: material.cantidad_inicial?.toString() || material.stock_total?.toString() || '0',
        metraje: material?.metraje?.toString() ?? material?.metraje_unitario?.toString() ?? '',
        precio_unitario: material.precio_unitario?.toString() || '0',
        numero_serie: material.numero_serie || material.serial_number || '',
        requiere_metraje: Boolean(material.requiere_metraje),
        estado: material.estado || 'activo'
      });
    } else {
      setForm(initialForm);
    }
    setImageFile(null);
  }, [material, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const tipoSeleccionado = tiposMaterial.find((tipo) => Number(tipo.id) === Number(form.tipo_material_id)) || null;
  const requiereSerial = Boolean(tipoSeleccionado?.requiere_serial);
  const requiereMetraje = Boolean(tipoSeleccionado?.requiere_metraje) || Boolean(form.requiere_metraje);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const modelo = (form.modelo || form.nombre || '').trim();
      const nombreCompat = modelo || (form.nombre || '').trim() || 'Sin modelo';
      const cantidadInicial = Number(form.cantidad_inicial || 0);
      const metrajeUnico = requiereMetraje ? parseInt(form.metraje || 0, 10) : 0;
      const isEditing = Boolean(material?.id);

      const basePayload = {
        ...form,
        nombre: nombreCompat,
        modelo,
        tipo_material_id: Number(form.tipo_material_id || material?.tipo_material_id || 1),
        marca_id: form.marca_id ? Number(form.marca_id) : (material?.marca_id ?? null),
        proveedor_id: form.proveedor_id ? Number(form.proveedor_id) : (material?.proveedor_id ?? null),
        area_id: form.area_id ? Number(form.area_id) : (material?.area_id ?? null),
        precio_unitario: Number(form.precio_unitario || material?.precio_unitario || 0),
        numero_serie: requiereSerial ? (form.numero_serie?.trim() || null) : null,
        requiere_serial: requiereSerial,
        requiere_metraje: requiereMetraje,
        stock_minimo: Number(form.stock_minimo || material?.stock_minimo || 0),
        estado: form.estado || material?.estado || 'activo',
        ubicacion_id: form.ubicacion_id ? Number(form.ubicacion_id) : (material?.ubicacion_id ?? 1),
        ...(isEditing ? {} : {
          cantidad_inicial: cantidadInicial,
          metraje: metrajeUnico
        })
      };

      const payload = material?.id
        ? {
            nombre: basePayload.nombre,
            modelo: basePayload.modelo,
            descripcion: basePayload.descripcion,
            tipo_material_id: basePayload.tipo_material_id,
            marca_id: basePayload.marca_id,
            proveedor_id: basePayload.proveedor_id,
            area_id: basePayload.area_id,
            stock_minimo: basePayload.stock_minimo,
            precio_unitario: basePayload.precio_unitario,
            numero_serie: basePayload.numero_serie,
            requiere_serial: basePayload.requiere_serial,
            requiere_metraje: basePayload.requiere_metraje,
            estado: basePayload.estado,
            ubicacion_id: basePayload.ubicacion_id,
            metraje: parseInt(form.metraje || 0, 10),
          }
        : {
            ...basePayload,
            nombre: basePayload.nombre,
            modelo: basePayload.modelo,
            descripcion: basePayload.descripcion,
            tipo_material_id: basePayload.tipo_material_id,
            marca_id: basePayload.marca_id,
            proveedor_id: basePayload.proveedor_id,
            area_id: basePayload.area_id,
            cantidad_inicial: basePayload.cantidad_inicial,
            metraje: basePayload.metraje,
            stock_minimo: basePayload.stock_minimo,
            precio_unitario: basePayload.precio_unitario,
            numero_serie: basePayload.numero_serie,
            estado: basePayload.estado,
            ubicacion_id: basePayload.ubicacion_id
          };

      let materialId = material?.id;
      if (materialId) {
        await api.put(`/materiales/${materialId}`, payload);
      } else {
        const createResponse = await api.post('/materiales', payload);
        materialId = createResponse.data?.id;
      }

      if (imageFile && materialId) {
        const imagePayload = new FormData();
        imagePayload.append('imagen', imageFile);
        await api.post(`/materiales/${materialId}/imagen`, imagePayload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error guardando material:', error);
      alert('No se pudo guardar el material');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Editar producto' : 'Nuevo producto'}
            </h3>
            <p className="text-sm text-gray-500">
              {isEditing
                ? 'Edita los datos del producto. El stock se aumenta cuando agregas más productos o movimientos reales.'
                : 'Crea el producto base y define el stock inicial. Las unidades individuales se gestionan después.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 mb-4 text-sm text-blue-700">
          <strong>Producto:</strong> mantiene la ficha técnica del artículo. Área, ubicación y estado físico se gestionan en la vista de unidades físicas.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
              <input name="modelo" value={form.modelo} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de producto</label>
              <select name="tipo_material_id" value={form.tipo_material_id} onChange={handleChange} className="input-field">
                {tiposMaterial.length === 0 ? <option value="1">Cable DAC</option> : tiposMaterial.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
              <select name="marca_id" value={form.marca_id} onChange={handleChange} className="input-field">
                <option value="">Sin marca</option>
                {marcas.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor preferido</label>
              <select name="proveedor_id" value={form.proveedor_id} onChange={handleChange} className="input-field">
                <option value="">Sin proveedor</option>
                {proveedores.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Área (opcional)</label>
              <select name="area_id" value={form.area_id} onChange={handleChange} className="input-field">
                <option value="">Sin área asignada</option>
                {areas.map((item) => (
                  <option key={item.id} value={item.id}>{item.nombre}</option>
                ))}
              </select>
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad inicial</label>
                <input type="number" name="cantidad_inicial" value={form.cantidad_inicial} onChange={handleChange} className="input-field" min="0" step="1" />
              </div>
            )}
            {isEditing && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-medium text-slate-800">Stock actual</div>
                <div>{Number(material?.stock_total ?? material?.cantidad_inicial ?? 0)} unidades</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio unitario</label>
              <input type="number" name="precio_unitario" value={form.precio_unitario} onChange={handleChange} className="input-field" min="0" step="0.01" />
            </div>
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">Metraje (metros por unidad)</label>
              <input type="number" name="metraje" value={form.metraje} onChange={handleChange} className="input-field" min="0" step="1" />
            </div>

            {requiereSerial && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de serie</label>
                <input type="text" name="numero_serie" value={form.numero_serie} onChange={handleChange} className="input-field" placeholder="Ej: JUN-C13-001" />
              </div>
            )}
            {!requiereSerial && !requiereMetraje && (
              <div className="md:col-span-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
                El stock se gestiona por cantidad total. Si este tipo requiere serie o metraje, se habilita en el catálogo y en la gestión de unidades.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select name="estado" value={form.estado} onChange={handleChange} className="input-field">
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="input-field" rows="3" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del producto</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            {material?.imagen_principal_url && !imageFile && (
              <p className="mt-1 text-xs text-gray-500">Elige otra imagen para reemplazar la actual.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : material?.id ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialFormModal;
