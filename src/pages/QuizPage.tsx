import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { useCategories } from '../CategoryContext';
import { Question } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { formatNumber, cn } from '../lib/utils';
import { X, Clock, Zap, CheckCircle2, XCircle, Info, ArrowRight, WifiOff } from 'lucide-react';
import { offlineStorage } from '../services/offlineStorage';

const QuizPage: React.FC = () => {
  const { categoryId } = useParams();
  const { profile, isOnline } = useAuth();
  const { categories, categoryCounts, loading: categoriesLoading } = useCategories();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizEnded, setQuizEnded] = useState(false);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [isReviewPhase, setIsReviewPhase] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const fetchQuestions = useCallback(async () => {
    if (categoriesLoading) return;
    setLoading(true);
    try {
      // 1. Try to load from offline cache first if offline
      if (!navigator.onLine && categoryId) {
        const cached = await offlineStorage.getQuestions(categoryId);
        if (cached && cached.questions.length > 0) {
          setQuestions(cached.questions.sort(() => Math.random() - 0.5));
          setLoading(false);
          return;
        }
      }

      // 2. Fetch category settings for question count
      let limitCount = 10;
      const isDailyChallenge = categoryId === 'daily-challenge';
      
      if (isDailyChallenge) {
        limitCount = 15;
      } else {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
          limitCount = categoryCounts[category.id] || category.questionCount || 10;
        }
      }

      if (navigator.onLine) {
        let fetchedQuestions: Question[] = [];
        
        if (isDailyChallenge) {
          // Fetch questions from all categories
          const q = query(
            collection(db, 'questions'),
            where('approved', '==', true),
            limit(100) // Fetch a larger pool to randomize from
          );
          const snapshot = await getDocs(q);
          fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
          // Shuffle and pick 15
          fetchedQuestions = fetchedQuestions.sort(() => Math.random() - 0.5).slice(0, 15);
        } else {
          const q = query(
            collection(db, 'questions'),
            where('category', '==', categoryId),
            where('approved', '==', true),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);
          fetchedQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question));
        }
        
        if (fetchedQuestions.length === 0) {
          if (isDailyChallenge) {
            fetchedQuestions = MOCK_QUESTIONS.sort(() => Math.random() - 0.5).slice(0, 15) as unknown as Question[];
          } else {
            fetchedQuestions = MOCK_QUESTIONS.filter(q => q.category === categoryId) as unknown as Question[];
          }
        }
        
        // 3. Save to offline cache
        if (categoryId && fetchedQuestions.length > 0) {
          await offlineStorage.saveQuestions(categoryId, fetchedQuestions);
        }

        setQuestions(fetchedQuestions.sort(() => Math.random() - 0.5));
      } else {
        // Totally offline and no cache
        setQuestions(MOCK_QUESTIONS.filter(q => q.category === categoryId) as unknown as Question[]);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      // Fallback to cache if available even if online fetch failed
      if (categoryId) {
        const cached = await offlineStorage.getQuestions(categoryId);
        if (cached) {
          setQuestions(cached.questions.sort(() => Math.random() - 0.5));
          return;
        }
      }
      setQuestions(MOCK_QUESTIONS.filter(q => q.category === categoryId) as unknown as Question[]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, categories, categoryCounts, categoriesLoading]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered && !quizEnded && !isReviewPhase) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered && !isReviewPhase) {
      handleAnswer(null);
    }
  }, [timeLeft, isAnswered, quizEnded, isReviewPhase]);

  const handleAnswer = async (option: string | null) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      if (categoryId === 'daily-challenge') {
        // 500 points total for 15 questions = ~33.33 per question
        setScore(prev => prev + (500 / 15));
      } else {
        setScore(prev => prev + 10);
      }
    } else {
      // Track wrong question
      setWrongQuestions(prev => [...prev, currentQ]);
      
      // Save mistake to Firestore for dashboard notice
      if (profile) {
        try {
          await addDoc(collection(db, 'mistakes'), {
            userId: profile.uid,
            questionId: currentQ.id,
            questionText: currentQ.questionText,
            correctAnswer: currentQ.correctAnswer,
            explanation: currentQ.explanation,
            category: currentQ.category,
            createdAt: new Date().toISOString()
          });
        } catch (e) {
          console.error("Error saving mistake:", e);
        }
      }
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(30);
    } else {
      if (wrongQuestions.length > 0) {
        setIsReviewPhase(true);
        setQuizEnded(false);
      } else {
        finishQuiz();
      }
    }
  };

  const nextReviewQuestion = () => {
    if (reviewIndex < wrongQuestions.length - 1) {
      setReviewIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setQuizEnded(true);
    if (!profile) return;

    // Round the score for DB storage
    const finalScore = Math.round(score);
    const earnedXP = finalScore;

    if (!navigator.onLine) {
      // Save for later sync
      await offlineStorage.savePendingScore({
        categoryId: categoryId || 'unknown',
        score: finalScore,
        totalQuestions: questions.length,
        xpEarned: earnedXP,
        timestamp: Date.now(),
        userId: profile.uid,
      });
      alert('ইন্টারনেট কানেকশন নেই। আপনার স্কোর অফলাইনে সেভ করা হয়েছে এবং অনলাইনে আসলে অটোমেটিক সিঙ্ক হবে।');
      navigate('/result', { state: { score: finalScore, total: questions.length, earnedXP, isOffline: true } });
      return;
    }

    const totalPoints = profile.totalPoints + finalScore;
    const totalXP = profile.xp + earnedXP;
    const newLevel = Math.floor(Math.sqrt(totalXP / 100)) + 1;

    try {
      // Check achievements
      const newAchievements: string[] = [...(profile.achievements || [])];
      
      // 1. First Quiz
      if (!newAchievements.includes('first-quiz')) {
        newAchievements.push('first-quiz');
      }
      
      // 2. Perfect Score
      const isPerfectScore = categoryId === 'daily-challenge' 
        ? finalScore >= 500 
        : finalScore === questions.length * 10;

      if (isPerfectScore && questions.length > 0 && !newAchievements.includes('perfect-score')) {
        newAchievements.push('perfect-score');
      }
      
      // 3. Category specific (simplified check)
      if (categoryId === 'bangladesh-history' && !newAchievements.includes('history-buff')) {
        newAchievements.push('history-buff');
      }

      // Save session
      await addDoc(collection(db, 'quiz_sessions'), {
        userId: profile.uid,
        categoryId,
        score: finalScore,
        questionsAnswered: questions.length,
        correctCount: categoryId === 'daily-challenge' ? Math.round(finalScore / (500/15)) : finalScore / 10,
        wrongCount: questions.length - (categoryId === 'daily-challenge' ? Math.round(finalScore / (500/15)) : finalScore / 10),
        earnedXP,
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
      });

      // Update user profile
      const today = new Date().toLocaleDateString('en-CA');
      const isNewDay = profile.lastDailyUpdate !== today;
      
      const updateData: any = {
        totalPoints: increment(finalScore),
        xp: increment(earnedXP),
        level: newLevel,
        quizzesPlayed: increment(1),
        achievements: newAchievements,
        updatedAt: serverTimestamp(),
        lastDailyUpdate: today,
        dailyPoints: isNewDay ? finalScore : increment(finalScore),
      };

      if (categoryId === 'daily-challenge') {
        updateData.dailyChallengeCompletedAt = new Date().toISOString();
      }

      await updateDoc(doc(db, 'users', profile.uid), updateData);

      // Update leaderboard (Daily)
      await setDoc(doc(db, 'leaderboard', profile.uid), {
        userId: profile.uid,
        displayName: profile.name,
        avatar: profile.photoURL || '',
        dailyPoints: isNewDay ? finalScore : increment(finalScore),
        level: newLevel,
        lastDailyUpdate: today,
      }, { merge: true });

      navigate('/result', { state: { score: finalScore, total: questions.length, earnedXP } });
    } catch (error) {
      console.error('Error finishing quiz:', error);
      navigate('/result', { state: { score: finalScore, total: questions.length, earnedXP } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
          <Info size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">কোনো প্রশ্ন পাওয়া যায়নি</h2>
        <p className="text-gray-500 mb-8">এই বিভাগে বর্তমানে কোনো প্রশ্ন নেই। অনুগ্রহ করে অন্য বিভাগ চেষ্টা করুন।</p>
        <button
          onClick={() => navigate('/categories')}
          className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95"
        >
          বিভাগে ফিরে যান
        </button>
      </div>
    );
  }

  const currentQuestion = isReviewPhase ? wrongQuestions[reviewIndex] : questions[currentIndex];
  const progress = isReviewPhase 
    ? ((reviewIndex + 1) / wrongQuestions.length) * 100 
    : ((currentIndex + 1) / questions.length) * 100;

  if (isReviewPhase) {
    return (
      <div className="min-h-screen bg-gray-50/50 pb-20">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-6 py-5">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-red-600 font-black uppercase tracking-widest text-xs">
              <XCircle size={18} />
              ভুল উত্তর রিভিউ
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                <span>রিভিউ প্রগ্রেস</span>
                <span>{formatNumber(reviewIndex + 1)} / {formatNumber(wrongQuestions.length)}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50 shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                ></motion.div>
              </div>
            </div>
            
            <button
              onClick={finishQuiz}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
            >
              স্কিপ
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 pt-12">
          <motion.div
            key={`review-${reviewIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="glass-card p-10 rounded-[40px] border-red-100/50 bg-red-50/10">
              <h2 className="text-2xl font-black text-gray-900 mb-6">{currentQuestion.questionText}</h2>
              <div className="grid grid-cols-1 gap-3">
                {['A', 'B', 'C', 'D'].map(key => (
                  <div 
                    key={key}
                    className={cn(
                      "p-5 rounded-2xl border-2 font-bold",
                      key === currentQuestion.correctAnswer 
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                        : "bg-white border-gray-100 text-gray-400"
                    )}
                  >
                    {key}. {currentQuestion[`option${key}` as keyof Question] as string}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 rounded-[40px] border-indigo-100/50 bg-indigo-50/30 flex gap-6">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
                <Info size={28} />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">ব্যাখ্যা</h4>
                <p className="text-lg font-bold text-indigo-900 leading-relaxed">{currentQuestion.explanation}</p>
              </div>
            </div>

            <button
              onClick={nextReviewQuestion}
              className="btn-primary w-full py-6 text-xl flex items-center justify-center gap-4"
            >
              {reviewIndex === wrongQuestions.length - 1 ? 'ফিনিশ' : 'পরবর্তী ভুল উত্তর'}
              <ArrowRight size={24} />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-6">
          <button
            onClick={() => navigate('/categories')}
            className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl transition-all active:scale-90"
          >
            <X size={28} />
          </button>
          
          <div className="flex-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              <span>প্রগ্রেস</span>
              <span>{formatNumber(currentIndex + 1)} / {formatNumber(questions.length)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-50 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 50 }}
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]"
              ></motion.div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 shadow-sm">
            {!isOnline && <WifiOff size={16} className="text-amber-500" />}
            <Clock size={20} className="text-indigo-600" />
            <span className={cn(
              "text-xl font-black tabular-nums transition-colors",
              timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-600'
            )}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="space-y-10"
          >
            {/* Question Card */}
            <div className="glass-card p-10 md:p-16 rounded-[48px] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600/10"></div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors"></div>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-full mb-8 border border-indigo-100 shadow-sm">
                <Zap size={14} fill="currentColor" />
                প্রশ্ন {formatNumber(currentIndex + 1)}
              </div>
              
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-[1.4] tracking-tight">
                {currentQuestion.questionText}
              </h2>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 gap-5">
              {['A', 'B', 'C', 'D'].map((key, i) => {
                const optionText = currentQuestion[`option${key}` as keyof Question] as string;
                const isCorrect = key === currentQuestion.correctAnswer;
                const isSelected = key === selectedOption;
                
                let variantClass = "bg-white border-gray-100 text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30 hover:shadow-lg hover:-translate-y-0.5";
                if (isAnswered) {
                  if (isCorrect) variantClass = "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-glow-emerald ring-2 ring-emerald-500 ring-offset-4";
                  else if (isSelected) variantClass = "bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500 ring-offset-4";
                  else variantClass = "bg-white border-gray-100 text-gray-300 opacity-40 grayscale";
                }

                return (
                  <motion.button
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(key)}
                    className={cn(
                      "group flex items-center justify-between p-7 rounded-[32px] border-2 transition-all duration-300 text-left font-black text-xl shadow-sm",
                      variantClass
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 text-lg shadow-sm",
                        isAnswered && isCorrect ? 'bg-emerald-500 border-emerald-500 text-white' : 
                        isAnswered && isSelected ? 'bg-red-500 border-red-500 text-white' :
                        'bg-gray-50 border-gray-100 text-gray-400 group-hover:border-indigo-200 group-hover:text-indigo-600 group-hover:bg-white'
                      )}>
                        {key}
                      </div>
                      <span className="leading-tight">{optionText}</span>
                    </div>
                    <AnimatePresence>
                      {isAnswered && isCorrect && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                          <CheckCircle2 size={32} fill="currentColor" className="text-emerald-100" />
                        </motion.div>
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-red-500">
                          <XCircle size={32} fill="currentColor" className="text-red-100" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation & Next */}
            <AnimatePresence>
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="glass-card p-8 rounded-[40px] border-indigo-100/50 bg-indigo-50/30 flex gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                      <Info size={28} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">সঠিক উত্তর ও ব্যাখ্যা</h4>
                      <p className="text-xl font-bold text-indigo-900 leading-relaxed">{currentQuestion.explanation}</p>
                    </div>
                  </div>

                  <button
                    onClick={nextQuestion}
                    className="btn-primary w-full py-6 text-2xl shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group"
                  >
                    {currentIndex === questions.length - 1 ? 'ফলাফল দেখুন' : 'পরের প্রশ্ন'}
                    <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QuizPage;
