import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowUpRight, Building2, Share2, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { cn } from "../lib/utils";

// Mock Data for MVP Prototype
const MOCK_ACTIVITIES = [
  { day: "Seg", km: 5.2 },
  { day: "Ter", km: 0 },
  { day: "Qua", km: 8.4 },
  { day: "Qui", km: 4.1 },
  { day: "Sex", km: 0 },
  { day: "Sáb", km: 12.5 },
  { day: "Dom", km: 6.0 },
];

const INTERNAL_LEADERBOARD = [
  { rank: 1, name: "Sofia Silva", km: 142.5, me: false },
  { rank: 2, name: "Atleta CorpRun", km: 124.8, me: true },
  { rank: 3, name: "João Santos", km: 98.2, me: false },
  { rank: 4, name: "Ana Costa", km: 85.0, me: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{email: string, domain: string, name: string, companyName: string} | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('corprun_user');
    if (!stored) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  if (!user) return null;

  const handleShare = () => {
    alert("Funcionalidade de partilha para o LinkedIn. Gera um gráfico visual com os 124.8km acumulados pela empresa " + user.companyName);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Topbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CorpRun Logo" className="w-8 h-8 rounded-lg shadow-sm" />
            <span className="font-bold text-lg tracking-tight hidden sm:block">CorpRun B2B</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium">
              <Building2 size={16} className="text-slate-500" />
              <span>{user.companyName}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
              {user.name.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome & Share */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Olá, {user.name} 👋</h1>
            <p className="text-slate-500">Os seus treinos estão a impulsionar a {user.companyName}.</p>
          </div>
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
          >
            <Share2 size={18} />
            Partilhar no LinkedIn
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Activity size={20} className="text-orange-500" />
              <span className="font-medium">O Seu Contributo</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">124.8</span>
              <span className="text-slate-500 font-medium">km</span>
            </div>
            <div className="mt-4 text-sm text-green-600 flex items-center gap-1 font-medium">
              <ArrowUpRight size={16} /> +12% vs mês passado
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Building2 size={20} className="text-blue-500" />
              <span className="font-medium">Total {user.companyName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">1,450</span>
              <span className="text-slate-500 font-medium">km</span>
            </div>
            <div className="mt-4 text-sm text-slate-500 font-medium">
              42 colaboradores activos
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-slate-500 mb-2">
              <Trophy size={20} className="text-yellow-500" />
              <span className="font-medium">Ranking Global B2B</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight">#14</span>
              <span className="text-slate-500 font-medium">/ 150</span>
            </div>
            <div className="mt-4 text-sm text-slate-500 font-medium">
              A 45km do Top 10!
            </div>
          </div>
        </div>

        {/* Charts & Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Activity Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg mb-6">A Sua Actividade Recente</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_ACTIVITIES} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                    {MOCK_ACTIVITIES.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.km > 0 ? '#f97316' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Internal Leaderboard */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Ranking Interno</h3>
              <button className="text-sm text-orange-600 font-medium hover:text-orange-700">Ver todos</button>
            </div>
            
            <div className="space-y-4 flex-1">
              {INTERNAL_LEADERBOARD.map((athlete) => (
                <div 
                  key={athlete.rank} 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl transition-colors",
                    athlete.me ? "bg-orange-50 border border-orange-100" : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    athlete.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                    athlete.rank === 2 ? "bg-slate-200 text-slate-700" :
                    athlete.rank === 3 ? "bg-amber-100 text-amber-700" :
                    "bg-slate-100 text-slate-500"
                  )}>
                    {athlete.rank}
                  </div>
                  <div className="flex-1 font-medium text-sm truncate">
                    {athlete.name} {athlete.me && "(Tu)"}
                  </div>
                  <div className="font-bold text-sm">
                    {athlete.km} <span className="text-slate-500 font-normal text-xs">km</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Faltam <span className="font-bold text-slate-900">17.7km</span> para o 1º lugar!
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
