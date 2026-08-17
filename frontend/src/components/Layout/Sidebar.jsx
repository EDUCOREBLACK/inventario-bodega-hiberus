import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  FolderKanban,
  Users,
  Building2,
  Store,
  Users2,
  Tags
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/materiales', icon: Package, label: 'Materiales' },
    { to: '/catalogos', icon: Tags, label: 'Catálogos' },
    { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
    { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/sucursales', icon: Building2, label: 'Sucursales' },
    { to: '/usuarios', icon: Users2, label: 'Usuarios' },
  ];

  return (
    <aside className="sidebar">
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-2xl font-bold text-white">
          Inventario
        </h1>
        <p className="text-blue-300 text-sm">Bodega Hiberus</p>
      </div>
      
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      
    </aside>
  );
};

export default Sidebar;