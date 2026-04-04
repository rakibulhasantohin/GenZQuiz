import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Play, DownloadCloud, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../lib/utils';
import { offlineStorage } from '../services/offlineStorage';
import { useAuth } from '../AuthContext';

import { useCategories } from '../CategoryContext';

const CategoryPage: React.FC = () => {
  const { isOnline } = useAuth();
  const { categories, categoryCounts, loading: categoriesLoading } = useCategories();
  const [cachedCategories, setCachedCategories] = useState<string[]>([]);

  useEffect(() => {
    const checkCache = async () => {
      try {
        // Check cache
        const cached = [];
        for (const cat of categories) {
          const data = await offlineStorage.getQuestions(cat.id);
          if (data && data.questions.length > 0) {
            cached.push(cat.id);
          }
        }
        setCachedCategories(cached);
      } catch (e) {
        console.error("Error checking cache:", e);
      }
    };
    if (!categoriesLoading) {
      checkCache();
    }
  }, [categories, categoriesLoading]);

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="space-y-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">কুইজ বিভাগসমূহ</h1>
        <p className="text-sm text-gray-500 font-medium max-w-md leading-relaxed">
          আপনার প্রিয় বিভাগটি বেছে নিন এবং কুইজ শুরু করুন।
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-[32px] group card-hover flex flex-col"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                <Play size={24} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">{category.nameBn}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    {formatNumber(categoryCounts[category.id] || category.questionCount || 10)}+ কুইজ উপলব্ধ
                  </p>
                  {cachedCategories.includes(category.id) && (
                    <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      <CheckCircle2 size={10} />
                      অফলাইন
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed flex-1">
              {category.description}
            </p>

            <Link
              to={`/quiz/${category.id}`}
              className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm group/btn"
            >
              শুরু করুন
              <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
