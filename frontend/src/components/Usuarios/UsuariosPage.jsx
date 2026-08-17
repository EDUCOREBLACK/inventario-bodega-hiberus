import React from 'react';
import UsuariosList from './UsuariosList';

const UsuariosPage = () => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-600">Gestión independiente de usuarios del sistema</p>
      </div>
      <UsuariosList />
    </div>
  );
};

export default UsuariosPage;
