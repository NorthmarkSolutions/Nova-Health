import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleType } from '../types';

interface AuthContextType {
  user: User | null;
  role: RoleType;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchRolePreview: (newRole: RoleType) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : {
      id: 'demo-user-123',
      username: 'harsh.admin',
      email: 'admin@northhospital.com',
      firstName: 'Harsh',
      lastName: 'Director',
      role: RoleType.HOSPITAL_ADMIN,
    };
  });

  const [activeRole, setActiveRole] = useState<RoleType>(() => {
    return user?.role || RoleType.HOSPITAL_ADMIN;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (token: string, newUser: User) => {
    localStorage.setItem('token', token);
    setUser(newUser);
    setActiveRole(newUser.role);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const switchRolePreview = (newRole: RoleType) => {
    setActiveRole(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: activeRole,
        login,
        logout,
        switchRolePreview,
        isAuthenticated: !!user,
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
