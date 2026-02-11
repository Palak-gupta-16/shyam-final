import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  Package,
  Shield,
  Factory,
  Store,
  BarChart3,
  Users,
  Settings,
  X,
  FileText,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: FileText,
    roles: ['General_Manager', 'Director'],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    roles: ['General_Manager', 'Director', 'Store_Keeper'],
  },
  {
    name: 'Needed Items',
    href: '/needed-items',
    icon: AlertTriangle,
    roles: ['General_Manager', 'Director', 'Store_Keeper', 'Mill_Supervisor'],
  },
  {
    name: 'Gate Passes',
    href: '/gate-passes',
    icon: Shield,
    roles: ['Guard', 'Director', 'General_Manager'],
  },
  {
    name: 'Gate Management',
    href: '/gate',
    icon: Shield,
    roles: ['Guard', 'Director', 'General_Manager'],
  },
  {
    name: 'Weighbridge',
    href: '/weight',
    icon: Shield,
    roles: ['Weighbridge', 'Director', 'General_Manager'],
  },
  {
    name: 'Loading Team',
    href: '/loading',
    icon: Shield,
    roles: ['Loading', 'Director', 'General_Manager'],
  },
  {
    name: 'UnLoading Team',
    href: '/unloading',
    icon: Shield,
    roles: ['Unloading', 'Director', 'General_Manager'],
  },
  {
    name: 'Accounting',
    href: '/accounts',
    icon: Shield,
    roles: ['Accounting', 'Director', 'General_Manager'],
  },
  {
    name: 'Mill Operations',
    href: '/mill',
    icon: Factory,
    roles: ['Mill_Supervisor', 'General_Manager', 'Director'],
  },
  // {
  //   name: 'Store Management',
  //   href: '/store',
  //   icon: Store,
  //   roles: ['Store_Keeper', 'General_Manager', 'Director'],
  // },
  // {
  //   name: 'Reports',
  //   href: '/reports',
  //   icon: BarChart3,
  //   roles: ['General_Manager', 'Director'],
  // },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: ['General_Manager', 'Director'],
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['General_Manager', 'Director'],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole } = useAuth();
  const location = useLocation();

  const filteredItems = navigationItems.filter(item => 
    !item.roles || hasRole(item.roles)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="ml-2 text-xl font-bold text-gray-900">SHYAM</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {filteredItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    className={`
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onClose();
                      }
                    }}
                  >
                    <item.icon className={`
                      h-5 w-5 mr-3
                      ${isActive ? 'text-primary-600' : 'text-gray-400'}
                    `} />
                    {item.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        {/* <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                Factory Operations
              </p>
              <p className="text-xs text-gray-500">
                Management System
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
};

export default Sidebar;
