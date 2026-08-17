import React from 'react';

const MaterialFilters = ({ searchTerm, setSearchTerm, onClear }) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Buscar por nombre, tipo o marca..."
          className="input-field pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <button onClick={onClear} className="btn-secondary">Limpiar</button>
    </div>
  );
};

export default MaterialFilters;
