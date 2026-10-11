import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AuthUser, setAuthToken, getAuthToken } from '../services/api.js';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'forgot' | 'reset';
  openAuthModal: (mode?: 'login' | 'signup' | 'forgot' | 'reset') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(getAuthToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.auth.me();
      setUser(res.user);
      setError(null);
    } catch (err: any) {
      console.warn('[AuthContext] Session verification failed:', err.message);
      // If token expired or invalid, clear it
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Check for password reset token in URL parameters
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get('reset_token') || params.get('token');
      if (resetToken && window.location.search.includes('reset')) {
        setAuthModalMode('reset');
        setIsAuthModalOpen(true);
      }
    }
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.auth.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    setError(null);
    try {
      const res = await api.auth.signup({ email, password, name });
      setUser(res.user);
      setToken(res.token);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setToken(null);
      setAuthToken(null);
    }
  };

  const openAuthModal = (mode: 'login' | 'signup' | 'forgot' | 'reset' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
    setError(null);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        refreshUser,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
