import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token   = localStorage.getItem('cd_token');
    const saved   = localStorage.getItem('cd_partner');
    if (token && saved) {
      try {
        setPartner(JSON.parse(saved));
      } catch {
        localStorage.removeItem('cd_token');
        localStorage.removeItem('cd_partner');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cd_token', data.token);
    localStorage.setItem('cd_partner', JSON.stringify(data.partner));
    setPartner(data.partner);
    return data;
  };

  const register = async (formData) => {
    console.log('[Register] Sending:', formData);
    const { data } = await api.post('/auth/register', formData);
    console.log('[Register] Response:', data);
    localStorage.setItem('cd_token', data.token);
    localStorage.setItem('cd_partner', JSON.stringify(data.partner));
    setPartner(data.partner);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('cd_token');
    localStorage.removeItem('cd_partner');
    setPartner(null);
  };

  const refreshPartner = async () => {
    const { data } = await api.get('/auth/me');
    setPartner(data.partner);
    localStorage.setItem('cd_partner', JSON.stringify(data.partner));
    return data.partner;
  };

  return (
    <AuthContext.Provider value={{ partner, loading, login, register, logout, refreshPartner }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);