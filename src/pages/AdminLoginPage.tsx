import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AdminLoginPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function AdminLoginPage({ onNavigate }: AdminLoginPageProps) {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await adminLogin(email, password);
      onNavigate('admin');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Administrator login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Administrator Login</h1>
      <p className="text-sm text-slate-500 mb-6">This area is restricted to platform administrators.</p>
      <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <input className="w-full px-3 py-2.5 border rounded-lg" placeholder="Admin email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <input className="w-full px-3 py-2.5 border rounded-lg" type="password" placeholder="Admin password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-50" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in as administrator'}
        </button>
      </form>
    </div>
  );
}