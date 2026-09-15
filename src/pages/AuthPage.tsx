import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Mail, Lock, User, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!username.trim()) throw new Error('Username is required');
        await signUp(email, password, username.trim());
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.includes('already') ? 'An account with this email already exists. Try signing in.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-slate-50 to-emerald-50/30">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {mode === 'signup' ? 'Join the Competition' : 'Welcome Back'}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {mode === 'signup'
              ? 'Compete fairly across challenges that matter'
              : 'Sign in to continue competing'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6">
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign Up
            </button>
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-sm font-medium text-slate-600 mb-1.5 block">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your display name"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    required
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Fair scoring. No popularity contests. Real achievement wins.
        </p>
      </div>
    </div>
  );
}
