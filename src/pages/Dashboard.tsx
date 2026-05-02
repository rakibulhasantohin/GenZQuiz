import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Zap, Flame, Star, ArrowRight, Play, AlertCircle, Swords, Coins } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { formatNumber, cn } from '../lib/utils';
import VerifiedBadge from '../components/VerifiedBadge';
import CategoryIcon from '../components/CategoryIcon';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Mistake } from '../types';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);

  useEffect(() => {
    if (profile) {
      const fetchMistakes = async () => {
        const q = query(collection(db, 'mistakes'), where('userId', '==', profile.uid), limit(5));
        const snapshot = await getDocs(q);
        setMistakes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mistake)));
      };
      fetchMistakes();
    }
  }, [profile]);

  if (!profile) return null;

  const isDailyChallengeCompleted = profile.dailyChallengeCompletedAt && 
    new Date(profile.dailyChallengeCompletedAt).toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6 pb-10">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
              স্বাগতম, <span className="text-indigo-600">{profile.name}</span>
            </h1>
            {profile.isVerified && (
              <div className="shrink-0">
                <VerifiedBadge size={22} />
              </div>
            )}
            <span className="text-2xl md:text-3xl">! 👋</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">আপনার আজকের কুইজ যাত্রা শুরু করুন।</p>
        </motion.div>
        
        <div className="flex items-center gap-3 shrink-0">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm border-amber-100/50 bg-amber-50/10"
          >
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
              <Flame size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-[7px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">স্ট্রিক</p>
              <p className="text-sm font-black text-gray-900 leading-none">{formatNumber(profile.streak)} দিন</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm border-indigo-100/50 bg-indigo-50/10"
          >
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Star size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-[7px] text-gray-400 font-black uppercase tracking-widest leading-none mb-0.5">পয়েন্ট</p>
              <p className="text-sm font-black text-gray-900 leading-none">{formatNumber(profile.totalPoints)}</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Mistakes Notice */}
      {mistakes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 rounded-3xl flex items-center justify-between gap-4 border-red-100/50 bg-red-50/30 shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-900">ভুল উত্তরগুলো মনে আছে?</h3>
              <p className="text-[10px] text-red-600 font-bold uppercase tracking-widest">
                {formatNumber(mistakes.length)}টি ভুল উত্তর রিভিউ করুন
              </p>
            </div>
          </div>
          <Link 
            to="/mistakes" 
            className="px-4 py-2 bg-red-600 text-white text-[10px] font-black rounded-lg shadow-md shadow-red-100 active:scale-95 transition-all whitespace-nowrap uppercase tracking-widest"
          >
            রিভিউ
          </Link>
        </motion.div>
      )}

      {/* Level Card - Redesigned & Compact */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative"
      >
        <div className="bg-white rounded-[32px] p-1 border border-gray-100 shadow-xl shadow-indigo-100/20 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[28px] p-6 text-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10 flex items-center justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                    <span className="text-2xl font-black">{profile.level}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-100 mb-0.5">বর্তমান লেভেল</p>
                    <h2 className="text-xl font-black tracking-tight">লেভেল {formatNumber(profile.level)}</h2>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100">XP প্রগ্রেস</span>
                    <span className="text-xs font-black">{formatNumber(profile.xp % 100)} <span className="text-indigo-200 text-[10px]">/ ১০০</span></span>
                  </div>
                  <div className="h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${profile.xp % 100}%` }}
                      transition={{ duration: 1.2, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-white to-indigo-100 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                    ></motion.div>
                  </div>
                </div>
              </div>
              
              <div className="hidden sm:block shrink-0">
                <div className="w-20 h-20 relative">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
                    <motion.circle 
                      cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" 
                      strokeDasharray="283"
                      initial={{ strokeDashoffset: 283 }}
                      animate={{ strokeDashoffset: 283 - (283 * (profile.xp % 100) / 100) }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      strokeLinecap="round"
                      className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap size={24} className="text-white animate-pulse" fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      {/* Daily Challenge - Condensed */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className={cn(
          "glass-card p-5 rounded-[32px] flex flex-col sm:flex-row items-center justify-between gap-4 border-emerald-100/50 bg-emerald-50/30",
          isDailyChallengeCompleted && "opacity-80 border-gray-100 bg-gray-50/30"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0",
            isDailyChallengeCompleted ? "bg-gray-400 shadow-gray-200" : "bg-emerald-600 shadow-emerald-200"
          )}>
            <Trophy size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">দৈনিক চ্যালেঞ্জ</h3>
            <p className="text-xs text-gray-600 font-medium">
              {isDailyChallengeCompleted 
                ? "আজকের চ্যালেঞ্জ সম্পন্ন করেছেন।" 
                : `${profile.isVerified ? formatNumber(1000) : formatNumber(500)} পয়েন্ট এবং ${profile.isVerified ? formatNumber(1000) : formatNumber(500)} বোনাস XP সংগ্রহ করুন!`}
            </p>
          </div>
        </div>
        {!isDailyChallengeCompleted ? (
          <Link
            to="/quiz/daily-challenge"
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm"
          >
            শুরু করুন
            <ArrowRight size={16} />
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-[10px]">
            <Star size={16} fill="currentColor" />
            সম্পন্ন
          </div>
        )}
      </motion.section>

      {/* Battle CTA - New */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card p-6 rounded-[32px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white relative overflow-hidden group shadow-xl shadow-indigo-200/50"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-[24px] flex items-center justify-center border border-white/20 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all shrink-0">
            <Swords size={32} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="text-xl font-black tracking-tight">ফ্রেন্ডস ব্যাটেল এরিনা</h3>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-400 text-[10px] font-black text-amber-900 rounded-md shadow-sm">
                <Coins size={10} fill="currentColor" />
                <span>NEW</span>
              </div>
            </div>
            <p className="text-sm text-indigo-100 font-medium max-w-md">কয়েন বাজি ধরুন এবং সরাসরি অন্য খেলোয়াড়দের সাথে যুদ্ধ করে বড় পুরস্কার জিতুন!</p>
          </div>
          <Link
            to="/battle"
            className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-700 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            ব্যাটেল খেলুন
            <Zap size={16} fill="currentColor" />
          </Link>
        </div>
      </motion.section>

      {/* Recommended Categories - Horizontal Scroll on Mobile */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">জনপ্রিয় বিভাগসমূহ</h2>
          <Link to="/categories" className="group flex items-center gap-1 text-indigo-600 font-black uppercase tracking-widest text-[10px] hover:text-indigo-700 transition-colors">
            সবগুলো 
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        
        <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar -mx-4 px-4 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:px-0 sm:mx-0">
          {categories.slice(0, 3).map((category, i) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="glass-card p-5 rounded-[32px] group card-hover min-w-[260px] sm:min-w-0"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 ${category.color} rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0`}>
                  <CategoryIcon icon={category.icon} size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">{category.nameBn}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">১০+ কুইজ</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2 leading-relaxed h-8">{category.description}</p>
              <Link
                to={`/quiz/${category.id}`}
                className="w-full py-3 bg-gray-50 text-gray-700 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm"
              >
                শুরু করুন
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
