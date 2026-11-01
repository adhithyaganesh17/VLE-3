import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { PatientDashboard } from './pages/PatientDashboard';
import { DoctorDashboard } from './pages/DoctorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { DevOpsControlCentre } from './pages/DevOpsControlCentre';
import { SecurityDashboard } from './pages/SecurityDashboard';

const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('devops');

  // Set initial view based on user role when authenticated
  useEffect(() => {
    if (user?.role) {
      setCurrentView(user.role);
    }
  }, [user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs font-mono text-slate-400">Loading MEDORA Healthcare Platform...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-slate-100 flex flex-col">
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex flex-1">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {currentView === 'patient' && <PatientDashboard />}
          {currentView === 'doctor' && <DoctorDashboard />}
          {currentView === 'admin' && <AdminDashboard />}
          {currentView === 'devops' && <DevOpsControlCentre />}
          {currentView === 'security' && <SecurityDashboard />}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
