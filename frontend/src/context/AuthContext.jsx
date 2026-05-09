import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('quickcheck.token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('quickcheck.user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    authApi
      .me()
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('quickcheck.user', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('quickcheck.token');
        localStorage.removeItem('quickcheck.user');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const persistSession = (data) => {
    if (!data?.token || !data?.user) {
      throw new Error('Authentication response did not include a valid session');
    }
    localStorage.setItem('quickcheck.token', data.token);
    localStorage.setItem('quickcheck.user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (payload) => {
    const { data } = await authApi.login(payload);
    persistSession(data);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await authApi.signup(payload);
    persistSession(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('quickcheck.token');
    localStorage.removeItem('quickcheck.user');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, signup, logout, isAuthenticated: Boolean(token && user) }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
