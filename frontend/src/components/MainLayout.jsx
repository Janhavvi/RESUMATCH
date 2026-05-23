import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, BarChart3, Search, LogOut, Menu, X, Rocket } from 'lucide-react';
import { apiFetch } from '../lib/api.js';
const sidebarItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'AI Analyzer', path: '/analyzer', icon: Search },
  { name: 'ATS Score', path: '/ats-checker', icon: BarChart3 },
  { name: 'Job Match', path: '/job-match', icon: Rocket },
  { name: 'Resume Builder', path: '/builder', icon: FileText },
];

export const MainLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [profile, setProfile] = useState({
    name: 'User',
    totalResumes: 0,
    analyzedResumes: 0,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const isPublicRoute = normalizedPath === '/' || normalizedPath === '/login';

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch('/api/auth/profile', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setProfile({
          name: data?.user?.name || 'User',
          totalResumes: Number(data?.plan?.totalResumes || 0),
          analyzedResumes: Number(data?.plan?.analyzedResumes || 0),
        });
      } catch {
        // Keep default display values if profile cannot be fetched.
      }
    };

    if (!isPublicRoute) loadProfile();
  }, [isPublicRoute]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setProfile({
      name: 'User',
      totalResumes: 0,
      analyzedResumes: 0,
    });
    navigate('/login');
  };

  const initials = (profile.name || 'DU')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() || '')
    .slice(0, 2)
    .join('') || 'DU';

  const usagePercent =
    profile.totalResumes > 0
      ? Math.min(100, Math.round((profile.analyzedResumes / profile.totalResumes) * 100))
      : 0;

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="cyber-app-shell min-h-screen text-slate-100 flex">
      <div className="cyber-app-grid" aria-hidden="true" />
      <div className="cyber-app-circuit cyber-app-circuit-a" aria-hidden="true" />
      <div className="cyber-app-circuit cyber-app-circuit-b" aria-hidden="true" />
      <span className="cyber-app-node cyber-app-node-a" aria-hidden="true" />
      <span className="cyber-app-node cyber-app-node-b" aria-hidden="true" />
      <span className="cyber-app-node cyber-app-node-c" aria-hidden="true" />
      {/* Sidebar */}
      <aside 
        className={`cyber-sidebar fixed inset-y-0 left-0 z-50 w-64 glass flex flex-col p-6 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="cyber-brand-mark size-10 rounded-xl flex items-center justify-center">
              <Rocket className="size-6 text-white" />
            </div>
            <span className="cyber-brand-text text-xl font-bold tracking-tight">RESUMATCH</span>
          </div>

          <nav className="flex-1 space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                      ? 'cyber-nav-active text-white shadow-inner' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`size-5 ${isActive ? 'text-cyan-300' : 'group-hover:text-cyan-300'}`} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="cyber-account-card mt-auto p-4 rounded-2xl border mb-6">
            <p className="text-xs font-semibold text-cyan-200 uppercase tracking-wider mb-2">Account</p>
            <p className="text-[11px] text-slate-400 mb-2">
              {profile.analyzedResumes} of {profile.totalResumes} resumes analyzed
            </p>
            <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
              <div className="cyber-progress h-full transition-all duration-500" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-white transition-all"
          >
            <LogOut className="size-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="cyber-app-main flex-1 lg:ml-0 overflow-y-auto h-screen bg-transparent">
        <header className="cyber-app-header h-20 flex items-center justify-between px-8 sticky top-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{profile.name}</p>
            </div>
            <div className="cyber-avatar size-11 rounded-full border-2 flex items-center justify-center font-bold text-white">
              {initials}
            </div>
          </div>
        </header>

        <div className="cyber-app-content p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
