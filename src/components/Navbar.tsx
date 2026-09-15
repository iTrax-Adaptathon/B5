import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Home, PlusCircle, BarChart3, User, LogOut, Menu, X, Shield } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { user, profile, adminUsername, signOut, adminLogout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Challenges', icon: Home },
    ...((user || adminUsername) ? [{ id: 'create', label: 'Create', icon: PlusCircle }] : []),
    { id: 'dashboard', label: 'My Progress', icon: BarChart3 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  if (profile?.is_moderator) {
    navItems.push({ id: 'moderation', label: 'Moderation', icon: Shield });
  }

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('home')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800 hidden sm:block">FairPlay</span>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {adminUsername ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('admin')}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Admin Panel
                </button>
                <button
                  onClick={() => { adminLogout(); handleNav('home'); }}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Sign out of administrator account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav('profile')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">{profile?.username ?? 'Profile'}</span>
                </button>
                <button
                  onClick={signOut}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('auth')}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            {adminUsername ? (
              <button
                onClick={() => { adminLogout(); handleNav('home'); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Administrator
              </button>
            ) : user ? (
              <button
                onClick={() => { signOut(); setMobileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            ) : (
              <button
                onClick={() => handleNav('auth')}
                className="w-full px-3 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
