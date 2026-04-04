import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Trophy, User, Settings, LogOut, WifiOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { offlineStorage } from '../services/offlineStorage';

const Navbar: React.FC = () => {
  const { user, profile, isOnline } = useAuth();
  const location = useLocation();
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      const pending = await offlineStorage.getAllPendingScores();
      setHasPending(pending.length > 0);
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'হোম' },
    { path: '/categories', icon: LayoutGrid, label: 'বিভাগ' },
    { path: '/leaderboard', icon: Trophy, label: 'লিডারবোর্ড' },
    { path: '/profile', icon: User, label: 'প্রোফাইল' },
  ];

  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4 z-50">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            GZ
          </div>
          <span className="text-xl font-bold text-gray-900">GenZQuiz</span>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mb-4 px-4">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-xs font-bold">
              <WifiOff size={14} />
              অফলাইন মোড
            </div>
          ) : hasPending ? (
            <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg text-xs font-bold animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              সিঙ্ক হচ্ছে...
            </div>
          ) : null}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
          >
            <LogOut size={20} />
            <span>লগআউট</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              location.pathname === item.path ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default Navbar;
