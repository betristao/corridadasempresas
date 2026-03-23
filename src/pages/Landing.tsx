import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Trophy } from "lucide-react";
import { cn } from "../lib/utils";
import { db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function Landing() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [email, setEmail] = useState("");
  const [showEmailStep, setShowEmailStep] = useState(false);

  useEffect(() => {
    // Check for success redirect from mobile flow
    if (window.location.search.includes('auth=success')) {
      const dataStr = localStorage.getItem('strava_athlete_data');
      if (dataStr) {
        setShowEmailStep(true);
        // Clean URL
        window.history.replaceState({}, document.title, "/");
      }
    }

    const handleMessage = (event: MessageEvent) => {
      // Allow messages from our own origin
      if (event.origin !== window.location.origin && !event.origin.includes('localhost') && !event.origin.includes('.run.app')) {
        return;
      }
      
      if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
        // Strava connected successfully, now ask for corporate email
        const { athlete, stats } = event.data; // Destructure stats
        if (athlete) {
          // Store athlete and stats together
          localStorage.setItem('strava_athlete_data', JSON.stringify({ athlete, stats: stats || { totalDistance: 0, weeklyActivities: [] } }));
        }
        setShowEmailStep(true);
        setIsConnecting(false);
      } else if (event.data?.type === 'STRAVA_AUTH_ERROR') {
        setIsConnecting(false);
        alert("Erro ao conectar com o Strava. Tente novamente.");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectStrava = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/auth/strava/url');
      if (!response.ok) throw new Error('Failed to get auth URL');
      const { url } = await response.json();
      
      const isMobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile) {
        // Direct redirect on mobile to avoid popup blockers
        window.location.href = url;
      } else {
        const authWindow = window.open(
          url,
          'strava_oauth',
          'width=600,height=700'
        );

        if (!authWindow) {
          // If popup blocked, fallback to direct redirect
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setIsConnecting(false);
    }
  };

  const handleJoinCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    
    const dataStr = localStorage.getItem('strava_athlete_data');
    const stravaData = dataStr ? JSON.parse(dataStr) : null;
    const athlete = stravaData?.athlete;
    const stats = stravaData?.stats;
    const athleteName = athlete ? `${athlete.firstname} ${athlete.lastname}` : "Atleta CorpRun";

    // Extract domain to map to company
    const domain = email.split('@')[1];
    
    // In a real app, we would save this to the database (Firebase/Supabase)
    // For the MVP prototype, we store in localStorage and navigate
    const userData = {
      email,
      domain,
      name: athleteName,
      companyName: domain.split('.')[0].toUpperCase(),
      stats,
      profilePic: athlete?.profile || "",
      lastUpdated: serverTimestamp()
    };

    localStorage.setItem('corprun_user', JSON.stringify(userData));
    
    // Save to Firestore for multi-user sync
    if (athlete?.id) {
       setDoc(doc(db, "users", athlete.id.toString()), userData, { merge: true })
        .catch(err => console.error("Firestore sync error:", err));
    }
    
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-200">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CorpRun Logo" className="w-10 h-10 rounded-xl shadow-sm" />
            <span className="font-bold text-xl tracking-tight">CorpRun B2B</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900">Funcionalidades</a>
            <a href="#leaderboard" className="hover:text-slate-900">Ranking Global</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
            <Trophy size={16} />
            <span>O Desafio Corporate Wellness 2026</span>
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Faça a sua empresa <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">correr mais longe.</span>
          </h1>
          
          <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
            Conecte o seu Strava, junte-se aos seus colegas de trabalho e compita no maior ranking B2B de quilómetros acumulados. Saúde, equipa e gamificação num só lugar.
          </p>

          <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 max-w-md">
            {!showEmailStep ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">1. Conecte a sua conta</h3>
                <p className="text-sm text-slate-500">Sincronização automática e passiva dos seus treinos.</p>
                  <button
                    onClick={handleConnectStrava}
                    disabled={isConnecting}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 bg-[#FC4C02] hover:bg-[#E34402] text-white py-3 px-4 rounded-xl font-semibold transition-all",
                      isConnecting && "opacity-70 cursor-not-allowed"
                    )}
                  >
                    {isConnecting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
                    )}
                    {isConnecting ? "A conectar..." : "Conectar com Strava"}
                  </button>
              </div>
            ) : (
              <form onSubmit={handleJoinCompany} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="font-semibold text-lg">2. Qual é a sua empresa?</h3>
                <p className="text-sm text-slate-500">Use o seu e-mail de trabalho para entrar na equipa certa.</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    required
                    placeholder="nome@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl font-semibold transition-all"
                  >
                    Entrar no Dashboard <ArrowRight size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div className="relative hidden lg:block">
          {/* Abstract UI Representation */}
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-100 to-red-50 rounded-[3rem] transform rotate-3 scale-105 -z-10" />
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 space-y-6 transform -rotate-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg">Leaderboard Global B2B</h3>
              <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">Live</span>
            </div>
            
            <div className="space-y-4">
              {[
                { rank: 1, name: "Google", km: "12,450", trend: "+120km", color: "bg-blue-500" },
                { rank: 2, name: "Microsoft", km: "11,200", trend: "+85km", color: "bg-green-500" },
                { rank: 3, name: "Acme Corp", km: "9,840", trend: "+210km", color: "bg-orange-500" },
              ].map((company) => (
                <div key={company.rank} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                    {company.rank}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{company.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", company.color)} />
                      {company.km} km acumulados
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-600">{company.trend}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
