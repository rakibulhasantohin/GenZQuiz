import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc, 
  serverTimestamp, query, where, orderBy, writeBatch, getDoc, setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { Question, Category } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { 
  Plus, Trash2, Check, X, Search, Database, Sparkles, 
  ShieldAlert, Filter, ChevronDown, CheckCircle2, 
  BarChart3, Users, User, BookOpen, Clock, MoreVertical,
  ThumbsUp, ThumbsDown, Eye
} from 'lucide-react';
import { formatNumber, cn } from '../lib/utils';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';

const AdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { categories, categoryCounts, updateCategoryCount, addCategory } = useCategories();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, approved, pending
  const [activeTab, setActiveTab] = useState<'questions' | 'categories'>('questions');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [localCategoryCounts, setLocalCategoryCounts] = useState<Record<string, number>>({});
  const [isSavingCounts, setIsSavingCounts] = useState(false);
  
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    category: 'general-knowledge',
    difficulty: 'easy',
    language: 'bn',
    approved: false
  });

  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: '',
    nameBn: '',
    description: '',
    icon: 'BookOpen',
    color: 'bg-indigo-600',
    questionCount: 10
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    type: 'single' | 'bulk';
    id?: string;
  }>({ show: false, type: 'single' });
  const [genCount, setGenCount] = useState(5);
  const [genCategory, setGenCategory] = useState('general-knowledge');
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (categoryCounts) {
      setLocalCategoryCounts(categoryCounts);
    }
  }, [categoryCounts]);

  const handleSaveCategoryCounts = async () => {
    setIsSavingCounts(true);
    try {
      // Update all counts in one go
      const docRef = doc(db, 'settings', 'categoryConfig');
      await setDoc(docRef, localCategoryCounts);
      alert('বিভাগ ভিত্তিক প্রশ্নের সংখ্যা আপডেট করা হয়েছে।');
    } catch (error) {
      console.error('Error saving category counts:', error);
      alert('আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsSavingCounts(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.nameBn) return;
    
    try {
      await addCategory(newCategory as Omit<Category, 'id'>);
      setShowAddCategoryForm(false);
      setNewCategory({
        name: '',
        nameBn: '',
        description: '',
        icon: 'BookOpen',
        color: 'bg-indigo-600',
        questionCount: 10
      });
      alert('নতুন বিভাগ যোগ করা হয়েছে।');
    } catch (error) {
      alert('বিভাগ যোগ করতে সমস্যা হয়েছে।');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        // Handle Firestore Timestamp if it exists
        let createdAt = d.createdAt;
        if (createdAt && typeof createdAt === 'object' && 'toDate' in createdAt) {
          createdAt = createdAt.toDate().toISOString();
        }
        return { id: doc.id, ...d, createdAt } as Question;
      });
      setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'questions'), {
        ...newQuestion,
        createdAt: new Date().toISOString(),
        sourceType: 'manual',
        approved: true // Manual additions are approved by default
      });
      setShowAddForm(false);
      setNewQuestion({
        questionText: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctAnswer: 'A',
        explanation: '',
        category: 'general-knowledge',
        difficulty: 'easy',
        language: 'bn',
        approved: false
      });
      fetchQuestions();
      alert('নতুন প্রশ্ন সফলভাবে যুক্ত হয়েছে।');
    } catch (error: any) {
      console.error('Error adding question:', error);
      alert(`প্রশ্ন যুক্ত করতে সমস্যা হয়েছে: ${error.message || 'অজানা সমস্যা'}`);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await updateDoc(doc(db, 'questions', id), { approved: true });
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, approved: true } : q));
    } catch (error) {
      console.error('Error approving question:', error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedQuestions.length === 0) return;
    setIsBulkLoading(true);
    try {
      // Chunking for Firestore batch limit (500)
      const chunks = [];
      for (let i = 0; i < selectedQuestions.length; i += 500) {
        chunks.push(selectedQuestions.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.update(doc(db, 'questions', id), { approved: true });
        });
        await batch.commit();
      }

      setQuestions(prev => prev.map(q => selectedQuestions.includes(q.id) ? { ...q, approved: true } : q));
      setSelectedQuestions([]);
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('অনুমোদন করতে সমস্যা হয়েছে।');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    setIsBulkLoading(true);
    try {
      // Chunking for Firestore batch limit (500)
      const chunks = [];
      for (let i = 0; i < selectedQuestions.length; i += 500) {
        chunks.push(selectedQuestions.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'questions', id));
        });
        await batch.commit();
      }

      setQuestions(prev => prev.filter(q => !selectedQuestions.includes(q.id)));
      setSelectedQuestions([]);
      setDeleteConfirm({ show: false, type: 'bulk' });
    } catch (error) {
      console.error('Error bulk deleting:', error);
      alert('মুছে ফেলতে সমস্যা হয়েছে।');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'questions', id));
      setQuestions(prev => prev.filter(q => q.id !== id));
      setDeleteConfirm({ show: false, type: 'single' });
    } catch (error) {
      console.error('Error deleting question:', error);
    }
  };

  const handleGenerateAI = async () => {
    if (genCount < 1 || genCount > 120) {
      alert('দয়া করে ১ থেকে ১২০ এর মধ্যে সংখ্যা দিন।');
      return;
    }
    setIsGenerating(true);
    setBulkProgress(0);
    try {
      const { generateQuizQuestions } = await import('../services/geminiService');
      const cat = genCategory;
      
      const batchSize = 10;
      const totalBatches = Math.ceil(genCount / batchSize);
      let totalGenerated = 0;

      for (let i = 0; i < totalBatches; i++) {
        const currentBatchSize = Math.min(batchSize, genCount - totalGenerated);
        const generated = await generateQuizQuestions(cat, currentBatchSize);
        
        if (generated && generated.length > 0) {
          const batch = writeBatch(db);
          generated.forEach(q => {
            const newDocRef = doc(collection(db, 'questions'));
            batch.set(newDocRef, {
              ...q,
              approved: true,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
          totalGenerated += generated.length;
          setBulkProgress(Math.round((totalGenerated / genCount) * 100));
        } else if (totalBatches === 1) {
          // If only one batch and it failed to return anything
          throw new Error('এআই কোনো প্রশ্ন জেনারেট করতে পারেনি।');
        }
      }
      
      if (totalGenerated === 0) {
        alert('কোনো প্রশ্ন জেনারেট করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।');
      } else {
        alert(`${totalGenerated}টি এআই প্রশ্ন যুক্ত হয়েছে।`);
      }
      fetchQuestions();
    } catch (error: any) {
      console.error('Error generating AI questions:', error);
      alert(`এআই জেনারেট করতে সমস্যা হয়েছে: ${error.message || 'আবার চেষ্টা করুন'}`);
    } finally {
      setIsGenerating(false);
      setBulkProgress(0);
    }
  };

  const seedMockData = async () => {
    if (!window.confirm('ডেমো ডাটা যুক্ত করতে চান?')) return;
    try {
      for (const q of MOCK_QUESTIONS) {
        await addDoc(collection(db, 'questions'), {
          ...q,
          createdAt: new Date().toISOString(),
          sourceType: 'manual',
          approved: true
        });
      }
      fetchQuestions();
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.questionText.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || q.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'approved' && q.approved) || 
                           (filterStatus === 'pending' && !q.approved);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [questions, searchQuery, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const total = questions.length;
    const approved = questions.filter(q => q.approved).length;
    const pending = total - approved;
    const aiGenerated = questions.filter(q => q.sourceType === 'ai').length;
    
    // Category distribution
    const categoryData = categories.map(cat => ({
      name: cat.nameBn,
      value: questions.filter(q => q.category === cat.id).length
    })).filter(d => d.value > 0);

    // Difficulty distribution
    const difficultyData = [
      { name: 'সহজ', value: questions.filter(q => q.difficulty === 'easy').length, color: '#10b981' },
      { name: 'মাঝারি', value: questions.filter(q => q.difficulty === 'medium').length, color: '#f59e0b' },
      { name: 'কঠিন', value: questions.filter(q => q.difficulty === 'hard').length, color: '#ef4444' },
    ];

    return { total, approved, pending, aiGenerated, categoryData, difficultyData };
  }, [questions]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-red-100">
            <ShieldAlert size={48} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">অ্যাক্সেস ডিনাইড</h1>
          <p className="text-xl text-gray-500 max-w-md mx-auto">আপনার এই পেজটি দেখার অনুমতি নেই। শুধুমাত্র এডমিনরা এখানে প্রবেশ করতে পারেন।</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">এডমিন ড্যাশবোর্ড</h1>
          <p className="text-lg text-gray-500 font-medium">প্ল্যাটফর্মের কন্টেন্ট এবং ইউজার অ্যাক্টিভিটি ম্যানেজ করুন।</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-2xl px-4 py-2 shadow-sm">
            <Sparkles size={16} className="text-indigo-600" />
            <input 
              type="number" 
              min="1" 
              max="120" 
              value={genCount} 
              onChange={(e) => setGenCount(parseInt(e.target.value) || 1)}
              className="w-12 text-center font-black text-indigo-600 bg-transparent border-none focus:ring-0"
            />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">প্রশ্ন</span>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-gray-100 rounded-2xl px-4 py-2 shadow-sm">
            <BookOpen size={16} className="text-indigo-600" />
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="bg-transparent border-none focus:ring-0 font-bold text-indigo-600 text-sm cursor-pointer"
            >
              {categories.map(c => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
            </select>
          </div>
          <div className="relative">
            <button onClick={handleGenerateAI} disabled={isGenerating} className="btn-secondary flex items-center gap-2 text-indigo-600 border-indigo-100 bg-indigo-50/50 min-w-[140px]">
              <Sparkles size={20} className={isGenerating ? 'animate-spin' : ''} />
              {isGenerating ? `${bulkProgress}% জেনারেট হচ্ছে...` : 'এআই জেনারেট'}
            </button>
            {isGenerating && (
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${bulkProgress}%` }}
                  className="h-full bg-indigo-600"
                />
              </div>
            )}
          </div>
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            নতুন প্রশ্ন
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'মোট প্রশ্ন', value: stats.total, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'অনুমোদিত', value: stats.approved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'অপেক্ষমান', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'AI জেনারেটেড', value: stats.aiGenerated, icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-4 rounded-[24px] flex items-center gap-3"
          >
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{stat.label}</p>
              <p className="text-lg font-black text-gray-900">{formatNumber(stat.value)}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 rounded-[32px]"
        >
          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-600" />
            বিভাগ ভিত্তিক বিশ্লেষণ
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 rounded-[32px]"
        >
          <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" />
            কঠিনতার মাত্রা বিশ্লেষণ
          </h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.difficultyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#64748b', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 'bold', fill: '#64748b', fontSize: 10 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {stats.difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Filters & Actions */}
      <div className="flex bg-gray-100 p-1 rounded-2xl w-fit mb-6">
        <button
          onClick={() => setActiveTab('questions')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'questions' ? "bg-white text-indigo-600 shadow-md" : "text-gray-500 hover:text-gray-700"
          )}
        >
          প্রশ্ন ম্যানেজমেন্ট
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            "px-6 py-3 rounded-xl font-black text-sm transition-all",
            activeTab === 'categories' ? "bg-white text-indigo-600 shadow-md" : "text-gray-500 hover:text-gray-700"
          )}
        >
          বিভাগ সেটিংস
        </button>
      </div>

      {activeTab === 'questions' ? (
        <>
          <div className="glass-card p-4 rounded-[24px] space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Filter size={14} className="text-indigo-600" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ফিল্টার ও সার্চ</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="প্রশ্ন খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">বিভাগ</span>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full sm:w-40 px-4 py-3 bg-gray-50 border-none rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer text-sm"
                  >
                    <option value="all">সব বিভাগ</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">স্ট্যাটাস</span>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'সব' },
                      { id: 'approved', label: 'অনুমোদিত' },
                      { id: 'pending', label: 'পেন্ডিং' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        className={cn(
                          "px-4 py-2 rounded-lg font-bold text-xs transition-all",
                          filterStatus === tab.id 
                            ? "bg-white text-indigo-600 shadow-sm" 
                            : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {selectedQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between p-2.5 bg-indigo-600 rounded-2xl text-white gap-3 shadow-lg border border-white/10"
              >
                <div className="flex items-center gap-2.5 px-2">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                    <CheckCircle2 size={14} />
                  </div>
                  <span className="text-xs font-black tracking-tight">{formatNumber(selectedQuestions.length)}টি সিলেক্টেড</span>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button 
                    onClick={handleBulkApprove} 
                    disabled={isBulkLoading}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider"
                  >
                    <Check size={14} /> অনুমোদন
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ show: true, type: 'bulk' })} 
                    disabled={isBulkLoading}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wider"
                  >
                    <Trash2 size={14} /> ডিলিট
                  </button>
                  <button 
                    onClick={() => setSelectedQuestions([])} 
                    disabled={isBulkLoading}
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-xl font-bold transition-all text-[10px] uppercase tracking-wider"
                  >
                    বাতিল
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="glass-card rounded-[40px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-8 py-6 w-12">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={(e) => {
                          if (e.target.checked) setSelectedQuestions(filteredQuestions.map(q => q.id));
                          else setSelectedQuestions([]);
                        }}
                        checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                      />
                    </th>
                    <th className="px-6 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">প্রশ্ন ও ব্যাখ্যা</th>
                    <th className="px-6 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">বিভাগ ও সোর্স</th>
                    <th className="px-6 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">স্ট্যাটাস</th>
                    <th className="px-6 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-500 font-medium">লোড হচ্ছে...</p>
                      </td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                          <Search size={40} />
                        </div>
                        <p className="text-xl font-bold text-gray-900 mb-2">কোনো প্রশ্ন পাওয়া যায়নি</p>
                        <p className="text-gray-500">আপনার সার্চ বা ফিল্টার পরিবর্তন করে দেখুন।</p>
                      </td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q) => (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-all group">
                        <td className="px-8 py-6">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            checked={selectedQuestions.includes(q.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedQuestions([...selectedQuestions, q.id]);
                              else setSelectedQuestions(selectedQuestions.filter(id => id !== q.id));
                            }}
                          />
                        </td>
                        <td className="px-6 py-6 max-w-xl">
                          <div className="space-y-2">
                            <p className="font-bold text-gray-900 text-base leading-snug">{q.questionText}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {['A', 'B', 'C', 'D'].map(opt => (
                                <span key={opt} className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${q.correctAnswer === opt ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {opt}: {q[`option${opt}` as keyof Question] as string}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 italic line-clamp-1">ব্যাখ্যা: {q.explanation}</p>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="space-y-2">
                            <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                              {categories.find(c => c.id === q.category)?.nameBn || q.category}
                            </span>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                              {q.sourceType === 'ai' ? <Sparkles size={12} className="text-purple-500" /> : <User size={12} />}
                              {q.sourceType === 'ai' ? 'এআই জেনারেটেড' : 'ম্যানুয়াল'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {q.approved ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100">
                              <CheckCircle2 size={12} /> অনুমোদিত
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-600 text-xs font-bold rounded-full border border-amber-100">
                              <Clock size={12} /> পেন্ডিং
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!q.approved && (
                              <button
                                onClick={() => handleApprove(q.id)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="অনুমোদন করুন"
                              >
                                <ThumbsUp size={20} />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteConfirm({ show: true, type: 'single', id: q.id })}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-[40px]"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900">বিভাগ ভিত্তিক প্রশ্নের সংখ্যা</h2>
                <p className="text-gray-500 font-medium">প্রতিটি বিভাগে কুইজ খেলার সময় কয়টি প্রশ্ন থাকবে তা নির্ধারণ করুন।</p>
              </div>
              <button
                onClick={handleSaveCategoryCounts}
                disabled={isSavingCounts}
                className="btn-primary flex items-center gap-2"
              >
                <Check size={20} />
                {isSavingCounts ? 'সেভ হচ্ছে...' : 'পরিবর্তন সেভ করুন'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="p-6 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${cat.color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900">{cat.nameBn}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{cat.id}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">প্রশ্নের সংখ্যা</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={localCategoryCounts[cat.id] || 10}
                        onChange={(e) => setLocalCategoryCounts({
                          ...localCategoryCounts,
                          [cat.id]: parseInt(e.target.value) || 1
                        })}
                        className="flex-1 p-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-indigo-600 text-center text-xl"
                      />
                      <span className="text-gray-400 font-bold">টি</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 rounded-[40px]"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900">নতুন বিভাগ যোগ করুন</h2>
                <p className="text-gray-500 font-medium">আপনার কুইজ অ্যাপে নতুন একটি বিভাগ তৈরি করুন।</p>
              </div>
              <button
                onClick={() => setShowAddCategoryForm(!showAddCategoryForm)}
                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-all"
              >
                {showAddCategoryForm ? <X size={24} /> : <Plus size={24} />}
              </button>
            </div>

            <AnimatePresence>
              {showAddCategoryForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddCategory}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">বিভাগের নাম (English)</label>
                      <input
                        type="text"
                        required
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="e.g. Sports"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">বিভাগের নাম (বাংলা)</label>
                      <input
                        type="text"
                        required
                        value={newCategory.nameBn}
                        onChange={(e) => setNewCategory({ ...newCategory, nameBn: e.target.value })}
                        placeholder="যেমন: খেলাধুলা"
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">বিবরণ</label>
                    <textarea
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      placeholder="বিভাগ সম্পর্কে কিছু লিখুন..."
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">রঙ (Tailwind Class)</label>
                      <select
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        <option value="bg-blue-500">Blue</option>
                        <option value="bg-emerald-600">Emerald</option>
                        <option value="bg-red-600">Red</option>
                        <option value="bg-purple-600">Purple</option>
                        <option value="bg-amber-600">Amber</option>
                        <option value="bg-indigo-600">Indigo</option>
                        <option value="bg-pink-600">Pink</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">প্রশ্নের সংখ্যা (Default)</label>
                      <input
                        type="number"
                        value={newCategory.questionCount}
                        onChange={(e) => setNewCategory({ ...newCategory, questionCount: parseInt(e.target.value) || 10 })}
                        className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                      >
                        <Plus size={20} />
                        বিভাগ তৈরি করুন
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Add Question Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[48px] shadow-2xl p-10 max-h-[90vh] overflow-y-auto border border-white/20"
            >
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight">নতুন প্রশ্ন</h2>
                  <p className="text-gray-500 font-medium">ডাটাবেসে ম্যানুয়ালি প্রশ্ন যুক্ত করুন।</p>
                </div>
                <button onClick={() => setShowAddForm(false)} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:bg-gray-100 rounded-2xl transition-all">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleAddQuestion} className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">প্রশ্ন টেক্সট</label>
                  <textarea
                    className="w-full p-6 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 text-lg font-medium leading-relaxed"
                    rows={3}
                    placeholder="আপনার প্রশ্নটি এখানে লিখুন..."
                    value={newQuestion.questionText}
                    onChange={e => setNewQuestion({...newQuestion, questionText: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <div key={opt} className="space-y-3">
                      <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">অপশন {opt}</label>
                      <input
                        className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                        placeholder={`অপশন ${opt} লিখুন`}
                        value={newQuestion[`option${opt}` as keyof Question] as string}
                        onChange={e => setNewQuestion({...newQuestion, [`option${opt}`]: e.target.value})}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">সঠিক উত্তর</label>
                    <select
                      className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer"
                      value={newQuestion.correctAnswer}
                      onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value as any})}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">বিভাগ</label>
                    <select
                      className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer"
                      value={newQuestion.category}
                      onChange={e => setNewQuestion({...newQuestion, category: e.target.value})}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nameBn}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">কঠিনতা</label>
                    <select
                      className="w-full p-5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer"
                      value={newQuestion.difficulty}
                      onChange={e => setNewQuestion({...newQuestion, difficulty: e.target.value as any})}
                    >
                      <option value="easy">সহজ</option>
                      <option value="medium">মাঝারি</option>
                      <option value="hard">কঠিন</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-black text-gray-400 uppercase tracking-widest">ব্যাখ্যা</label>
                  <textarea
                    className="w-full p-6 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-indigo-500 font-medium"
                    rows={2}
                    placeholder="সঠিক উত্তরের ব্যাখ্যা লিখুন..."
                    value={newQuestion.explanation}
                    onChange={e => setNewQuestion({...newQuestion, explanation: e.target.value})}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-6 text-xl shadow-2xl shadow-indigo-200 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={24} />
                  প্রশ্নটি সংরক্ষণ করুন
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 text-center border border-gray-100"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-gray-500 mb-8 font-medium">
                {deleteConfirm.type === 'bulk' 
                  ? `আপনি কি নির্বাচিত ${formatNumber(selectedQuestions.length)}টি প্রশ্ন মুছে ফেলতে চান?`
                  : 'আপনি কি এই প্রশ্নটি মুছে ফেলতে চান?'}
                <br />
                <span className="text-red-500 text-sm font-bold mt-2 block">এই কাজটি আর ফিরিয়ে আনা যাবে না।</span>
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirm({ show: false, type: 'single' })}
                  className="py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black transition-all"
                >
                  বাতিল
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.type === 'bulk') handleBulkDelete();
                    else if (deleteConfirm.id) handleDeleteQuestion(deleteConfirm.id);
                  }}
                  className="py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black shadow-lg shadow-red-100 transition-all"
                >
                  হ্যাঁ, ডিলিট করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
