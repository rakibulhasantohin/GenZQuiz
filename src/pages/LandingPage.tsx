import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Brain, Trophy, Zap, Globe, ShieldCheck } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Hero Section */}
      <header className="relative pt-20 pb-32 md:pt-32 md:pb-48 px-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-6">
              <Zap size={16} />
              <span>বাংলাদেশের সেরা কুইজ প্ল্যাটফর্ম</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600">
              অসীম কুইজের জগতে <br /> আপনাকে স্বাগতম
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              সাধারণ জ্ঞান, ইসলামিক ইতিহাস, বাংলাদেশের ইতিহাস এবং আরও অনেক কিছু নিয়ে খেলুন আনলিমিটেড কুইজ। আপনার জ্ঞান বৃদ্ধি করুন এবং লিডারবোর্ডে শীর্ষে থাকুন।
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth"
                className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
              >
                এখনই শুরু করুন
              </Link>
              <Link
                to="/categories"
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all active:scale-95"
              >
                বিভাগ দেখুন
              </Link>
            </div>
          </motion.div>
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
