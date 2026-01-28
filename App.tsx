import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Bookings from './pages/Bookings';
import Clients from './pages/Clients';
import LiveReceptionist from './pages/LiveReceptionist';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { HotelProvider, useHotel } from './context/HotelContext';

const ProtectedLayout: React.FC = () => {
    const { user } = useHotel();
    
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex min-h-screen bg-gray-50 text-gray-900">
          <Sidebar />
          <main className="flex-1 ml-64 p-8 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/receptionist" element={<LiveReceptionist />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
    );
};

const AppRoutes: React.FC = () => {
    const { user } = useHotel();
    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <HotelProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </HotelProvider>
  );
};

export default App;