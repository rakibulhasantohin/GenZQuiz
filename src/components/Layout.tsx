import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Navbar from './Navbar';
import { ShieldAlert } from 'lucide-react';
import { auth } from '../firebase';

const Layout: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (profile?.isBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[32px] flex items-center justify-center mx-auto shadow-xl shadow-red-100">
            <ShieldAlert size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">আপনার অ্যাকাউন্ট ব্লক করা হয়েছে</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              দুঃখিত, নিয়ম ভঙ্গ করার কারণে আপনার অ্যাকাউন্টটি সাময়িকভাবে বা স্থায়ীভাবে ব্লক করা হয়েছে। বিস্তারিত জানতে এডমিনের সাথে যোগাযোগ করুন।
            </p>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all"
          >
            লগআউট করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="md:ml-64 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
