import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Github } from 'lucide-react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Checking if account already exists with google
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (methods.length > 0 && !methods.includes('password')) {
             setError('এই ইমেইলটি দিয়ে ইতিমদ্ধেই একটি অ্যাকাউন্ট (যেমনঃ গুগল) আছে। দয়া করে গুগল দিয়ে লগইন করুন অথবা পাসওয়ার্ড রিসেট করে একটি পাসওয়ার্ড সেট করে নিন।');
             setLoading(false);
             return;
          }
        } catch (e) {
          // Ignore fetch errors
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Update profile with name
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: name
          });
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('এই ডোমেইনটি Firebase-এ অনুমোদিত নয়। দয়া করে Firebase Console-এ ডোমেইনটি যোগ করুন।');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('লগইন উইন্ডোটি বন্ধ করে দেওয়া হয়েছে।');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('এই ইমেইলটি দিয়ে ইতিমদ্ধেই অন্য মাধ্যমে (পাসওয়ার্ড) অ্যাকাউন্ট খোলা আছে। দয়া করে আগে পাসওয়ার্ড দিয়ে লগইন করুন।');
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] shadow-xl shadow-gray-200/50 p-8 md:p-10"
      >
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-lg shadow-indigo-200">
            IQ
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'আবার স্বাগতম!' : 'নতুন অ্যাকাউন্ট'}
          </h1>
          <p className="text-gray-500">
            {isLogin ? 'আপনার অ্যাকাউন্টে লগইন করুন' : 'কুইজ খেলা শুরু করতে রেজিস্ট্রেশন করুন'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="আপনার নাম"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
                required={!isLogin}
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="ইমেইল এড্রেস"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              placeholder="পাসওয়ার্ড"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'প্রসেসিং...' : isLogin ? 'লগইন করুন' : 'রেজিস্ট্রেশন করুন'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-400">অথবা</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full py-4 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition-all active:scale-95"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>গুগল দিয়ে লগইন</span>
        </button>

        <p className="mt-8 text-center text-gray-500">
          {isLogin ? 'অ্যাকাউন্ট নেই?' : 'ইতিমধ্যেই অ্যাকাউন্ট আছে?'}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-indigo-600 font-bold hover:underline"
          >
            {isLogin ? 'রেজিস্ট্রেশন করুন' : 'লগইন করুন'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
