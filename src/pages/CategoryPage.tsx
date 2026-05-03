import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, Play, DownloadCloud, CheckCircle2
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber, cn } from '../lib/utils';
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

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((category, i) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-3 md:p-4 rounded-xl md:rounded-[28px] border border-gray-50 flex flex-col hover:border-indigo-100 transition-all shadow-sm group"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform", category.color)}>
                  <CategoryIcon icon={category.icon} size={18} />
              </div>
              <div className="min-w-0 w-full mb-1">
                <h3 className="text-xs md:text-sm font-black text-gray-900 truncate leading-tight tracking-tight">{category.nameBn}</h3>
                <p className="text-[7px] md:text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate mt-0.5">
                  {formatNumber(categoryCounts[category.id] || category.questionCount || 10)}+ কুইজ
                </p>
              </div>
            </div>
            
            <Link
              to={`/quiz/${category.id}`}
              className="mt-2 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg md:rounded-xl font-black text-[10px] flex items-center justify-center gap-1 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            >
              প্লে করুন
              <ArrowRight size={12} />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPage;
