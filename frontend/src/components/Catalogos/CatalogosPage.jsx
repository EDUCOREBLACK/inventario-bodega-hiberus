import React from 'react';
import CatalogosPanel from './CatalogosPanel';

const CatalogosPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
        <p className="text-gray-600">Marcas, proveedores, tipos y áreas propietarias de los materiales</p>
      </div>
      <CatalogosPanel />
    </div>
  );
};

export default CatalogosPage;
