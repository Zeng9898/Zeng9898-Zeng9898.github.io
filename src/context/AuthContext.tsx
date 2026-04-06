import { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE, AUTH_STORAGE_KEY, buildAuthHeaders, getStoredAuth } from '../lib/api';

export type StudentGroup = 'experiment' | 'control';

export type StudentProfile = {
  id: number;
  studentNumber: string;
  name: string | null;
  groupType: StudentGroup;
  stats: {
    completedArgumentCount: number;
    completedReflectionCount: number;
    streakDays: number;
  };
};

type AuthContextValue = {
  token: string | null;
  student: StudentProfile | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  login: (studentNumber: string, password: string) => Promise<void>;
  refreshStudent: (tokenOverride?: string | null) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: React.ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistToken = (nextToken: string | null) => {
    if (typeof window === 'undefined') return;

    if (!nextToken) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: nextToken }));
  };

  const logout = () => {
    setToken(null);
    setStudent(null);
    persistToken(null);
  };

  const refreshStudent = async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride ?? token;
    if (!activeToken) {
      setStudent(null);
      return;
    }

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(activeToken),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      logout();
      throw new Error(typeof data.error === 'string' ? data.error : '登入已失效');
    }

    setStudent(data.student as StudentProfile);
  };

  const login = async (studentNumber: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentNumber, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error || typeof data.token !== 'string') {
      throw new Error(typeof data.error === 'string' ? data.error : '登入失敗');
    }

    setToken(data.token);
    setStudent(data.student as StudentProfile);
    persistToken(data.token);
  };

  useEffect(() => {
    const stored = getStoredAuth();
    if (!stored?.token) {
      setIsBootstrapping(false);
      return;
    }

    setToken(stored.token);
    refreshStudent(stored.token)
      .catch(() => {
        // refreshStudent 內已處理 logout
      })
      .finally(() => {
        setIsBootstrapping(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (token !== null || !isBootstrapping) return;
    setStudent(null);
  }, [token, isBootstrapping]);

  return (
    <AuthContext.Provider
      value={{
        token,
        student,
        isBootstrapping,
        isAuthenticated: Boolean(token && student),
        login,
        refreshStudent,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
