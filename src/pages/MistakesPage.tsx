import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Mistake } from '../types';
import { formatNumber, cn } from '../lib/utils';
import { ArrowLeft, Trash2, Info, CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';

const MistakesPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);

  useEffect(() => {
    if (profile) {
      const fetchMistakes = async () => {
        try {
          const q = query(collection(db, 'mistakes'), where('userId', '==', profile.uid));
          const snapshot = await getDocs(q);
          setMistakes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mistake)));
        } catch (error) {
          console.error('Error fetching mistakes:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchMistakes();
    }
  }, [profile]);

  const removeMistake = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mistakes', id));
      setMistakes(prev => prev.filter(m => m.id !== id));
      if (selectedMistake?.id === id) setSelectedMistake(null);
    } catch (error) {
      console.error('Error removing mistake:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 px-6 pt-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-gray-600 transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">ভুল উত্তর রিভিউ</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মোট {formatNumber(mistakes.length)}টি ভুল উত্তর</p>
            </div>
          </div>
          {mistakes.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[10px] font-black uppercase tracking-widest">
              <Info size={12} />
              শিখুন ও সংশোধন করুন
            </div>
          )}
        </header>

        {mistakes.length === 0 ? (
          <div className="glass-card p-16 text-center rounded-[48px]">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow-emerald">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">চমৎকার!</h2>
            <p className="text-gray-500 font-medium mb-8">আপনার কোনো ভুল উত্তর রিভিউ করার নেই।</p>
            <button
              onClick={() => navigate('/categories')}
              className="btn-primary px-8 py-4"
            >
              নতুন কুইজ শুরু করুন
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* List */}
            <div className="lg:col-span-5 space-y-4">
              {mistakes.map((mistake) => (
                <motion.div
                  key={mistake.id}
                  layout
                  onClick={() => setSelectedMistake(mistake)}
                  className={cn(
                    "p-5 rounded-[28px] border-2 cursor-pointer transition-all group",
                    selectedMistake?.id === mistake.id 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" 
                      : "bg-white border-gray-100 hover:border-indigo-200"
                  )}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-bold line-clamp-2 leading-relaxed mb-2",
                        selectedMistake?.id === mistake.id ? "text-white" : "text-gray-900"
                      )}>
                        {mistake.questionText}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          selectedMistake?.id === mistake.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
                        )}>
                          {mistake.category}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} className={cn(
                      "shrink-0 transition-transform",
                      selectedMistake?.id === mistake.id ? "text-white rotate-90" : "text-gray-300 group-hover:translate-x-1"
                    )} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Detail */}
            <div className="lg:col-span-7">
              <AnimatePresence mode="wait">
                {selectedMistake ? (
                  <motion.div
                    key={selectedMistake.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="glass-card p-8 md:p-10 rounded-[40px] sticky top-10"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                          <BookOpen size={20} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">বিস্তারিত</h3>
                      </div>
                      <button
                        onClick={() => removeMistake(selectedMistake.id!)}
                        className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="রিমুভ করুন"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    <div className="space-y-8">
                      <div>
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">প্রশ্ন</h4>
                        <p className="text-xl font-black text-gray-900 leading-relaxed">{selectedMistake.questionText}</p>
                      </div>

                      <div className="p-6 rounded-3xl bg-emerald-50 border-2 border-emerald-100">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">সঠিক উত্তর</h4>
                        <p className="text-lg font-black text-emerald-900">{selectedMistake.correctAnswer}</p>
                      </div>

                      <div className="p-6 rounded-3xl bg-indigo-50 border-2 border-indigo-100">
                        <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">ব্যাখ্যা</h4>
                        <p className="text-base font-bold text-indigo-900 leading-relaxed">{selectedMistake.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-gray-200 rounded-[40px] text-gray-400">
                    <Info size={48} className="mb-4 opacity-20" />
                    <p className="font-bold">বাম পাশ থেকে একটি প্রশ্ন সিলেক্ট করুন</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MistakesPage;
