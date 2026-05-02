import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Battle, Question } from '../types';
import { Swords, Trophy, Users, Star, Timer, CheckCircle2, XCircle, Loader2, Home, Coins, ArrowRight, Zap } from 'lucide-react';
import { formatNumber, cn } from '../lib/utils';

const BattleArena: React.FC = () => {
  const { battleId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);

  const isCreator = battle?.creatorId === profile?.uid;

  useEffect(() => {
    if (!battleId || !profile) return;

    const unsubscribe = onSnapshot(doc(db, 'battles', battleId), (doc) => {
      if (doc.exists()) {
        setBattle({ id: doc.id, ...doc.data() } as Battle);
        setLoading(false);
      } else {
        alert('ব্যাটলটি পাওয়া যায়নি।');
        navigate('/battle');
      }
    });

    return () => unsubscribe();
  }, [battleId, profile]);

  const handleFinish = useCallback(async () => {
    if (!battle || !profile) return;
    setGameOver(true);

    try {
      const field = isCreator ? 'creatorScore' : 'opponentScore';
      const statusField = isCreator ? 'creatorCompleted' : 'opponentCompleted';
      
      const updateData: any = {
        [field]: score,
        [statusField]: true
      };

      // Check if this completes the battle for the second person
      const otherCompleted = isCreator ? battle.opponentCompleted : battle.creatorCompleted;
      
      if (otherCompleted) {
        updateData.status = 'completed';
        
        // Calculate winner
        const myScore = score;
        const otherScore = isCreator ? battle.opponentScore : battle.creatorScore;
        
        let winnerId: string | 'draw' = 'draw';
        if (myScore > otherScore) winnerId = profile.uid;
        else if (otherScore > myScore) winnerId = isCreator ? (battle.opponentId || '') : battle.creatorId;
        
        updateData.winnerId = winnerId;
      }

      await updateDoc(doc(db, 'battles', battle.id), updateData);
    } catch (error) {
      console.error('Error completing battle:', error);
    }
  }, [battle, profile, score, isCreator]);

  // Effect to award prizes when battle is completed
  useEffect(() => {
    if (!battle || !profile || battle.status !== 'completed') return;

    const claimKey = isCreator ? 'creatorPrizeAwarded' : 'opponentPrizeAwarded';
    if (battle[claimKey as keyof Battle]) return;

    const awardPrize = async () => {
      try {
        const isWinner = battle.winnerId === profile.uid;
        const isDraw = battle.winnerId === 'draw';
        
        let coinsToAward = 0;
        if (isWinner) coinsToAward = battle.stake * 2;
        else if (isDraw) coinsToAward = battle.stake;

        if (coinsToAward > 0) {
          // Update own coins
          await updateDoc(doc(db, 'users', profile.uid), {
            coins: increment(coinsToAward)
          });
        }

        // Mark prize as awarded in the battle doc so we don't repeat this
        await updateDoc(doc(db, 'battles', battle.id), {
          [claimKey]: true
        });
      } catch (error) {
        console.error('Error awarding prize:', error);
      }
    };

    awardPrize();
  }, [battle?.status, battle?.winnerId, profile?.uid, battle?.id]);

  useEffect(() => {
    if (gameOver || !battle || battle.status !== 'active') return;
    
    // Check if current user already completed it (e.g., on refresh)
    const alreadyDone = isCreator ? battle.creatorCompleted : battle.opponentCompleted;
    if (alreadyDone) {
      setGameOver(true);
      return;
    }

    if (timeLeft === 0) {
      handleAnswer(''); // Skip if time up
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameOver, battle, isCreator, handleFinish]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return;
    
    const currentQuestion = battle?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setSelectedAnswer(answer);
    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    if (correct) setScore(prev => prev + 1);

    setTimeout(() => {
      if (currentQuestionIndex < (battle?.questions.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimeLeft(15);
      } else {
        handleFinish();
      }
    }, 1000);
  };

  if (loading || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-black uppercase tracking-widest text-xs">ব্যাটল এরিনা লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  // Waiting for Opponent
  if (battle.status === 'waiting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="relative">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-32 h-32 bg-indigo-600 text-white rounded-[40px] flex items-center justify-center shadow-2xl relative z-10"
          >
            <Swords size={64} />
          </motion.div>
          <div className="absolute inset-0 bg-indigo-600 rounded-[40px] blur-3xl opacity-20 animate-pulse"></div>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-black text-gray-900">প্রতিপক্ষের জন্য অপেক্ষা করুন...</h2>
          <p className="text-gray-500 font-medium max-w-sm">ব্যাটল শুরু করার জন্য কাউকে এই ব্যাটলে জয়েন করতে হবে। আপনার স্টেক: {formatNumber(battle.stake)} কয়েন।</p>
        </div>

        <div className="glass-card p-6 rounded-[32px] w-full max-w-md flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200">
            <Users size={24} />
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              style={{ width: '100%' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              className="h-full bg-indigo-600 rounded-full"
            />
          </div>
        </div>

        <button 
          onClick={() => navigate('/battle')}
          className="btn-secondary px-8 flex items-center gap-2"
        >
          <Home size={18} />
          লবিতে ফিরে যান
        </button>
      </div>
    );
  }

  // Active Gameplay
  if (battle.status === 'active' && !gameOver) {
    const currentQuestion = battle.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / battle.questions.length) * 100;

    return (
      <div className="min-h-screen py-10 flex flex-col">
        {/* Top Header Stats */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 glass-card px-4 py-2 rounded-2xl group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Zap size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">আপনার স্কোর</p>
              <p className="text-lg font-black text-gray-900 leading-none">{formatNumber(score)}</p>
            </div>
          </div>

          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden relative">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.3)]"
            />
          </div>

          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2",
            timeLeft <= 5 ? "bg-red-50 border-red-200 text-red-600 animate-pulse" : "bg-white border-gray-100 text-indigo-600"
          )}>
            {timeLeft}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex flex-col justify-center">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-8 md:p-12 rounded-[48px] shadow-2xl shadow-indigo-100/50 mb-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-4">প্রশ্ন {formatNumber(currentQuestionIndex + 1)} / {formatNumber(battle.questions.length)}</p>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-0">
              {currentQuestion.questionText}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((key) => {
              const optionText = currentQuestion[`option${key}` as keyof Question];
              const isSelected = selectedAnswer === key;
              const isCorrectOpt = isCorrect !== null && key === currentQuestion.correctAnswer;
              const isWrongOpt = isCorrect === false && isSelected;

              return (
                <button
                  key={key}
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(key)}
                  className={cn(
                    "relative p-6 rounded-[32px] text-left transition-all group overflow-hidden border-2",
                    selectedAnswer === null ? "bg-white border-gray-100 hover:border-indigo-400 hover:shadow-xl active:scale-95" : "",
                    isSelected ? "shadow-lg scale-[0.98]" : "opacity-80",
                    isCorrectOpt ? "bg-emerald-50 border-emerald-500 shadow-emerald-100" : 
                    isWrongOpt ? "bg-red-50 border-red-500 shadow-red-100" : 
                    isSelected && !isCorrectOpt ? "bg-gray-100 border-gray-300" : ""
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm shrink-0",
                      isCorrectOpt ? "bg-emerald-500 text-white" :
                      isWrongOpt ? "bg-red-500 text-white" :
                      "bg-gray-100 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors"
                    )}>
                      {key}
                    </div>
                    <span className={cn(
                      "text-lg font-bold flex-1",
                      isCorrectOpt ? "text-emerald-700" : 
                      isWrongOpt ? "text-red-700" : 
                      "text-gray-700"
                    )}>
                      {optionText as string}
                    </span>
                    {isCorrectOpt && <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />}
                    {isWrongOpt && <XCircle size={24} className="text-red-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Completed State
  const myCompleted = isCreator ? battle.creatorCompleted : battle.opponentCompleted;
  const otherCompleted = isCreator ? battle.opponentCompleted : battle.creatorCompleted;

  if (gameOver || myCompleted) {
    const isWinner = battle.winnerId === profile.uid;
    const isDraw = battle.winnerId === 'draw';
    const isWaitingResult = !battle.completed && !otherCompleted && battle.status !== 'completed';

    return (
      <div className="min-h-screen py-10 flex flex-col items-center justify-center space-y-12">
        {isWaitingResult ? (
          <div className="text-center space-y-8 max-w-md w-full">
            <div className="relative mx-auto w-32 h-32">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                className="absolute inset-0 border-4 border-indigo-100 border-t-indigo-600 rounded-[40px]"
              />
              <div className="absolute inset-4 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600">
                <Users size={40} className="animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-gray-900">ফলাফলের জন্য অপেক্ষা...</h2>
              <p className="text-gray-500 font-medium">আপনি আপনার খেলা শেষ করেছেন। প্রতিপক্ষ খেলছেন। তিনি শেষ করলে ফলাফল জানানো হবে।</p>
            </div>

            <div className="flex grid grid-cols-2 gap-4">
              <div className="glass-card p-6 rounded-3xl bg-indigo-50/50 border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">আপনার উত্তর</p>
                <p className="text-3xl font-black text-gray-900">{formatNumber(score)} / ৫</p>
              </div>
              <div className="glass-card p-6 rounded-3xl bg-gray-50/50 border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">প্রতিপক্ষ</p>
                <p className="text-3xl font-black text-gray-300 tracking-widest">---</p>
              </div>
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl text-center space-y-10"
          >
            <div className="relative inline-block mt-10">
              <motion.div 
                animate={isWinner ? { y: [0, -20, 0] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={cn(
                  "w-32 h-32 rounded-[48px] flex items-center justify-center shadow-2xl relative z-10",
                  isWinner ? "bg-amber-100 text-amber-600 shadow-amber-100" : 
                  isDraw ? "bg-indigo-100 text-indigo-600 shadow-indigo-100" : 
                  "bg-gray-100 text-gray-400 shadow-gray-100"
                )}
              >
                {isWinner ? <Trophy size={64} fill="currentColor" /> : isDraw ? <Users size={64} /> : <Zap size={64} />}
              </motion.div>
              <div className={cn(
                "absolute inset-0 rounded-[48px] blur-3xl opacity-30",
                isWinner ? "bg-amber-400" : isDraw ? "bg-indigo-400" : "bg-gray-400"
              )}></div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                {isWinner ? 'অভিনন্দন! আপনি জয়ী!' : isDraw ? 'ম্যাচ ড্র হয়েছে!' : 'আগামীবার আরও চেষ্টা করুন!'}
              </h1>
              <p className="text-gray-500 font-bold text-lg">
                {isWinner 
                  ? `আপনি জিতে নিয়েছেন ${formatNumber(battle.stake * 2)}টি কয়েন!` 
                  : isDraw ? 'আপনার স্টেক করা কয়েন ফেরত দেয়া হয়েছে।' 
                  : 'আপনি এই ব্যাটলটি হেরে গেছেন।'}
              </p>
            </div>

            {/* Results Grid */}
            <div className="flex grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className={cn(
                "glass-card p-8 rounded-[40px] border-2",
                isCreator ? (isWinner ? "border-amber-500 bg-amber-50" : isDraw ? "border-indigo-400 bg-indigo-50" : "border-gray-200") : 
                (!isWinner && !isDraw ? "border-amber-500 bg-amber-50" : "border-gray-200")
              )}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border">
                    {battle.creatorPhoto ? <img src={battle.creatorPhoto} className="w-full h-full object-cover" /> : <Users size={20} />}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-gray-900 truncate w-32">{battle.creatorName}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">খেলোয়াড় ১ (ক্রিয়েটর)</p>
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900">{formatNumber(battle.creatorScore)}</div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{formatNumber(battle.creatorScore)} সঠিক উত্তর</p>
              </div>

              <div className={cn(
                "glass-card p-8 rounded-[40px] border-2",
                !isCreator ? (isWinner ? "border-amber-500 bg-amber-50" : isDraw ? "border-indigo-400 bg-indigo-50" : "border-gray-200") : 
                (!isWinner && !isDraw ? "border-amber-500 bg-amber-50" : "border-gray-200")
              )}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden border">
                    {battle.opponentPhoto ? <img src={battle.opponentPhoto} className="w-full h-full object-cover" /> : <Users size={20} />}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-gray-900 truncate w-32">{battle.opponentName || '---'}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">খেলোয়াড় ২</p>
                  </div>
                </div>
                <div className="text-4xl font-black text-gray-900">{formatNumber(battle.opponentScore)}</div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{formatNumber(battle.opponentScore)} সঠিক উত্তর</p>
              </div>
            </div>

            <div className="pt-10 flex gap-4">
              <button 
                onClick={() => navigate('/battle')}
                className="flex-1 py-5 bg-white border-2 border-gray-100 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100/50 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <ArrowRight size={18} className="rotate-180" />
                লবিতে যান
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Home size={18} />
                হোম পেজ
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return null;
};

export default BattleArena;
