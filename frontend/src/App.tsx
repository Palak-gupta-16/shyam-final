import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Inventory from './pages/Inventory';
import GatePasses from './pages/GatePasses';
import MillReports from './pages/MillReports';
import StoreIssuances from './pages/StoreIssuances';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Gaurd from './pages/Gaurd';
import Weight from './pages/Weight';
import LoadingTeam from './pages/LoadingTeam';
import UnLoadingTeam from './pages/UnLoadingTeam';
import Accounts from './pages/Accounts';
import NeededItems from './pages/NeededItems';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/orders" element={
              <ProtectedRoute requiredRoles={['General_Manager', 'Director', 'Store_Keeper', 'Purchasing', 'Guard', 'Weighbridge', 'Loading', 'Accounting']}>
                <Orders />
              </ProtectedRoute>
            } />
            
            <Route path="/inventory" element={
              <ProtectedRoute requiredRoles={['General_Manager', 'Director', 'Store_Keeper']}>
                <Inventory />
              </ProtectedRoute>
            } />
            
            <Route path="/needed-items" element={
              <ProtectedRoute requiredRoles={['General_Manager', 'Director', 'Store_Keeper', 'Purchasing']}>
                <NeededItems />
              </ProtectedRoute>
            } />
            
            <Route path="/gate-passes" element={
              <ProtectedRoute requiredRoles={['Guard', 'Director', 'General_Manager']}>
                <GatePasses />
              </ProtectedRoute>
            } />

            <Route path="/gate" element={
              <ProtectedRoute requiredRoles={['Guard', 'Director', 'General_Manager']}>
                <Gaurd />
              </ProtectedRoute>
            } />

            <Route path="/gate" element={
              <ProtectedRoute requiredRoles={['Guard', 'Director', 'General_Manager']}>
                <Gaurd />
              </ProtectedRoute>
            } />
            <Route path="/loading" element={
              <ProtectedRoute requiredRoles={['Loading', 'Director', 'General_Manager']}>
                <LoadingTeam />
              </ProtectedRoute>
            } />

            <Route path="/unloading" element={
              <ProtectedRoute requiredRoles={['Unloading', 'Director', 'General_Manager']}>
                <UnLoadingTeam />
              </ProtectedRoute>
            } />

            <Route path="/weight" element={
              <ProtectedRoute requiredRoles={['Weighbridge', 'Director', 'General_Manager']}>
                <Weight />
              </ProtectedRoute>
            } />

            <Route path="/accounts" element={
              <ProtectedRoute requiredRoles={['Accounting', 'Director', 'General_Manager']}>
                <Accounts />
              </ProtectedRoute>
            } />
            
            <Route path="/mill" element={
              <ProtectedRoute requiredRoles={['Mill_Supervisor', 'General_Manager', 'Director']}>
                <MillReports />
              </ProtectedRoute>
            } />
            
            <Route path="/store" element={
              <ProtectedRoute requiredRoles={['Store_Keeper', 'General_Manager', 'Director']}>
                <StoreIssuances />
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute requiredRoles={['General_Manager', 'Director']}>
                <Reports />
              </ProtectedRoute>
            } />
            
            <Route path="/users" element={
              <ProtectedRoute requiredRoles={['General_Manager', 'Director']}>
                <Users />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a 
                    href="/dashboard" 
                    className="text-blue-600 hover:text-blue-500 font-medium"
                  >
                    Go back to dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;