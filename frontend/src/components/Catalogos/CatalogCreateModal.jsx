import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const emptyForms = {
  marca: { nombre: '', descripcion: '' },
  proveedor: { nombre: '', email: '', contacto_nombre: '' },
  tipo: { nombre: '', descripcion: '' },
  area: { nombre: '', codigo: '', descripcion: '' }
};

const labels = {
  marca: {
    title: 'Nueva marca',
    success: 'Marca creada correctamente',
    fields: [
      { key: 'nombre', label: 'Nombre de la marca', type: 'text', placeholder: 'Ej: HPE' },
      { key: 'descripcion', label: 'Descripción', type: 'text', placeholder: 'Opcional' }
    ]
  },
  proveedor: {
    title: 'Nuevo proveedor',
    success: 'Proveedor creado correctamente',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej: HPE Chile' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'contacto@empresa.cl' },
      { key: 'contacto_nombre', label: 'Contacto', type: 'text', placeholder: 'Nombre del contacto' }
    ]
  },
  tipo: {
    title: 'Nuevo tipo de producto',
    success: 'Tipo creado correctamente',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Ej: Cable DAC' },
      { key: 'descripcion', label: 'Descripción', type: 'text', placeholder: 'Opcional' }
    ]
  },
  area: {
    title: 'Nueva área propietaria',
    success: 'Área creada correctamente',
    fields: [
      { key: 'nombre', label: 'Nombre del área', type: 'text', placeholder: 'Ej: Cloud' },
      { key: 'codigo', label: 'Código', type: 'text', placeholder: 'Ej: CLOUD' },
      { key: 'descripcion', label: 'Responsabilidad', type: 'text', placeholder: 'Ej: Departamento dueño de los materiales cloud' }
    ]
  }
};

const CatalogCreateModal = ({ isOpen, type, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyForms[type] || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && type) {
      setForm(emptyForms[type]);
    }
  }, [isOpen, type]);

  if (!isOpen || !type) return null;

  const config = labels[type];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (type === 'marca') {
        await api.post('/catalogos/marcas', form);
      } else if (type === 'proveedor') {
        await api.post('/proveedores', form);
      } else if (type === 'tipo') {
        await api.post('/catalogos/tipos-material', {
          ...form,
          requiere_serial: 0,
          requiere_metraje: 0,
          requiere_vencimiento: 0,
          unidad_medida_default: 'unidad'
        });
      } else if (type === 'area') {
        await api.post('/areas', { ...form, tipo: 'zona', sucursal_id: 1 });
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error(`Error creando ${type}:`, error);
      alert(`No se pudo crear ${config.title.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-500">Se crea desde un formulario independiente para no mezclarlo con el producto.</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
              <input
                type={field.type}
                name={field.key}
                value={form[field.key] || ''}
                onChange={handleChange}
                className="input-field"
                placeholder={field.placeholder}
                required={field.key !== 'descripcion'}
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CatalogCreateModal;
