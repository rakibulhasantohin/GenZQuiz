import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactConfetti from 'react-confetti';
import { Trophy, Star, Zap, ArrowRight, RotateCcw, Home } from 'lucide-react';
import { formatNumber } from '../lib/utils';

const ResultPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { score, total, earnedXP, correctCount } = location.state || { score: 0, total: 0, earnedXP: 0, correctCount: 0 };

  useEffect(() => {
    if (!location.state) {
      navigate('/dashboard');
    }
  }, [location.state, navigate]);

  const accuracy = Math.round((correctCount / total) * 100) || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <ReactConfetti recycle={false} numberOfPieces={500} gravity={0.1} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-[48px] shadow-2xl shadow-gray-200/50 p-8 md:p-12 text-center"
      >
        <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-amber-100">
          <Trophy size={48} fill="currentColor" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">অসাধারণ খেলেছেন!</h1>
        <p className="text-xl text-gray-500 mb-12">আপনি কুইজটি সফলভাবে সম্পন্ন করেছেন।</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Star size={20} fill="currentColor" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">স্কোর</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(score)}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Zap size={20} fill="currentColor" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">অর্জিত XP</p>
            <p className="text-2xl font-bold text-gray-900">+{formatNumber(earnedXP)}</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-100">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Trophy size={20} fill="currentColor" />
            </div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">নির্ভুলতা</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(accuracy)}%</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/dashboard"
            className="flex-1 py-5 bg-indigo-600 text-white rounded-[28px] font-bold text-xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Home size={24} />
            ড্যাশবোর্ড
          </Link>
          <Link
            to="/categories"
            className="flex-1 py-5 bg-white border-2 border-gray-100 text-gray-700 rounded-[28px] font-bold text-xl flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"
          >
            <RotateCcw size={24} />
            আবার খেলুন
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultPage;
