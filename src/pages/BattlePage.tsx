import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Battle, Question } from '../types';
import { Coins, Swords, Shield, Plus, Users, Zap, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
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
    });

    return () => unsubscribe();
  }, [profile]);

  const handleClaimCoins = async () => {
    setClaiming(true);
    const result = await claimDailyCoins();
    alert(result.message);
    setClaiming(false);
  };

  const handleCreateBattle = async () => {
    if (!profile || !selectedCategory) return;
    if ((profile.coins || 0) < stake) {
      alert('আপনার পর্যাপ্ত কয়েন নেই!');
      return;
    }

    setCreating(true);
    try {
      const category = categories.find(c => c.id === selectedCategory);
      
      // Fetch 5 random questions for this category
      const qRef = collection(db, 'questions');
      const qQuery = query(
        qRef,
        where('category', '==', selectedCategory),
        where('approved', '==', true),
        limit(20)
      );
      const qSnapshot = await getDocs(qQuery);
      let selectedQuestions: Question[] = qSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Question))
        .sort(() => 0.5 - Math.random())
        .slice(0, 5);

      if (selectedQuestions.length === 0) {
        alert('এই বিভাগে কোনো প্রশ্ন পাওয়া যায়নি। অন্য বিভাগ চেষ্টা করুন।');
        setCreating(false);
        return;
      }

      const battleRef = await addDoc(collection(db, 'battles'), {
        creatorId: profile.uid,
        creatorName: profile.name,
        creatorPhoto: profile.photoURL || '',
        category: selectedCategory,
        categoryNameBn: category?.nameBn || '',
        stake: stake,
        status: 'waiting',
        questions: selectedQuestions,
        creatorScore: 0,
        opponentScore: 0,
        creatorCompleted: false,
        opponentCompleted: false,
        createdAt: serverTimestamp()
      });

      // Deduct coins from creator
      await updateDoc(doc(db, 'users', profile.uid), {
        coins: increment(-stake)
      });

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
      // Deduct coins from joiner
      await updateDoc(doc(db, 'users', profile.uid), {
        coins: increment(-battle.stake)
      });

      // Update battle status
      await updateDoc(doc(db, 'battles', battle.id), {
        opponentId: profile.uid,
        opponentName: profile.name,
        opponentPhoto: profile.photoURL || '',
        status: 'active'
      });

      navigate(`/battle/${battle.id}`);
    } catch (error) {
      console.error('Error joining battle:', error);
      alert('ব্যাটলে জয়েন করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header & Coins Stat */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100 shadow-sm">
            <Swords size={12} fill="currentColor" />
            ফ্রেন্ডস ব্যাটেল এরিনা
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">ব্যাটেলlobby</h1>
          <p className="text-sm text-gray-500 font-medium max-w-md leading-relaxed">
            অন্যান্য খেলোয়াড়দের সাথে ব্যাটেল করুন এবং পয়েন্ট অর্জন করে কয়েন জিতে নিন!
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-card px-6 py-4 rounded-[32px] flex items-center gap-3 border-amber-100 bg-amber-50/50">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
              <Coins size={20} fill="currentColor" />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1">আপনার কয়েন</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{formatNumber(profile?.coins || 0)}</p>
            </div>
          </div>
          <button 
            onClick={handleClaimCoins}
            disabled={claiming}
            className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all disabled:opacity-50"
            title="ফ্রি কয়েন নিন"
          >
            {claiming ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
          </button>
        </div>
      </header>

      {/* Action Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Battle Card */}
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 rounded-[40px] bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100 cursor-pointer group"
          onClick={() => setShowCreateModal(true)}
        >
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center mb-6 shadow-xl shadow-indigo-100 group-hover:rotate-6 transition-transform">
            <Plus size={32} strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">নতুন ব্যাটেল তৈরি করুন</h3>
          <p className="text-gray-500 font-medium mb-8">কয়েন বাজি ধরে আপনার পছন্দমতো বিভাগে নতুন একটি ব্যাটেল শুরু করুন।</p>
          <div className="flex items-center gap-2 text-indigo-600 font-black text-sm uppercase tracking-widest">
            <span>শুরু করতে ক্লিক করুন</span>
            <Zap size={16} fill="currentColor" className="animate-pulse" />
          </div>
        </motion.div>

        {/* Global Battles List */}
        <div className="glass-card rounded-[40px] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">অপেক্ষমাণ ব্যাটেল</h3>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট {formatNumber(battles.length)}টি</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] p-2 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">লবি লোড হচ্ছে...</p>
              </div>
            ) : battles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
                <Shield size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest">বর্তমানে কোনো ব্যাটেল নেই</p>
              </div>
            ) : (
              battles.map((battle) => (
                <div 
                  key={battle.id}
                  className="p-4 bg-white border border-gray-100 rounded-[28px] flex items-center justify-between group hover:border-indigo-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-gray-50 bg-gray-50 flex items-center justify-center">
                      {battle.creatorPhoto ? (
                        <img src={battle.creatorPhoto} alt={battle.creatorName} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={20} className="text-gray-300" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-sm truncate w-24 sm:w-auto">{battle.creatorName}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{battle.categoryNameBn}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-amber-600">
                        <Coins size={14} fill="currentColor" />
                        <span className="font-black text-sm">{formatNumber(battle.stake)}</span>
                      </div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">স্টেক</p>
                    </div>
                    <button 
                      onClick={() => handleJoinBattle(battle)}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-indigo-100 hover:scale-105 active:scale-95 transition-all"
                    >
                      জয়েন
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rules Section */}
      <section className="glass-card p-8 rounded-[40px] bg-red-50/30 border-red-100">
        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500" />
          ব্যাটেল এর নিয়মাবলী
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center font-black text-red-500 text-sm shrink-0">১</div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">ব্যাটেল শুরু করতে নির্দিষ্ট পরিমাণ কয়েন স্টেক হিসেবে জামা দিতে হবে।</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center font-black text-red-500 text-sm shrink-0">২</div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">দুইজন খেলোয়াড়কে একই ৫টি প্রশ্নের উত্তর দিতে হবে নির্দিষ্ট সময়ের মধ্যে।</p>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-white border border-red-100 flex items-center justify-center font-black text-red-500 text-sm shrink-0">৩</div>
            <p className="text-xs text-gray-600 font-medium leading-relaxed">যিনি বেশি সঠিক উত্তর দেবেন, তিনি স্টেক করা ও বোনাস কয়েনগুলো জিতে নিবেন।</p>
          </div>
        </div>
      </section>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[70] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl p-10 overflow-hidden relative"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-2">ব্যাটেল সেটআপ করুন</h2>
              <p className="text-gray-500 font-medium mb-8 text-sm">বিভাগ এবং স্টেক সিলেক্ট করে শুরু করুন।</p>

              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-3">
                  {[10, 20, 50, 100].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStake(s)}
                      className={cn(
                        "py-3 rounded-2xl font-black border-2 transition-all flex flex-col items-center justify-center gap-1",
                        stake === s 
                          ? "bg-amber-50 border-amber-500 text-amber-600 shadow-lg shadow-amber-100" 
                          : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-300"
                      )}
                    >
                      <Coins size={14} fill="currentColor" />
                      <span className="text-lg">{formatNumber(s)}</span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 grid grid-cols-2 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-2",
                        selectedCategory === cat.id 
                          ? "bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100" 
                          : "bg-gray-50 border-gray-50 hover:border-gray-200"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", cat.color)}>
                        <CategoryIcon icon={cat.icon} size={20} />
                      </div>
                      <span className="text-xs font-black text-gray-700">{cat.nameBn}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all"
                  >
                    বন্ধ করুন
                  </button>
                  <button 
                    onClick={handleCreateBattle}
                    disabled={creating || !selectedCategory}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                    ব্যাটেল শুরু করুন
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
