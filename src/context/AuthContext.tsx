import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '@/types';
import { fetchProfile } from '@/lib/api';
// Use the local Vite proxy so authentication can never accidentally hit another app.
const API_URL = '/api';

export interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  adminUsername: string | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminLogout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [adminUsername, setAdminUsername] = useState<string | null>(() => localStorage.getItem('fairplay_admin_username'));
  const [loading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('fairplay_user');
    if (!savedUser) return;
    try {
      const parsedUser = JSON.parse(savedUser) as User;
      if (!parsedUser?.id || !parsedUser?.email) throw new Error('Invalid saved session');
      setUser(parsedUser);
      fetchProfile(parsedUser.id).then(setProfile).catch(() => setProfile(null));
    } catch {
      localStorage.removeItem('fairplay_user');
    }
  }, []);

  const establishSession = async (data: {id:string; email:string}) => {
    localStorage.setItem('fairplay_user', JSON.stringify(data));
    setUser(data);
    fetchProfile(data.id).then(setProfile).catch(() => setProfile(null));
  };

  const signUp = async (email: string, password: string, username: string) => {
    const response = await fetch(`${API_URL}/auth/`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'signup',email,password,username})});
    const data = await response.json().catch(() => ({})); if(!response.ok) throw new Error(data.detail || `Sign up failed (${response.status})`);
    await establishSession({id:data.id,email:data.email});
  };

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'signin',email,password})});
    const data = await response.json().catch(() => ({})); if(!response.ok) throw new Error(data.detail || `Sign in failed (${response.status})`);
    await establishSession({id:data.id,email:data.email});
  };

  const signOut = async () => {
    localStorage.removeItem('fairplay_user');
    setUser(null);
    setProfile(null);
  };

  const adminLogin = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/admin/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Administrator login failed');
    localStorage.setItem('fairplay_admin_token', data.token);
    localStorage.setItem('fairplay_admin_username', data.email);
    setAdminUsername(data.email);
  };

  const adminLogout = () => {
    localStorage.removeItem('fairplay_admin_token');
    localStorage.removeItem('fairplay_admin_username');
    setAdminUsername(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, adminUsername, loading, signUp, signIn, signOut, adminLogin, adminLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
