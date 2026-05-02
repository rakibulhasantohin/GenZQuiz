import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp, collection, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Battle, Question, BattleMessage } from '../types';
import { Swords, Trophy, Users, Star, Timer, CheckCircle2, XCircle, Loader2, Home, Coins, ArrowRight, Zap, MessageCircle, Send, X, RefreshCw } from 'lucide-react';
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
  const [messages, setMessages] = useState<BattleMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showVersus, setShowVersus] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const isCreator = battle?.creatorId === profile?.uid;

  // Versus Screen Timer
  useEffect(() => {
    if (battle?.status === 'active' && !gameOver) {
      setShowVersus(true);
      const timer = setTimeout(() => setShowVersus(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [battle?.status, gameOver]);

  // Sync Messages
  useEffect(() => {
    if (!battleId) return;

    const q = query(
      collection(db, 'battles', battleId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BattleMessage));
      setMessages(msgs);
      
      if (!showChat) {
        setUnreadCount(prev => prev + snapshot.docChanges().filter(change => change.type === 'added').length);
      }
    });

    return () => unsubscribe();
  }, [battleId, showChat]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !battleId || !profile) return;

    const text = chatInput.trim();
    setChatInput('');

    try {
      await addDoc(collection(db, 'battles', battleId, 'messages'), {
        battleId,
        senderId: profile.uid,
        senderName: profile.name,
        text,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

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

  // Effect to deduct creator coins when battle starts
  useEffect(() => {
    if (!battle || !profile || battle.status !== 'active') return;
    if (!isCreator || battle.creatorCoinsDeducted) return;

    const deductCoins = async () => {
      try {
        if (battle.stake > 0) {
          await updateDoc(doc(db, 'users', profile.uid), {
            coins: increment(-battle.stake)
          });
        }
        await updateDoc(doc(db, 'battles', battle.id), {
          creatorCoinsDeducted: true
        });
      } catch (error) {
        console.error('Error deducting creator coins:', error);
      }
    };

    deductCoins();
  }, [battle?.status, battle?.creatorCoinsDeducted, isCreator, profile?.uid, battle?.stake, battle?.id]);

  useEffect(() => {
    if (gameOver || !battle || battle.status !== 'active' || showVersus) return;
    
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
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
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
    if (showVersus) {
      return (
        <div className="fixed inset-0 z-[100] bg-gray-950 flex items-center justify-center overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
             <motion.div 
               animate={{ x: [-100, 100], y: [-100, 100] }}
               transition={{ repeat: Infinity, duration: 10, repeatType: 'reverse' }}
               className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full"
             />
             <motion.div 
               animate={{ x: [100, -100], y: [100, -100] }}
               transition={{ repeat: Infinity, duration: 8, repeatType: 'reverse' }}
               className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full"
             />
          </div>

          <div className="relative flex flex-col md:flex-row items-center justify-center gap-12 md:gap-32 w-full px-10">
            {/* Player 1 */}
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-[48px] overflow-hidden border-4 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)] bg-gray-900">
                {battle.creatorPhoto ? (
                  <img src={battle.creatorPhoto} alt={battle.creatorName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-indigo-400">
                    <Users size={64} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Player 1</p>
                <h3 className="text-2xl md:text-3xl font-black text-white">{battle.creatorName}</h3>
              </div>
            </motion.div>

            {/* VS Symbol */}
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.3 }}
              className="relative"
            >
               <div className="text-8xl md:text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 leading-none">VS</div>
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute inset-0 blur-2xl bg-white/20 -z-10"
               ></motion.div>
            </motion.div>

            {/* Player 2 */}
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-[48px] overflow-hidden border-4 border-violet-500 shadow-[0_0_40px_rgba(139,92,246,0.3)] bg-gray-900">
                {battle.opponentPhoto ? (
                  <img src={battle.opponentPhoto} alt={battle.opponentName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-violet-400">
                    <Users size={64} />
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-violet-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Player 2</p>
                <h3 className="text-2xl md:text-3xl font-black text-white">{battle.opponentName || '...'}</h3>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-20 text-center"
          >
             <p className="text-white/40 font-black text-sm uppercase tracking-[0.4em] mb-4">যুদ্ধের প্রস্তুতি নিন</p>
             <div className="flex gap-2 justify-center">
                {[0, 1, 2].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 bg-indigo-500 rounded-full"
                  />
                ))}
             </div>
          </motion.div>
        </div>
      );
    }
    const currentQuestion = battle.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / battle.questions.length) * 100;

    return (
      <div className="min-h-screen py-6 flex flex-col md:py-10">
        {/* Top Header Stats - Enhanced with Avatars */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <div className="relative group">
              <div className={cn(
                "w-10 h-10 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 transition-all shadow-sm bg-white shrink-0",
                isCreator ? "border-indigo-500 shadow-indigo-100" : "border-gray-200"
              )}>
                {battle.creatorPhoto ? (
                  <img src={battle.creatorPhoto} alt={battle.creatorName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <Users size={20} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-sm">
                <span className="text-[8px] font-black">P1</span>
              </div>
            </div>

            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">আপনার স্কোর</p>
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" fill="currentColor" />
                <span className="text-xl font-black text-gray-900">{formatNumber(score)}</span>
              </div>
            </div>
            
            {/* Mobile Score Label */}
            <div className="sm:hidden flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">P1</span>
              <span className="text-sm font-black text-gray-900">{formatNumber(isCreator ? score : 0)}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-2 bg-white text-indigo-600 relative overflow-hidden group">
               <motion.div 
                 key={timeLeft}
                 initial={{ scale: 1.5, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className={cn(
                   "relative z-10",
                   timeLeft <= 5 ? "text-red-600" : "text-indigo-600"
                 )}
               >
                 {timeLeft}
               </motion.div>
               {timeLeft <= 5 && (
                 <motion.div 
                   animate={{ scale: [1, 2], opacity: [0.3, 0] }}
                   transition={{ repeat: Infinity, duration: 1 }}
                   className="absolute inset-0 bg-red-100 rounded-full"
                 />
               )}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]"
               />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end text-right">
             <div className="hidden sm:block">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">প্রতিপক্ষ ও ফলাফল</p>
               <div className="flex items-center justify-end gap-2">
                 <span className="text-xs font-bold text-gray-400 italic">খেলছেন...</span>
               </div>
             </div>
             
             {/* Mobile Opponent Label */}
             <div className="sm:hidden flex flex-col items-end">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">P2</span>
               <span className="text-sm font-black text-gray-400">---</span>
             </div>

             <div className="relative group">
              <div className={cn(
                "w-10 h-10 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 transition-all shadow-sm bg-white shrink-0",
                !isCreator ? "border-indigo-500 shadow-indigo-100" : "border-gray-200"
              )}>
                {battle.opponentPhoto ? (
                  <img src={battle.opponentPhoto} alt={battle.opponentName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <Users size={20} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gray-600 rounded-lg flex items-center justify-center text-white border-2 border-white shadow-sm">
                <span className="text-[8px] font-black">P2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Question Area - Animated Presence */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="glass-card p-10 md:p-14 rounded-[56px] shadow-2xl shadow-indigo-100/40 mb-10 relative overflow-hidden bg-white/70 backdrop-blur-xl border-indigo-50 text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-50">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  key={`timer-bar-${currentQuestionIndex}`}
                  className={cn(
                    "h-full",
                    timeLeft <= 5 ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-indigo-600"
                  )}
                />
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 mx-auto">
                  প্রশ্ন {currentQuestionIndex + 1} of {battle.questions.length}
                </div>
                <h2 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">
                  {currentQuestion.questionText}
                </h2>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A', 'B', 'C', 'D'].map((key, idx) => {
              const optionText = currentQuestion[`option${key}` as keyof Question];
              const isSelected = selectedAnswer === key;
              const isCorrectOpt = isCorrect !== null && key === currentQuestion.correctAnswer;
              const isWrongOpt = isCorrect === false && isSelected;

              return (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + (idx * 0.05) }}
                  disabled={selectedAnswer !== null}
                  onClick={() => handleAnswer(key)}
                  whileHover={selectedAnswer === null ? { scale: 1.02, y: -2 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.98 } : {}}
                  className={cn(
                    "relative p-6 rounded-[32px] text-left transition-all border-2 group",
                    selectedAnswer === null ? "bg-white border-gray-100 hover:border-indigo-400 hover:shadow-xl" : "",
                    isCorrectOpt ? "bg-emerald-50 border-emerald-500 shadow-xl shadow-emerald-100" : 
                    isWrongOpt ? "bg-red-50 border-red-500 shadow-xl shadow-red-100" : 
                    isSelected ? "bg-gray-50 border-gray-300" : "opacity-70 bg-white border-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 transition-colors",
                      isCorrectOpt ? "bg-emerald-500 text-white" :
                      isWrongOpt ? "bg-red-500 text-white" :
                      isSelected ? "bg-gray-400 text-white" :
                      "bg-gray-50 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white"
                    )}>
                      {key}
                    </div>
                    <span className={cn(
                      "text-lg font-bold flex-1 leading-snug",
                      isCorrectOpt ? "text-emerald-700" : 
                      isWrongOpt ? "text-red-700" : 
                      "text-gray-700"
                    )}>
                      {optionText as string}
                    </span>
                    {isCorrectOpt && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 bg-emerald-100 text-emerald-600 w-8 h-8 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </motion.div>
                    )}
                    {isWrongOpt && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 bg-red-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center">
                        <XCircle size={20} />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Chat Widget */}
        <div className="fixed bottom-24 right-6 z-[80] md:bottom-10 md:right-10 flex flex-col items-end gap-4">
          <AnimatePresence>
            {showChat && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="w-80 h-[400px] bg-white rounded-[32px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-indigo-600 text-white">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} />
                    <span className="font-black text-xs uppercase tracking-widest">ব্যাটেল চ্যাট</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="hover:rotate-90 transition-transform">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[80%] rounded-2xl p-3 text-xs",
                        msg.senderId === profile?.uid 
                          ? "bg-indigo-600 text-white rounded-tr-none ml-auto" 
                          : "bg-white border border-gray-100 text-gray-700 rounded-tl-none mr-auto shadow-sm"
                      )}
                    >
                      <span className={cn(
                        "text-[8px] font-black uppercase mb-1",
                        msg.senderId === profile?.uid ? "text-indigo-200" : "text-gray-400"
                      )}>
                        {msg.senderName}
                      </span>
                      <p className="font-medium leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-50">
                      <MessageCircle size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-center">শুভেচ্ছা বিনিময় করে ব্যাটেল শুরু করুন!</p>
                    </div>
                  )}
                </div>

                <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowChat(!showChat)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-100 flex items-center justify-center hover:scale-110 hover:-rotate-6 active:scale-90 transition-all relative"
          >
            {showChat ? <X size={28} /> : <MessageCircle size={28} />}
            {!showChat && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
                {unreadCount}
              </span>
            )}
          </button>
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
      <div className="min-h-screen py-10 flex flex-col items-center justify-center space-y-12 relative overflow-hidden">
        {/* Decorative particles for result screen */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10 bg-gray-50/50">
           <div className="absolute top-10 left-10 w-4 h-4 bg-indigo-200 rounded-full animate-bounce"></div>
           <div className="absolute bottom-40 right-20 w-6 h-6 bg-amber-200 rounded-full animate-pulse"></div>
           <div className="absolute top-1/2 left-20 w-3 h-3 bg-violet-200 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
              <div className={cn(
                "glass-card p-8 rounded-[40px] border-2 relative overflow-hidden",
                isCreator ? (isWinner ? "border-amber-500 bg-amber-50/50" : isDraw ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200") : 
                (!isWinner && !isDraw ? "border-amber-500 bg-amber-50/50" : "border-gray-200")
              )}>
                {isCreator && isWinner && <div className="absolute top-4 right-4 bg-amber-500 text-white rounded-full p-1 shadow-lg shadow-amber-200"><Trophy size={16} /></div>}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white">
                    {battle.creatorPhoto ? <img src={battle.creatorPhoto} className="w-full h-full object-cover" /> : <Users size={24} className="text-gray-300" />}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-gray-900 truncate max-w-[120px]">{battle.creatorName}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Player 1</p>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-gray-900">{formatNumber(battle.creatorScore)}</span>
                  <span className="text-sm font-bold text-gray-400 mb-1">সঠিক</span>
                </div>
              </div>

              <div className={cn(
                "glass-card p-8 rounded-[40px] border-2 relative overflow-hidden",
                !isCreator ? (isWinner ? "border-amber-500 bg-amber-50/50" : isDraw ? "border-indigo-400 bg-indigo-50/50" : "border-gray-200") : 
                (!isWinner && !isDraw ? "border-amber-500 bg-amber-50/50" : "border-gray-200")
              )}>
                {!isCreator && isWinner && <div className="absolute top-4 right-4 bg-amber-500 text-white rounded-full p-1 shadow-lg shadow-amber-200"><Trophy size={16} /></div>}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white">
                    {battle.opponentPhoto ? <img src={battle.opponentPhoto} className="w-full h-full object-cover" /> : <Users size={24} className="text-gray-300" />}
                  </div>
                  <div className="text-left">
                    <h4 className="font-black text-gray-900 truncate max-w-[120px]">{battle.opponentName || '...'}</h4>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Player 2</p>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-gray-900">{formatNumber(battle.opponentScore)}</span>
                  <span className="text-sm font-bold text-gray-400 mb-1">সঠিক</span>
                </div>
              </div>
            </div>

            {/* Detailed Question Review */}
            <div className="w-full max-w-4xl space-y-6">
               <div className="flex items-center gap-3 px-2">
                  <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
                  <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">প্রশ্ন ও উত্তর পর্যালোচনা</h3>
               </div>
               
               <div className="space-y-4">
                  {battle.questions.map((q, idx) => {
                    const myAns = answers[idx];
                    const isCorrect = myAns === q.correctAnswer;
                    
                    return (
                      <div key={idx} className="glass-card p-6 bg-white border-gray-100 rounded-[32px] shadow-sm">
                        <div className="flex gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-lg",
                             isCorrect ? "bg-emerald-500 shadow-emerald-100" : "bg-red-500 shadow-red-100"
                           )}>
                             {idx + 1}
                           </div>
                           <div className="space-y-3 flex-1">
                              <p className="font-bold text-gray-900 text-sm md:text-base leading-snug">{q.questionBn}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">সঠিক উত্তর</p>
                                    <p className="text-xs font-bold text-emerald-800">{q.optionsBn[q.correctAnswer] as string}</p>
                                 </div>
                                 {myAns && !isCorrect && (
                                   <div className="p-3 rounded-2xl bg-red-50 border border-red-100">
                                      <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-1">আপনার উত্তর</p>
                                      <p className="text-xs font-bold text-red-800">{q.optionsBn[myAns] as string}</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>

            <div className="pt-10 flex flex-col md:flex-row gap-4 w-full max-w-lg">
              <button 
                onClick={() => navigate('/battle')}
                className="flex-1 py-5 bg-white border-2 border-gray-100 rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100/50 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center gap-3 text-indigo-600"
              >
                <RefreshCw size={18} />
                আবার খেলুন
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Home size={18} />
                হোম পেজ
              </button>
            </div>
          </motion.div>
        )}

        {/* Chat Widget - Shared for both active and completed screens */}
        <div className="fixed bottom-24 right-6 z-[80] md:bottom-10 md:right-10 flex flex-col items-end gap-4">
          <AnimatePresence>
            {showChat && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="w-80 h-[400px] bg-white rounded-[32px] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
              >
                <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-indigo-600 text-white">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={18} />
                    <span className="font-black text-xs uppercase tracking-widest">ব্যাটেল চ্যাট</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="hover:rotate-90 transition-transform">
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex flex-col max-w-[80%] rounded-2xl p-3 text-xs",
                        msg.senderId === profile?.uid 
                          ? "bg-indigo-600 text-white rounded-tr-none ml-auto" 
                          : "bg-white border border-gray-100 text-gray-700 rounded-tl-none mr-auto shadow-sm"
                      )}
                    >
                      <span className={cn(
                        "text-[8px] font-black uppercase mb-1",
                        msg.senderId === profile?.uid ? "text-indigo-200" : "text-gray-400"
                      )}>
                        {msg.senderName}
                      </span>
                      <p className="font-medium leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 opacity-50">
                      <MessageCircle size={32} strokeWidth={1} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-center">শুভেচ্ছা বিনিময় করে ব্যাটেল শুরু করুন!</p>
                    </div>
                  )}
                </div>

                <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="মেসেজ লিখুন..."
                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  <button 
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowChat(!showChat)}
            className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-100 flex items-center justify-center hover:scale-110 hover:-rotate-6 active:scale-90 transition-all relative"
          >
            {showChat ? <X size={28} /> : <MessageCircle size={28} />}
            {!showChat && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce-short">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default BattleArena;
