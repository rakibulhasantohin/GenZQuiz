import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs, limit, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { Battle, Question, UserProfile } from '../types';
import { Coins, Swords, Shield, Plus, Users, Zap, CheckCircle2, AlertCircle, Loader2, Sparkles, RefreshCw, X } from 'lucide-react';
import { formatNumber, cn } from '../lib/utils';
import CategoryIcon from '../components/CategoryIcon';

const BattlePage: React.FC = () => {
  const { profile, user, claimDailyCoins } = useAuth();
  const { categories } = useCategories();
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stake, setStake] = useState(10);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!profile) return;

    const q = query(
      collection(db, 'battles'),
      where('status', '==', 'waiting'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const battleData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Battle));
      setBattles(battleData.filter(b => b.creatorId !== profile.uid));
      setLoading(false);
    }, (error) => {
      console.error('Error listening to waiting battles:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleClaimCoins = async () => {
    setClaiming(true);
    const result = await claimDailyCoins();
    alert(result.message);
    setClaiming(false);
  };

  const [onlinePlayers, setOnlinePlayers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Current time minus 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const q = query(
      collection(db, 'users'),
      where('lastActiveAt', '>=', twoMinutesAgo),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players = snapshot.docs.map(doc => doc.data() as UserProfile);
      setOnlinePlayers(players);
    }, (error) => {
      console.error('Error listening to online players:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateBattle = async (isBot = false) => {
    if (!profile || !selectedCategory) return;
    if ((profile.coins || 0) < stake) {
      alert('আপনার পর্যাপ্ত কয়েন নেই!');
      return;
    }

    setCreating(true);
    try {
      const category = categories.find(c => c.id === selectedCategory);
      
      const qRef = collection(db, 'questions');
      const qQuery = query(
        qRef,
        where('category', '==', selectedCategory),
        where('approved', '==', true),
        limit(100)
      );
      const qSnapshot = await getDocs(qQuery);
      let selectedQuestions: Question[] = qSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Question))
        .sort(() => 0.5 - Math.random())
        .slice(0, 10);

      if (selectedQuestions.length === 0) {
        alert('এই বিভাগে কোনো প্রশ্ন পাওয়া যায়নি। অন্য বিভাগ চেষ্টা করুন।');
        setCreating(false);
        return;
      }

      const battleRef = await addDoc(collection(db, 'battles'), {
        creatorId: profile.uid,
        creatorName: profile.name,
        creatorPhoto: profile.photoURL || '',
        opponentId: isBot ? 'bot-id' : null,
        opponentName: isBot ? 'GenZ Bot' : null,
        opponentPhoto: isBot ? 'https://api.dicebear.com/7.x/bottts/svg?seed=GenZBot' : null,
        category: selectedCategory,
        categoryNameBn: category?.nameBn || '',
        stake: stake,
        status: isBot ? 'active' : 'waiting',
        questions: selectedQuestions,
        creatorScore: 0,
        opponentScore: 0,
        creatorCompleted: false,
        opponentCompleted: false,
        creatorCoinsDeducted: stake === 0 || isBot, // Deduct coins immediately for bot games to avoid complex prize logic later
        isBot: isBot,
        createdAt: serverTimestamp()
      });

      // Deduct coins if it's a bot game and stake > 0
      if (isBot && stake > 0) {
        await updateDoc(doc(db, 'users', profile.uid), {
          coins: increment(-stake)
        });
      }

      navigate(`/battle/${battleRef.id}`);
    } catch (error) {
      console.error('Error creating battle:', error);
      alert('ব্যাটল তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinBattle = async (battle: Battle) => {
    if (!profile) return;
    if ((profile.coins || 0) < battle.stake) {
      alert('আপনার পর্যাপ্ত কয়েন নেই!');
      return;
    }

    try {
      const battleRef = doc(db, 'battles', battle.id);
      const userRef = doc(db, 'users', profile.uid);

      await runTransaction(db, async (transaction) => {
        const bSnap = await transaction.get(battleRef);
        if (!bSnap.exists()) throw new Error("Battle does not exist!");
        
        const bData = bSnap.data() as Battle;
        if (bData.status !== 'waiting' || bData.opponentId) {
          throw new Error("Battle is already full or started!");
        }

        // Deduct coins
        if (battle.stake > 0) {
          transaction.update(userRef, {
            coins: increment(-battle.stake)
          });
        }

        // Update battle
        transaction.update(battleRef, {
          opponentId: profile.uid,
          opponentName: profile.name,
          opponentPhoto: profile.photoURL || '',
          status: 'active'
        });
      });

      navigate(`/battle/${battle.id}`);
    } catch (error: any) {
      console.error('Error joining battle:', error);
      alert(error.message || 'ব্যাটলে জয়েন করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 left-0 w-[300px] h-[300px] bg-amber-100/30 rounded-full blur-3xl -translate-x-1/2 -z-10"></div>

      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pt-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg shadow-indigo-100">
              <Swords size={12} fill="currentColor" />
              Ultimate Arena
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter leading-tight">
              ব্যাটেল <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">লবি</span>
            </h1>
            <p className="text-gray-400 font-medium text-xs md:text-base max-w-sm">
              আপনার বুদ্ধিমত্তা যাচাই করুন এবং জয়ী হয়ে কয়েন বাড়িয়ে নিন!
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="glass-card px-6 py-4 rounded-[28px] flex items-center gap-3 border-amber-100 bg-white/70 backdrop-blur-xl shadow-lg">
              <div className="w-10 h-10 bg-amber-400 text-amber-900 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Coins size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">ব্যালেন্স</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-gray-900 leading-none">{formatNumber(profile?.coins || 0)}</span>
                  <span className="text-[9px] font-bold text-gray-400">Coins</span>
                </div>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaimCoins}
              disabled={claiming}
              className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 disabled:opacity-50 relative group"
            >
              {claiming ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={22} />}
            </motion.button>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 rounded-[40px] bg-white border-none shadow-[0_10px_40px_-5px_rgba(0,0,0,0.05)] flex flex-col items-center text-center group cursor-pointer hover:shadow-xl transition-all"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="relative mb-6">
               <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100 group-hover:scale-105 transition-all relative z-10">
                 <Plus size={40} strokeWidth={3} />
               </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">ব্যাটেল শুরু করুন</h3>
            <p className="text-gray-400 font-medium mb-6 text-xs">বন্ধুদের বা বিশ্বব্যাপী চ্যালেঞ্জ করুন।</p>
            
            <div className="mt-auto inline-flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-100 group-hover:bg-indigo-600 group-hover:text-white rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest text-gray-400">
               <span>চ্যালেঞ্জ পাঠান</span>
               <Zap size={12} fill="currentColor" />
            </div>
          </motion.div>

          {/* Real Online Players List */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-[32px] bg-white border-indigo-50"
          >
            <div className="flex items-center justify-between mb-4 px-2">
              <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">এখন অনলাইনে</h4>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-gray-400">{onlinePlayers.length > 0 ? formatNumber(onlinePlayers.length) : '০'} জন</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {onlinePlayers.length > 0 ? (
                onlinePlayers.map((p, idx) => (
                  <div key={p.uid || idx} className="relative group">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm transition-transform hover:scale-110">
                      {p.photoURL ? (
                        <img src={p.photoURL} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                          <Users size={16} />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {p.name}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-medium text-gray-400 italic">বর্তমানে কেউ অনলাইনে নেই</p>
              )}
            </div>
          </motion.div>
        </div>

          {/* Battles Feed */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                <h3 className="font-black text-gray-900 uppercase tracking-[0.2em] text-xs">অপেক্ষমাণ এরিনাস</h3>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                 <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">অটো-রিফ্রেশ</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 bg-gray-50 rounded-[32px] animate-pulse"></div>
                ))
              ) : battles.length === 0 ? (
                <div className="col-span-full py-20 flex flex-col items-center justify-center glass-card rounded-[40px] border-dashed border-2 border-gray-100">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                    <Shield size={40} />
                  </div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">বর্তমানে কোনো ব্যাটেল নেই</p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 text-indigo-600 font-black text-[10px] uppercase tracking-widest underline decoration-2 underline-offset-4"
                  >
                    প্রথম ব্যাটেলটি আপনিই শুরু করুন
                  </button>
                </div>
              ) : (
                battles.map((battle, idx) => (
                  <motion.div 
                    key={battle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    className="p-3 bg-white hover:bg-indigo-50/50 rounded-[36px] shadow-sm border border-gray-100 hover:border-indigo-200 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-[28px] overflow-hidden border-2 border-white shadow-md relative group-hover:scale-105 transition-transform shrink-0">
                        {battle.creatorPhoto ? (
                          <img src={battle.creatorPhoto} alt={battle.creatorName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                            <Users size={32} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">{battle.creatorName}</h4>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">{battle.categoryNameBn}</p>
                        
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                              <Coins size={12} fill="currentColor" />
                              <span className="font-black text-[10px]">{formatNumber(battle.stake)}</span>
                           </div>
                           <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleJoinBattle(battle)}
                            className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                          >
                            জয়েন
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Improved Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight">ব্যাটেল সেটআপ</h2>
                  <p className="text-gray-400 font-medium text-[10px]">বিভাগ এবং স্টেক সিলেক্ট করুন</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">স্টেক (কয়েন)</p>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 10, 20, 50, 100].map((s) => (
                      <button
                        key={s}
                        onClick={() => setStake(s)}
                        className={cn(
                          "py-3 rounded-xl font-black border-2 transition-all flex flex-col items-center justify-center gap-1",
                          stake === s 
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" 
                            : "bg-gray-50 border-gray-50 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {s === 0 ? <Zap size={14} fill={stake === s ? "currentColor" : "none"} /> : <Coins size={14} fill={stake === s ? "currentColor" : "none"} />}
                        <span className="text-[10px]">{s === 0 ? "ফ্রি" : formatNumber(s)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">ক্যাটাগরি</p>
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2",
                          selectedCategory === cat.id 
                            ? "bg-indigo-50 border-indigo-500 shadow-sm" 
                            : "bg-white border-gray-100 hover:border-gray-200"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", cat.color)}>
                          <CategoryIcon icon={cat.icon} size={18} />
                        </div>
                        <span className={cn("text-[10px] font-bold text-center", selectedCategory === cat.id ? "text-indigo-600" : "text-gray-600")}>{cat.nameBn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => handleCreateBattle(false)}
                    disabled={creating || !selectedCategory}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} fill="currentColor" />}
                    প্লেয়ার খুঁজুন
                  </button>
                  <button 
                    onClick={() => handleCreateBattle(true)}
                    disabled={creating || !selectedCategory}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                    AI এর সাথে খেলুন
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BattlePage;
