import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Brain, Trophy, Zap, Globe, ShieldCheck } from 'lucide-react';
import { useAuth } from '../AuthContext';

const LandingPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#fcfdfc] text-gray-900 overflow-hidden relative">
      {/* Rickshaw Art Inspired Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="banglaPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 5L95 95H5L50 5Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M0 50H100M50 0V100" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#banglaPattern)" />
        </svg>
      </div>

      {/* Decorative Circles (Flag Colors) */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#006a4e] rounded-full blur-[120px] opacity-[0.07] -z-10"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-[#f42a41] rounded-full blur-[100px] opacity-[0.05] -z-10"></div>

      {/* National Monument Silhouette (Subtle) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl opacity-[0.03] pointer-events-none -z-10">
        <svg viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M400 0L450 400H350L400 0Z" fill="currentColor" />
          <path d="M400 50L520 400H280L400 50Z" fill="currentColor" />
          <path d="M400 100L600 400H200L400 100Z" fill="currentColor" />
          <path d="M400 150L700 400H100L400 150Z" fill="currentColor" />
        </svg>
      </div>

      {/* Hero Section */}
      <header className="relative pt-16 pb-24 md:pt-28 md:pb-40 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest mb-8 border border-emerald-100 shadow-sm">
              <Globe size={14} className="animate-pulse" />
              <span>বাংলাদেশের ১ নম্বর কুইজ প্ল্যাটফর্ম</span>
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
              <span className="text-gray-900">জানুন</span> <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#006a4e] via-[#00843d] to-[#f42a41]">
                নিজের দেশকে
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
              বাংলাদেশের ইতিহাস, ঐতিহ্য এবং সাধারণ জ্ঞান নিয়ে সাজানো আমাদের এই কুইজ জগত। নিজেকে যাচাই করুন এবং হয়ে উঠুন কুইজ মাস্টার!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link
                to={user ? "/quiz/daily-challenge" : "/auth"}
                className="group relative w-full sm:w-auto px-10 py-5 bg-[#006a4e] text-white rounded-[24px] font-black text-xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-200"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative flex items-center justify-center gap-2">
                  শুরু করুন
                  <Zap size={20} fill="currentColor" />
                </span>
              </Link>
              
              <Link
                to="/categories"
                className="w-full sm:w-auto px-10 py-5 bg-white text-gray-700 border-2 border-gray-100 rounded-[24px] font-black text-xl hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                বিভাগ দেখুন
                <Brain size={20} />
              </Link>
            </div>
          </motion.div>

          {/* Floating Graphics / Icons */}
          <div className="mt-20 relative h-24 hidden md:block">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-[10%] top-0 p-4 bg-white rounded-2xl shadow-xl border border-gray-50"
            >
              <Trophy className="text-amber-500" size={32} fill="currentColor" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute right-[15%] top-4 p-4 bg-white rounded-2xl shadow-xl border border-gray-50"
            >
              <Brain className="text-indigo-500" size={32} />
            </motion.div>
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 -translate-x-1/2 top-10 p-3 bg-emerald-50 rounded-full border border-emerald-100"
            >
              <div className="w-4 h-4 bg-[#f42a41] rounded-full"></div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-24 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: 'অফুরন্ত প্রশ্ন',
                desc: 'আমাদের ডাটাবেসে হাজার হাজার প্রশ্ন রয়েছে যা আপনাকে কখনো বিরক্ত হতে দেবে না।',
                color: 'text-blue-600',
                bg: 'bg-blue-50'
              },
              {
                icon: Trophy,
                title: 'লিডারবোর্ড',
                desc: 'সারা দেশের কুইজ প্রেমীদের সাথে প্রতিযোগিতা করুন এবং আপনার দক্ষতা প্রমাণ করুন।',
                color: 'text-amber-600',
                bg: 'bg-amber-50'
              },
              {
                icon: ShieldCheck,
                title: 'নির্ভুল তথ্য',
                desc: 'প্রতিটি প্রশ্নের উত্তর এবং ব্যাখ্যা বিশেষজ্ঞ দ্বারা যাচাইকৃত।',
                color: 'text-emerald-600',
                bg: 'bg-emerald-50'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-8 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon size={28} />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100 text-center">
        <p className="text-gray-500">© ২০২৬ GenZQuiz. সর্বস্বত্ব সংরক্ষিত।</p>
      </footer>
    </div>
  );
};

export default LandingPage;
