import { authService } from '@/src/services/authService';
import { Climber } from '@/src/types/climber'; // <-- Use Climber type
import React, { createContext, useContext, useEffect, useState } from 'react';

// Remove User interface, use Climber everywhere

interface AuthContextType {
  user: Climber | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null; 
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Climber | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to map any record to Climber type with defaults
  const mapToClimber = (record: any): Climber => ({
    id: record.id,
    name: record.name || '',
    age: typeof record.age === 'number' ? record.age : 0,
    grade: record.grade || 'beginner',
    climbing_styles: Array.isArray(record.climbing_styles) ? record.climbing_styles : [],
    home_gym: record.home_gym || '',
    bio: record.bio || '',
    email: record.email || '',
    avatar: record.avatar || '',
  });

  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser ? mapToClimber(currentUser) : null);
        setToken(authService.getToken?.() || null);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const authData = await authService.login(email, password);
      setUser(mapToClimber(authData.record));
      setToken(authData.token);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password, password);
      await login(email, password);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      const authData = await authService.loginWithGoogle();
      setUser(mapToClimber(authData.record));
      setToken(authData.token); 
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null); 
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        token,
        login,
        register,
        loginWithGoogle,
        logout,
      }}>
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
