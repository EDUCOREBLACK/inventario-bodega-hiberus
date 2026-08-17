import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, FolderKanban, ArrowLeftRight } from 'lucide-react';
import api from '../../services/api';
import ReportesPanel from './ReportesPanel';
import AlertasPanel from './AlertasPanel';
import ReportesAvanzados from './ReportesAvanzados';

const Dashboard = () => {
  const [resumen, setResumen] = useState({
    totalProductos: 0,
    totalStock: 0,
    totalProyectos: 0,
    totalMovimientos: 0,
    valorTotal: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/dashboard/resumen');
        setResumen(response.data);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    {
      title: 'Total Materiales',
      value: resumen.totalProductos || 0,
      icon: Package,
      color: 'bg-hiberus-blue',
      textColor: 'text-hiberus-blue'
    },
    {
      title: 'Stock Total',
      value: resumen.totalStock || 0,
      icon: TrendingUp,
      color: 'bg-hiberus-success',
      textColor: 'text-hiberus-success'
    },
    {
      title: 'Proyectos Activos',
      value: resumen.totalProyectos || 0,
      icon: FolderKanban,
      color: 'bg-hiberus-light',
      textColor: 'text-hiberus-light'
    },
    {
      title: 'Movimientos',
      value: resumen.totalMovimientos || 0,
      icon: ArrowLeftRight,
      color: 'bg-hiberus-warning',
      textColor: 'text-hiberus-warning'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hiberus-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general del inventario</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Valor Total del Inventario
        </h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-4xl font-bold text-hiberus-blue">
            ${resumen.valorTotal?.toLocaleString() || 0}
          </p>
          <span className="ml-2 text-sm text-gray-500">USD</span>
        </div>
      </div>

      <ReportesPanel />
      <AlertasPanel />
      <ReportesAvanzados />
    </div>
  );
};

export default Dashboard;