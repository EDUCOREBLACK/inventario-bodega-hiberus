import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  FolderKanban,
  Settings 
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/materiales', icon: Package, label: 'Materiales' },
    { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
    { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
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
      
      <div className="absolute bottom-0 w-64 p-4 border-t border-blue-800">
        <div className="flex items-center text-gray-300">
          <Settings className="w-5 h-5 mr-3" />
          <span className="text-sm">Configuración</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;