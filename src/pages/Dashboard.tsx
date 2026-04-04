import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trophy, Zap, Flame, Star, ArrowRight, Play, AlertCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { formatNumber, cn } from '../lib/utils';
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
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
            স্বাগতম, <span className="text-indigo-600">{profile.name}</span>! 👋
          </h1>
          <p className="text-base text-gray-500 font-medium">আপনার আজকের কুইজ যাত্রা শুরু করুন।</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-3 rounded-2xl flex items-center gap-3 flex-1 sm:flex-none min-w-[120px]"
          >
            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center shadow-sm">
              <Flame size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">স্ট্রিক</p>
              <p className="text-lg font-black text-gray-900">{formatNumber(profile.streak)} দিন</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-3 rounded-2xl flex items-center gap-3 flex-1 sm:flex-none min-w-[120px]"
          >
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <Star size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">পয়েন্ট</p>
              <p className="text-lg font-black text-gray-900">{formatNumber(profile.totalPoints)}</p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Mistakes Notice */}
      {mistakes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 rounded-[32px] flex items-center justify-between gap-4 border-red-100/50 bg-red-50/30 shadow-lg shadow-red-100/20"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-900">ভুল উত্তরগুলো মনে আছে?</h3>
              <p className="text-xs text-red-600 font-bold uppercase tracking-widest">
                আপনার {formatNumber(mistakes.length)}টি ভুল উত্তর রিভিউ করা প্রয়োজন
              </p>
            </div>
          </div>
          <Link 
            to="/mistakes" 
            className="px-6 py-3 bg-red-600 text-white text-sm font-black rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all whitespace-nowrap"
          >
            রিভিউ করুন
          </Link>
        </motion.div>
      )}

      {/* Level Card - Condensed */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-6 md:p-8 text-white overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Zap size={120} className="rotate-12" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 flex-1">
              <div>
                <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/10">
                  <Star size={10} fill="currentColor" />
                  প্রগ্রেস
                </div>
                <h2 className="text-3xl font-black tracking-tight">লেভেল {formatNumber(profile.level)}</h2>
              </div>
              
              <div className="space-y-2 max-w-md">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-100">
                  <span>XP প্রগ্রেস</span>
                  <span>{formatNumber(profile.xp % 100)} / ১০০</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5 backdrop-blur-sm">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profile.xp % 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  ></motion.div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-lg rotate-3">
                <span className="text-4xl font-black">{profile.level}</span>
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
                : "৫০০ পয়েন্ট এবং ৫০০ বোনাস XP সংগ্রহ করুন!"}
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
                <div className={`w-12 h-12 ${category.color} rounded-2xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <Play size={20} fill="currentColor" />
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
