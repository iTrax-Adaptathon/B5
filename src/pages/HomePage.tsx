import { useEffect, useState } from 'react';
import { fetchChallenges } from '@/lib/api';
import { ChallengeCard } from '@/components/ChallengeCard';
import type { Challenge } from '@/types';
import { Loader2, Search, Frown } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    fetchChallenges('active')
      .then(setChallenges)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', 'Fitness', 'Coding', 'Photography', 'Community', 'Art', 'Study', 'Custom'];

  const filtered = challenges.filter((c) => {
    const matchesSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeFilter === 'all' || c.category === activeFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Frown className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Challenges</h1>
        <p className="text-slate-500">Compete fairly. Prove your skills. Climb the leaderboard on merit.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search challenges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeFilter === cat
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat === 'all' ? 'All' : cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Frown className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No challenges found. Try creating one!</p>
          <button
            onClick={() => onNavigate('create')}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Create a Challenge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClick={() => onNavigate('challenge', { id: challenge.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
