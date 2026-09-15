import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';
import { AuthPage } from '@/pages/AuthPage';
import { HomePage } from '@/pages/HomePage';
import { ChallengeDetailPage } from '@/pages/ChallengeDetailPage';
import { CreateChallengePage } from '@/pages/CreateChallengePage';
import { EditChallengePage } from '@/pages/EditChallengePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LeaderboardPage } from '@/pages/LeaderboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ModerationPage } from '@/pages/ModerationPage';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { AdminPage } from '@/pages/AdminPage';

function AppContent() {
  const { user, adminUsername, loading } = useAuth();
  const [page, setPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/admin' || path === '/admin-login') return 'admin';
    if (path === '/challenge') return 'challenge';
    if (path === '/edit-challenge') return 'edit-challenge';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/leaderboard') return 'leaderboard';
    if (path === '/profile') return 'profile';
    if (path === '/auth') return 'auth';
    return 'home';
  });
  const [params, setParams] = useState<Record<string, string>>(() => {
    const query = new URLSearchParams(window.location.search);
    const id = query.get('id');
    return id ? { id } : {};
  });
  const isAdminPath = window.location.pathname === '/admin' || window.location.pathname === '/admin-login';

  const navigate = (newPage: string, newParams: Record<string, string> = {}) => {
    setPage(newPage);
    setParams(newParams);
    const path = newPage === 'home' ? '/' : newPage === 'admin-login' ? '/admin' : `/${newPage}`;
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loading && isAdminPath) {
      if (!adminUsername && page !== 'admin-login') navigate('admin-login');
      return;
    }
    if (!loading && user && page === 'auth') { navigate('dashboard'); return; }
    if (!loading && page === 'admin' && !adminUsername) {
      navigate('admin-login');
      return;
    }
    if (!loading && page === 'create' && !user && !adminUsername) {
      navigate('auth');
      return;
    }
    if (!loading && !user && !adminUsername && page !== 'auth' && page !== 'home' && page !== 'leaderboard' && !isAdminPath) {
      navigate('auth');
    }
  }, [user, adminUsername, loading, page, isAdminPath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !adminUsername && page !== 'home' && page !== 'auth' && page !== 'leaderboard' && page !== 'admin' && page !== 'admin-login' && !isAdminPath) {
    navigate('auth');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar currentPage={page} onNavigate={navigate} />
      <main>
        {page === 'auth' && !isAdminPath && <AuthPage />}
        {page === 'home' && <HomePage onNavigate={navigate} />}
        {page === 'challenge' && params.id && <ChallengeDetailPage challengeId={params.id} onNavigate={navigate} />}
        {page === 'edit-challenge' && params.id && <EditChallengePage challengeId={params.id} onNavigate={navigate} />}
        {page === 'create' && (user || adminUsername) && <CreateChallengePage onNavigate={navigate} />}
        {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
        {page === 'leaderboard' && <LeaderboardPage onNavigate={navigate} />}
        {page === 'profile' && <ProfilePage onNavigate={navigate} />}
        {page === 'moderation' && <ModerationPage onNavigate={navigate} />}
        {(isAdminPath || page === 'admin-login' || (page === 'admin' && !adminUsername)) && !adminUsername && <AdminLoginPage onNavigate={navigate} />}
        {page === 'admin' && adminUsername && <AdminPage onNavigate={navigate} />}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        FairPlay — Fair competition, ranked by merit not popularity
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
