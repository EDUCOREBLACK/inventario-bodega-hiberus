import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import MaterialesList from './components/Materiales/MaterialesList';
import MovimientosList from './components/Movimientos/MovimientosList';
import ProyectosList from './components/Proyectos/ProyectosList';
import ClientesList from './components/Clientes/ClientesList';
import ProveedoresList from './components/Proveedores/ProveedoresList';
import SucursalesList from './components/Sucursales/SucursalesList';
import UsuariosPage from './components/Usuarios/UsuariosPage';
import CatalogosPage from './components/Catalogos/CatalogosPage';
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';

function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('usuario') || 'null'));

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout user={user}>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/materiales" element={
        <ProtectedRoute>
          <Layout user={user}>
            <MaterialesList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/movimientos" element={
        <ProtectedRoute>
          <Layout user={user}>
            <MovimientosList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/proyectos" element={
        <ProtectedRoute>
          <Layout user={user}>
            <ProyectosList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute>
          <Layout user={user}>
            <ClientesList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/proveedores" element={
        <ProtectedRoute>
          <Layout user={user}>
            <ProveedoresList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/sucursales" element={
        <ProtectedRoute>
          <Layout user={user}>
            <SucursalesList />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/usuarios" element={
        <ProtectedRoute>
          <Layout user={user}>
            <UsuariosPage />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/catalogos" element={
        <ProtectedRoute>
          <Layout user={user}>
            <CatalogosPage />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
