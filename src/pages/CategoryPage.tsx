import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, Play, DownloadCloud, CheckCircle2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../lib/utils';
import { offlineStorage } from '../services/offlineStorage';
import { useAuth } from '../AuthContext';
import CategoryIcon from '../components/CategoryIcon';

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

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-3 md:p-6 rounded-[20px] md:rounded-[32px] group card-hover flex flex-col"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 mb-3 md:mb-6 text-center md:text-left">
              <div className={`w-10 h-10 md:w-14 md:h-14 ${category.color} rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0`}>
                <div className="md:hidden">
                  <CategoryIcon icon={category.icon} size={18} />
                </div>
                <div className="hidden md:block">
                  <CategoryIcon icon={category.icon} size={24} />
                </div>
              </div>
              <div className="min-w-0 w-full">
                <h3 className="text-sm md:text-xl font-black text-gray-900 truncate">{category.nameBn}</h3>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-1 mt-0.5">
                  <p className="text-[7px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">
                    {formatNumber(categoryCounts[category.id] || category.questionCount || 10)}+ কুইজ
                  </p>
                  {cachedCategories.includes(category.id) && (
                    <div className="flex items-center gap-0.5 text-[6px] md:text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded-md">
                      <CheckCircle2 size={8} className="md:hidden" />
                      <CheckCircle2 size={10} className="hidden md:block" />
                      অফলাইন
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <p className="text-[10px] md:text-sm text-gray-500 font-medium mb-4 md:mb-8 leading-relaxed flex-1 line-clamp-2 md:line-clamp-none">
              {category.description}
            </p>

            <Link
              to={`/quiz/${category.id}`}
              className="w-full py-2 md:py-4 bg-gray-50 text-gray-700 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm flex items-center justify-center gap-1 md:gap-2 hover:bg-indigo-600 hover:text-white transition-all active:scale-95 shadow-sm group/btn"
            >
              শুরু করুন
              <ArrowRight size={14} className="md:hidden group-hover/btn:translate-x-1 transition-transform" />
              <ArrowRight size={18} className="hidden md:block group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
