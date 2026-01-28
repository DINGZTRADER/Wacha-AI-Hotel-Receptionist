import React from 'react';
import { NavLink } from 'react-router-dom';
import { useHotel } from '../context/HotelContext';
import { LayoutDashboard, Calendar, Users, Mic, Settings, LogOut, Contact, UserCircle, ShieldCheck } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { logout, user, license } = useHotel();
  
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  const planColors = {
      starter: 'bg-gray-100 text-gray-600 border-gray-200',
      pro: 'bg-blue-50 text-blue-700 border-blue-200',
      enterprise: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold text-blue-900">Wacha AI Host</h1>
        <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${planColors[license.plan]}`}>
            <ShieldCheck size={12} className="mr-1" />
            <span className="uppercase">{license.plan} License</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/" className={navClass}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/calendar" className={navClass}>
          <Calendar size={20} />
          <span>Calendar</span>
        </NavLink>
        <NavLink to="/bookings" className={navClass}>
          <Users size={20} />
          <span>Reservations</span>
        </NavLink>
        <NavLink to="/clients" className={navClass}>
          <Contact size={20} />
          <span>Clients</span>
        </NavLink>
        <NavLink to="/receptionist" className={navClass}>
          <Mic size={20} />
          <span className="flex-1">AI Receptionist</span>
          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Live</span>
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center space-x-3 mb-4 px-4">
             <div className="bg-gray-100 p-2 rounded-full">
                 <UserCircle size={24} className="text-gray-500" />
             </div>
             <div className="overflow-hidden">
                 <p className="text-sm font-bold text-gray-800 truncate">{user?.name || 'Admin'}</p>
                 <p className="text-xs text-gray-500 truncate capitalize">{user?.role} Access</p>
             </div>
        </div>
        <button 
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 w-full rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;