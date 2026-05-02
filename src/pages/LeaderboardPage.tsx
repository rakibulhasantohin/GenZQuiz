import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { LeaderboardEntry } from '../types';
import { formatNumber, cn } from '../lib/utils';
import { Trophy, Medal, Star, User, Crown, TrendingUp, Search, Info } from 'lucide-react';
import { useAuth } from '../AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';

import { Link } from 'react-router-dom';
import { offlineStorage } from '../services/offlineStorage';

const LeaderboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const getWeekId = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day + 1) % 7;
    d.setDate(d.getDate() - diff);
    return d.toLocaleDateString('en-CA');
  };
  const currentWeek = getWeekId();

  useEffect(() => {
    // Try to load from offline storage first
    const loadCached = async () => {
      const cached = await offlineStorage.getLeaderboard();
      if (cached && cached.data && cached.data.length > 0) {
        setEntries(cached.data);
        if (!navigator.onLine) setLoading(false);
      }
    };
    loadCached();

    // Query top 20 for this week
    const q = query(
      collection(db, 'leaderboard'), 
      where('lastWeeklyUpdate', '==', currentWeek),
      orderBy('weeklyPoints', 'desc'), 
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as any);
      // Map weeklyPoints to totalPoints for the UI component compatibility
      const mappedData: LeaderboardEntry[] = data.map(d => ({
        userId: d.userId,
        displayName: d.displayName,
        totalPoints: d.weeklyPoints, // Show weekly points
        level: d.level,
        xp: d.xp || 0,
        avatar: d.avatar,
        isVerified: d.isVerified
      }));
      setEntries(mappedData);
      offlineStorage.saveLeaderboard(mappedData);
      setLoading(false);
    });

    // Get current user's rank if they have played this week
    if (profile) {
      const fetchUserRank = async () => {
        const userRef = collection(db, 'leaderboard');
        const userDoc = await getDocs(query(userRef, where('userId', '==', profile.uid), where('lastWeeklyUpdate', '==', currentWeek)));
        
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const rankQuery = query(
            userRef, 
            where('lastWeeklyUpdate', '==', currentWeek),
            where('weeklyPoints', '>', userData.weeklyPoints)
          );
          const rankSnapshot = await getCountFromServer(rankQuery);
          setUserRank(rankSnapshot.data().count + 1);
        } else {
          setUserRank(null);
        }
      };
      fetchUserRank();
    }

    return () => unsubscribe();
  }, [profile, currentWeek]);

  const filteredEntries = entries.filter(entry => 
    entry.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isUserInTop20 = profile && entries.some(e => e.userId === profile.uid);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">লিডারবোর্ড লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100 shadow-sm">
            <Trophy size={12} fill="currentColor" />
            সেরা ২০ খেলোয়াড় (এই সপ্তাহ)
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">লিডারবোর্ড</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md leading-relaxed">
            এই সপ্তাহের সেরা কুইজ প্রেমীদের তালিকা। প্রতি শনিবার রাত ১২টায় এটি রিসেট হয়।
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="খেলোয়াড় খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold shadow-sm text-sm"
          />
        </div>
      </header>

      {/* List Section */}
      {entries.length > 0 ? (
        <div className="glass-card rounded-[32px] overflow-hidden shadow-xl shadow-indigo-100/10">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between font-black text-gray-400 text-[10px] uppercase tracking-[0.1em]">
            <div className="flex items-center gap-8">
              <span className="w-8 text-center">র‍্যাঙ্ক</span>
              <span>খেলোয়াড়</span>
            </div>
            <div className="flex items-center gap-12">
              <span className="hidden md:block">লেভেল & XP</span>
              <span className="w-20 text-right">পয়েন্ট</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-50">
            <AnimatePresence mode="popLayout">
              {filteredEntries.map((entry, i) => {
                const rank = i + 1;
                const isFirst = rank === 1;
                const isSecond = rank === 2;
                const isThird = rank === 3;
                
                const rankLabel = isFirst ? 'Diamond' : isSecond ? 'Gold' : isThird ? 'Silver' : null;
                
                return (
                  <motion.div 
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 md:p-4 flex items-center justify-between hover:bg-indigo-50/30 transition-all group cursor-pointer relative overflow-hidden w-full",
                      profile?.uid === entry.userId ? "bg-indigo-50/50" : "",
                      isFirst ? "bg-cyan-50/30" : isSecond ? "bg-amber-50/30" : isThird ? "bg-gray-50/30" : ""
                    )}
                  >
                    {isFirst && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 blur-[60px] -z-10 pointer-events-none" />
                    )}
                    
                    <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                      <div className="w-6 md:w-8 flex items-center justify-center shrink-0">
                        {rank <= 3 ? (
                          <div className={cn(
                            "w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center font-black text-[10px] md:text-sm shadow-sm",
                            isFirst ? 'bg-gradient-to-br from-cyan-300 to-cyan-500 text-white' : 
                            isSecond ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white' : 
                            'bg-gradient-to-br from-gray-200 to-gray-400 text-white'
                          )}>
                            {rank}
                          </div>
                        ) : (
                          <span className="font-black text-gray-300 text-xs md:text-base group-hover:text-indigo-300 transition-colors">
                            #{rank}
                          </span>
                        )}
                      </div>
                      
                      <Link to={`/user/${entry.userId}`} className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white overflow-hidden border-2 shadow-sm group-hover:scale-105 transition-transform",
                            isFirst ? 'border-cyan-400' : 
                            isSecond ? 'border-amber-400' : 
                            isThird ? 'border-gray-300' : 'border-white'
                          )}>
                            {entry.avatar ? (
                              <img src={entry.avatar} alt={entry.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                <User size={24} />
                              </div>
                            )}
                          </div>
                          
                          {rank <= 3 && (
                            <div className={cn(
                              "absolute -top-1 -right-1 md:-top-1.5 md:-right-1.5 drop-shadow-md z-10 p-0.5 rounded-md bg-white/90 backdrop-blur-sm border border-white/50",
                              isFirst ? 'text-cyan-500' : 
                              isSecond ? 'text-amber-500' : 
                              'text-gray-400'
                            )}>
                              <Crown size={12} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h4 className="font-black text-gray-900 text-sm md:text-base leading-tight">{entry.displayName}</h4>
                            {entry.isVerified && (
                              <VerifiedBadge size={14} />
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest shrink-0">
                              লেভেল {formatNumber(entry.level)}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {rankLabel ? (
                                <span className={cn(
                                  "text-[8px] md:text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md shadow-sm",
                                  isFirst ? 'bg-cyan-500 text-white' : 
                                  isSecond ? 'bg-amber-500 text-white' : 
                                  'bg-gray-400 text-white'
                                )}>
                                  {rankLabel}
                                </span>
                              ) : (
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-400 border border-indigo-100">
                                  Top 20
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-6 shrink-0 ml-2">
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <div className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
                          {formatNumber(entry.xp)} XP
                        </div>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 rounded-xl md:rounded-2xl border shadow-sm shrink-0",
                        isFirst ? 'bg-cyan-50 border-cyan-100' : 
                        isSecond ? 'bg-amber-50 border-amber-100' : 
                        isThird ? 'bg-gray-50 border-gray-200' : 
                        'bg-gray-50 border-gray-100'
                      )}>
                        <Star size={12} className={cn(
                          isFirst ? 'text-cyan-500' : 
                          isSecond ? 'text-amber-500' : 
                          'text-gray-400'
                        )} fill="currentColor" />
                        <span className="text-sm md:text-base font-black text-gray-900 tracking-tight">{formatNumber(entry.totalPoints)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center rounded-[40px] border-dashed border-2 border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Trophy size={32} />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">এই সপ্তাহের কোনো ডাটা নেই</h3>
          <p className="text-gray-500">কুইজ খেলে এই সপ্তাহের লিডারবোর্ডে আপনার জায়গা করে নিন!</p>
        </div>
      )}

      {/* Current User Rank (If not in top 20) */}
      {!isUserInTop20 && userRank && (
        <div className="fixed bottom-24 left-6 right-6 z-50">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="max-w-3xl mx-auto glass-card p-4 rounded-[24px] bg-indigo-600 text-white shadow-2xl flex items-center justify-between border-none"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                #{userRank}
              </div>
              <div>
                <h4 className="font-black text-sm">আপনার বর্তমান র‍্যাঙ্ক</h4>
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">শীর্ষ ২০ এর বাইরে</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 px-4 py-2 rounded-xl text-right">
                <div className="text-[8px] font-bold text-indigo-200 uppercase tracking-widest">XP</div>
                <div className="text-sm font-black tracking-tight">{formatNumber(profile?.xp || 0)}</div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
                <Star size={16} className="text-amber-400" fill="currentColor" />
                <span className="text-xl font-black tracking-tight">{formatNumber(profile?.weeklyPoints || 0)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
