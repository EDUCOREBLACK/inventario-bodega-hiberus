import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import MaterialesList from './components/Materiales/MaterialesList';
import MovimientosList from './components/Movimientos/MovimientosList';
import ProyectosList from './components/Proyectos/ProyectosList';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/materiales" element={<MaterialesList />} />
        <Route path="/movimientos" element={<MovimientosList />} />
        <Route path="/proyectos" element={<ProyectosList />} />
      </Routes>
    </Layout>
  );
}

export default App;
