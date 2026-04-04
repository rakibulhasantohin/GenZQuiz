import React from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { formatNumber, cn } from '../lib/utils';
import { User, Mail, Calendar, Trophy, Star, Zap, Settings, LogOut, Shield } from 'lucide-react';
import { auth } from '../firebase';
import { Link } from 'react-router-dom';

import { ACHIEVEMENTS } from '../constants';

const ProfilePage: React.FC = () => {
  const { profile, isAdmin } = useAuth();

  if (!profile) return null;

  const unlockedCount = profile.achievements?.length || 0;

  const stats = [
    { label: 'মোট পয়েন্ট', value: formatNumber(profile.totalPoints), icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'লেভেল', value: formatNumber(profile.level), icon: Trophy, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'XP', value: formatNumber(profile.xp), icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'কুইজ খেলেছেন', value: formatNumber(profile.quizzesPlayed), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* Header - Condensed */}
      <header className="glass-card p-6 md:p-10 rounded-[32px] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600 opacity-5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-indigo-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="w-24 h-24 rounded-[32px] bg-white border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 overflow-hidden relative z-10">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <User size={48} strokeWidth={1.5} />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white z-20">
              <Star size={14} fill="currentColor" />
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{profile.name}</h1>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-100 shadow-sm">
                    <Shield size={10} />
                    এডমিন
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 text-gray-500 font-bold text-xs">
                <div className="flex items-center gap-1.5">
                  <Mail size={16} className="text-gray-400" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-gray-400" />
                  <span>সদস্য: {new Date(profile.createdAt).toLocaleDateString('bn-BD')}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2 px-6 py-2 text-xs"
                >
                  <Shield size={16} />
                  এডমিন প্যানেল
                </Link>
              )}
              <button className="btn-secondary flex items-center gap-2 px-6 py-2 text-xs">
                <Settings size={16} />
                প্রোফাইল এডিট
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid - Condensed */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4 rounded-[24px] text-center card-hover"
          >
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mx-auto mb-3 shadow-sm`}>
              <stat.icon size={20} fill="currentColor" />
            </div>
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-xl font-black text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Achievements Section - Condensed */}
      <section className="glass-card p-6 md:p-8 rounded-[32px]">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">অর্জিত ব্যাজসমূহ</h2>
          <span className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">{formatNumber(unlockedCount)} / {formatNumber(ACHIEVEMENTS.length)}</span>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
          {ACHIEVEMENTS.map((badge, i) => {
            const isUnlocked = profile.achievements?.includes(badge.id);
            
            return (
              <motion.div 
                key={badge.id} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={isUnlocked ? { scale: 1.05 } : {}}
                className={cn(
                  "flex flex-col items-center gap-2 group transition-all",
                  !isUnlocked && "opacity-40 grayscale"
                )}
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border-2 border-white relative",
                  isUnlocked ? badge.color : "bg-gray-100 border-dashed border-gray-200"
                )}>
                  {isUnlocked && (
                    <div className="absolute inset-0 bg-white/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  )}
                  {isUnlocked ? badge.icon : '🔒'}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-900 truncate w-16">{isUnlocked ? badge.name : 'লকড'}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Logout Button - Condensed */}
      <button
        onClick={() => auth.signOut()}
        className="w-full py-4 bg-red-50 text-red-600 rounded-[24px] font-black text-base flex items-center justify-center gap-3 hover:bg-red-100 transition-all active:scale-[0.98] border-2 border-red-100/50"
      >
        <LogOut size={20} />
        লগআউট করুন
      </button>
    </div>
  );
};

export default ProfilePage;
