import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  quickLoginAs: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('medora_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const profile = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.warn('Failed to refresh profile, clearing session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('medora_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('medora_token');
    setToken(null);
    setUser(null);
  };

  const quickLoginAs = async (targetRole: UserRole) => {
    setIsLoading(true);
    let credentials = { email: '', password: '' };
    if (targetRole === 'admin') {
      credentials = { email: 'admin@medora.health', password: 'Admin@12345' };
    } else if (targetRole === 'doctor') {
      credentials = { email: 'doctor.sarah@medora.health', password: 'Doctor@12345' };
    } else {
      credentials = { email: 'patient.john@medora.health', password: 'Patient@12345' };
    }

    try {
      const res = await api.login(credentials);
      login(res.access_token, {
        id: res.user_id,
        email: res.email,
        full_name: res.full_name,
        role: res.role as UserRole,
        is_active: true,
        created_at: new Date().toISOString()
      });
      // Refresh detailed profile
      await refreshProfile();
    } catch (err) {
      console.error('Quick login failed:', err);
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        quickLoginAs,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
