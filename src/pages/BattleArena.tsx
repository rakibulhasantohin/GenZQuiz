import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc, increment, serverTimestamp, collection, addDoc, query, orderBy, limit, runTransaction, getDoc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { Battle, Question, BattleMessage } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
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
  
  const isInitialLoad = useRef(true);
  const chatAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!chatAudio.current) {
      chatAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
      chatAudio.current.volume = 0.4;
    }
  }, []);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  const isCreator = battle?.creatorId === profile?.uid;
  const myCompleted = isCreator ? battle?.creatorCompleted : battle?.opponentCompleted;
  const otherCompleted = isCreator ? battle?.opponentCompleted : battle?.creatorCompleted;

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
      
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          const isFromOthers = data.senderId !== profile?.uid;
          
          if (!isInitialLoad.current && isFromOthers && !snapshot.metadata.hasPendingWrites) {
            chatAudio.current?.play().catch(e => console.log('Audio block:', e));
            if (!showChat) {
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      });
      
      isInitialLoad.current = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `battles/${battleId}/messages`);
    });

    return () => unsubscribe();
  }, [battleId, showChat, profile?.uid]);

  // Bot Simulation Logic
  useEffect(() => {
    if (!battle || !battle.isBot || battle.status !== 'active' || battle.opponentCompleted) return;

    const simulateBot = async () => {
      let botScore = 0;
      const questionsCount = battle.questions.length;
      
      // Send a greeting message from bot
      try {
        const path = `battles/${battle.id}/messages`;
        await addDoc(collection(db, 'battles', battle.id, 'messages'), {
          battleId: battle.id,
          senderId: 'bot-id',
          senderName: 'GenZ Bot',
          text: 'ব্যাটেল শুরু হোক! আমি তৈরি, আপনি? 😎',
          createdAt: serverTimestamp()
        });
      } catch (e) { 
        console.error('Initial bot message error:', e);
        // We don't throw here to allow simulation to continue, but we log it
      }

      // We simulate thinking times
      for (let i = 0; i < questionsCount; i++) {
        // Wait 5-12 seconds per question
        const waitTime = 5000 + Math.random() * 7000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // AI Accuracy: ~75%
        if (Math.random() < 0.75) {
          botScore++;
        }
      }

      // Finish battle for bot
      try {
        const battleRef = doc(db, 'battles', battle.id);
        
        // Use a transaction to ensure we don't overwrite user's finish logic if they finished first
        await runTransaction(db, async (transaction) => {
          const bSnap = await transaction.get(battleRef);
          if (!bSnap.exists()) return;
          const bData = bSnap.data() as Battle;
          
          if (bData.opponentCompleted) return;

          const updateData: any = {
            opponentScore: botScore,
            opponentCompleted: true
          };

          if (bData.creatorCompleted) {
            updateData.status = 'completed';
            const userScore = bData.creatorScore || 0;
            
            let winnerId: string | 'draw' = 'draw';
            if (userScore > botScore) {
              winnerId = bData.creatorId;
            } else if (botScore > userScore) {
              winnerId = 'bot-id';
            }
            updateData.winnerId = winnerId;
          }

          transaction.update(battleRef, updateData);
        }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `battles/${battle.id}`));

        // Send a closing message from bot
        try {
          await addDoc(collection(db, 'battles', battle.id, 'messages'), {
            battleId: battle.id,
            senderId: 'bot-id',
            senderName: 'GenZ Bot',
            text: botScore >= (questionsCount / 2) ? 'ভালো খেলেছি আমি! আপনার কী খবর? 😊' : 'উফ! কয়েকটা ভুল হয়ে গেল। 😅',
            createdAt: serverTimestamp()
          });
        } catch (e) {
          console.error('Final bot message error:', e);
        }
      } catch (error) {
        console.error('Error simulating bot finish:', error);
        handleFirestoreError(error, OperationType.UPDATE, `battles/${battle.id}`);
      }
    };

    simulateBot();
  }, [battle?.status, battle?.isBot, battle?.id]);

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

  const handleFinish = useCallback(async (finalScore?: number) => {
    if (!battle || !profile || gameOver) return;
    
    // Set gameOver optimistically to prevent double execution
    setGameOver(true);
    const currentScore = finalScore !== undefined ? finalScore : score;

    try {
      const battleRef = doc(db, 'battles', battle.id);
      const userRef = doc(db, 'users', profile.uid);
      
      // Atomic completion and winner calculation using a Transaction
      await runTransaction(db, async (transaction) => {
        const bSnap = await transaction.get(battleRef);
        if (!bSnap.exists()) return;
        
        const bData = bSnap.data() as Battle;
        const field = isCreator ? 'creatorScore' : 'opponentScore';
        const completedField = isCreator ? 'creatorCompleted' : 'opponentCompleted';
        
        // Return if this field is already set to prevent redundant updates
        if (bData[completedField]) return;

        const updateData: any = {
          [field]: currentScore,
          [completedField]: true
        };

        const otherCompleted = isCreator ? bData.opponentCompleted : bData.creatorCompleted;
        
        if (otherCompleted) {
          updateData.status = 'completed';
          const myScore = currentScore;
          const otherScore = isCreator ? (bData.opponentScore || 0) : (bData.creatorScore || 0);
          
          let winnerId: string | 'draw' = 'draw';
          if (myScore > otherScore) {
            winnerId = profile.uid;
          } else if (otherScore > myScore) {
            winnerId = isCreator ? (bData.opponentId || '') : bData.creatorId;
          }
          updateData.winnerId = winnerId;
        }

        transaction.update(battleRef, updateData);
      });

      // Update XP for user
      const earnedXP = currentScore * 20;
      await updateDoc(userRef, {
        xp: increment(earnedXP),
        totalPoints: increment(earnedXP),
        quizzesPlayed: increment(1)
      });
    } catch (error) {
      console.error('Error completing battle:', error);
      // If something goes wrong, we might need a way to retry, 
      // but for now, we minimize damage by having setGameOver(true).
    }
  }, [battle, profile, score, isCreator, gameOver]);

  // Effect to award prizes when battle is completed
  useEffect(() => {
    if (!battle || !profile || battle.status !== 'completed' || !gameOver) return;

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
  }, [battle?.status, battle?.winnerId, profile?.uid, battle?.id, gameOver, isCreator]);

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
  }, [timeLeft, gameOver, battle, isCreator, handleFinish, currentQuestionIndex]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null || gameOver) return;
    
    const currentQuestion = battle?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setSelectedAnswer(answer);
    setAnswers(prev => ({ ...prev, [currentQuestionIndex]: answer }));
    const correct = answer === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    
    // Use local updated score for the check to avoid stale closure issues
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    setTimeout(() => {
      if (currentQuestionIndex < (battle?.questions.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setTimeLeft(15);
      } else {
        handleFinish(newScore);
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
  if (battle.status === 'active' && !gameOver && !myCompleted) {
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
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative shrink-0">
              <div className={cn(
                "w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shadow-sm bg-white",
                isCreator ? "border-indigo-500" : "border-gray-100"
              )}>
                {battle.creatorPhoto ? (
                  <img src={battle.creatorPhoto} alt={battle.creatorName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <Users size={16} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded-md flex items-center justify-center text-white border border-white text-[7px] font-black">P1</div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-amber-500" fill="currentColor" />
                <span className="text-sm font-black text-gray-900 leading-none">{formatNumber(isCreator ? score : (battle.creatorScore || 0))}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1.5 max-w-[120px]">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border-2 bg-white text-indigo-600 relative overflow-hidden">
               <motion.div 
                 key={timeLeft}
                 initial={{ scale: 1.2, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className={cn("relative z-10", timeLeft <= 5 ? "text-red-500" : "text-indigo-600")}
               >
                 {timeLeft}
               </motion.div>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-indigo-600"
               />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end text-right">
            <div>
              <span className="text-sm font-black text-gray-400 leading-none">{formatNumber(!isCreator ? score : (battle.opponentScore || 0))}</span>
            </div>

            <div className="relative shrink-0">
              <div className={cn(
                "w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shadow-sm bg-white",
                !isCreator ? "border-indigo-500" : "border-gray-100"
              )}>
                {battle.opponentPhoto ? (
                  <img src={battle.opponentPhoto} alt={battle.opponentName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400">
                    <Users size={16} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gray-600 rounded-md flex items-center justify-center text-white border border-white text-[7px] font-black">P2</div>
            </div>
          </div>
        </div>

        {/* Question Area - Animated Presence */}
        <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl mb-6 relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gray-50">
                <motion.div 
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 15, ease: "linear" }}
                  key={`timer-bar-${currentQuestionIndex}`}
                  className={cn("h-full", timeLeft <= 5 ? "bg-red-500" : "bg-indigo-600")}
                />
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full mb-4">
                প্রশ্ন {currentQuestionIndex + 1} / {battle.questions.length}
              </div>
              <h2 className="text-xl md:text-2xl font-black text-gray-800 leading-relaxed">
                {currentQuestion.questionText}
              </h2>
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
                    "relative p-4 rounded-2xl text-left transition-all border-2 group",
                    selectedAnswer === null ? "bg-white border-gray-50 hover:border-indigo-200" : "",
                    isCorrectOpt ? "bg-emerald-50 border-emerald-400" : 
                    isWrongOpt ? "bg-red-50 border-red-400" : 
                    isSelected ? "bg-gray-50 border-gray-200" : "opacity-70 bg-white border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors",
                      isCorrectOpt ? "bg-emerald-500 text-white" :
                      isWrongOpt ? "bg-red-500 text-white" :
                      isSelected ? "bg-gray-400 text-white" :
                      "bg-gray-50 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white"
                    )}>
                      {key}
                    </div>
                    <span className={cn(
                      "text-sm font-bold flex-1 leading-tight",
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

  // Completed or Results State
  if (gameOver || myCompleted || battle.status === 'completed') {
    const isWinner = battle.winnerId === profile.uid;
    const isBotWinner = battle.winnerId === 'bot-id';
    const isDraw = battle.winnerId === 'draw';
    const isWaitingResult = battle.status !== 'completed' && (isCreator ? !battle.opponentCompleted : !battle.creatorCompleted);

    return (
      <div className="min-h-screen py-10 flex flex-col items-center justify-center space-y-12 relative overflow-hidden bg-white">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-10"></div>

        <AnimatePresence mode="wait">
          {isWaitingResult ? (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center space-y-12 max-w-md w-full px-6"
            >
              <div className="relative mx-auto w-40 h-40">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-dashed border-indigo-200 rounded-[48px]"
                />
                <motion.div 
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-4 bg-indigo-600 rounded-[40px] flex items-center justify-center text-white shadow-2xl shadow-indigo-200"
                >
                  {battle.isBot ? <Zap size={56} className="animate-pulse" /> : <Users size={56} className="animate-pulse" />}
                </motion.div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">ফলাফলের জন্য <span className="text-indigo-600">অপেক্ষা...</span></h2>
                <p className="text-gray-500 font-medium leading-relaxed">
                  দুর্দান্ত খেলেছেন! আপনার স্কোর <span className="text-indigo-600 font-black">{formatNumber(score)}</span>। 
                  {battle.isBot ? "কম্পিউটার এখনো হিসাব করছে..." : "প্রতিপক্ষ এখনো খেলছেন, তিনি শেষ করলেই ফলাফল দেখা যাবে।"}
                </p>
              </div>

              <div className="flex grid grid-cols-2 gap-4">
                <div className="glass-card p-6 rounded-[32px] bg-white border-indigo-100 shadow-xl shadow-indigo-100/20">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">আপনার স্কোর</p>
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-4xl font-black text-gray-900">{formatNumber(score)}</span>
                    <span className="text-xs font-bold text-gray-400">/{formatNumber(battle.questions.length)}</span>
                  </div>
                </div>
                <div className="glass-card p-6 rounded-[32px] bg-gray-50/50 border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">প্রতিপক্ষ</p>
                  <div className="flex gap-2 justify-center py-2">
                    {[0, 1, 2].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-2.5 h-2.5 bg-gray-300 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl px-6 flex flex-col items-center gap-12"
            >
              {/* Winner Header Animation */}
              <div className="relative text-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 100, delay: 0.2 }}
                  className="relative inline-block mb-6"
                >
                  <div className={cn(
                    "w-36 h-36 rounded-[48px] flex items-center justify-center shadow-2xl relative z-10",
                    isWinner ? "bg-amber-400 text-amber-900 shadow-amber-200" : 
                    isDraw ? "bg-indigo-600 text-white shadow-indigo-200" : 
                    "bg-gray-100 text-gray-400 shadow-gray-100"
                  )}>
                    {isWinner ? <Trophy size={72} fill="currentColor" /> : isDraw ? <Users size={72} /> : <Zap size={72} />}
                  </div>
                  {isWinner && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                      className="absolute inset-0 border-4 border-dashed border-amber-300 -m-4 rounded-[60px]"
                    />
                  )}
                </motion.div>

                <motion.h1 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter"
                >
                  {isWinner ? 'কড়াকড়ি জয়!' : isDraw ? 'ফলাফল ড্র!' : 'মন খারাপ করবেন না!'}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-gray-400 font-bold text-sm mt-2"
                >
                  {isWinner 
                    ? (battle.stake > 0 ? `আপনি জিতে নিয়েছেন ${formatNumber(battle.stake * 2)}টি কয়েন!` : 'দুর্দান্ত খেলছেন!')
                    : isDraw ? 'হাড্ডাহাড্ডি লড়াই ছিল।' 
                    : 'পরের বার অবশ্যই আরও ভালো করতে পারবেন।'}
                </motion.p>
              </div>

              {/* Main Score Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Player 1 Card */}
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className={cn(
                    "glass-card p-6 rounded-[32px] border-2 relative overflow-hidden transition-all",
                    isCreator ? (isWinner ? "border-amber-400 bg-amber-50/50" : isDraw ? "border-indigo-400 bg-indigo-50/50" : "border-gray-100 bg-white") 
                    : (!isWinner && !isDraw ? "border-amber-400 bg-amber-50/50" : "border-gray-100 bg-white")
                  )}
                >
                  {((isCreator && isWinner) || (!isCreator && !isWinner && !isDraw)) && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 font-black text-[8px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">Winner</div>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
                      {battle.creatorPhoto ? <img src={battle.creatorPhoto} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-200" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h4 className="font-black text-base text-gray-900 truncate tracking-tight">{battle.creatorName}</h4>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">P1 (Host)</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 leading-none">
                      {isCreator ? formatNumber(score) : formatNumber(battle.creatorScore || 0)}
                    </span>
                    <span className="text-xs font-black text-gray-400 uppercase">Correct</span>
                  </div>
                </motion.div>

                {/* Player 2 Card */}
                <motion.div 
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className={cn(
                    "glass-card p-6 rounded-[32px] border-2 relative overflow-hidden transition-all",
                    !isCreator ? (isWinner ? "border-amber-400 bg-amber-50/50" : isDraw ? "border-indigo-400 bg-indigo-50/50" : "border-gray-100 bg-white") 
                    : (isBotWinner ? "border-amber-400 bg-amber-50/50" : isDraw ? "border-indigo-400 bg-indigo-50/50" : "border-gray-100 bg-white")
                  )}
                >
                  {((!isCreator && isWinner) || (isCreator && isBotWinner)) && (
                    <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 font-black text-[8px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">Winner</div>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
                      {battle.opponentPhoto ? <img src={battle.opponentPhoto} className="w-full h-full object-cover" /> : <Users size={20} className="text-gray-200" />}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <h4 className="font-black text-base text-gray-900 truncate tracking-tight">{battle.opponentName || '...'}</h4>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">P2 (Opponent)</p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-gray-900 leading-none">
                      {!isCreator ? formatNumber(score) : formatNumber(battle.opponentScore || 0)}
                    </span>
                    <span className="text-xs font-black text-gray-400 uppercase">Correct</span>
                  </div>
                </motion.div>
              </div>

              {/* Reward/XP Notice */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl w-full max-w-sm flex items-center gap-4"
              >
                 <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shrink-0">
                    <Star fill="currentColor" size={18} />
                 </div>
                 <div className="flex-1">
                    <h4 className="text-emerald-900 font-black text-xs">পুরস্কার ও স্বীকৃতি</h4>
                    <p className="text-emerald-700 font-medium text-[10px]">
                       আপনার রেটিং এবং XP আপডেট করা হয়েছে।
                    </p>
                 </div>
              </motion.div>

              {/* Detailed Review Header */}
              <div className="w-full space-y-8 mt-8">
                <div className="flex items-center gap-4">
                  <div className="h-0.5 flex-1 bg-gray-100"></div>
                  <h3 className="font-black text-gray-400 uppercase tracking-[0.3em] text-[10px]">প্রশ্ন ও উত্তর পর্যালোচনা</h3>
                  <div className="h-0.5 flex-1 bg-gray-100"></div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {battle.questions.map((q, idx) => {
                    const myAns = answers[idx];
                    const isCorrect = myAns === q.correctAnswer;
                    
                    return (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="glass-card p-8 bg-white border-gray-100 rounded-[40px] shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-lg",
                             isCorrect ? "bg-emerald-500 shadow-emerald-50" : "bg-red-500 shadow-red-50"
                           )}>
                             {idx + 1}
                           </div>
                           <div className="space-y-3 flex-1">
                              <p className="font-bold text-gray-800 text-sm md:text-base leading-tight">{q.questionText}</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 <div className="p-2 px-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">সঠিক উত্তর</p>
                                    <p className="text-xs font-bold text-emerald-800">{q[`option${q.correctAnswer}` as keyof Question] as string}</p>
                                 </div>
                                 {myAns && !isCorrect && (
                                   <div className="p-2 px-3 rounded-xl bg-red-50/50 border border-red-100">
                                      <p className="text-[8px] font-black text-red-600 uppercase tracking-widest mb-0.5">আপনার উত্তর</p>
                                      <p className="text-xs font-bold text-red-800">{q[`option${myAns}` as keyof Question] as string}</p>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pb-10 mt-6 shrink-0">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/battle')}
                  className="flex-1 py-4 bg-white border border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100/40 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  আবার খেলুন
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                >
                  <Home size={14} />
                  ড্যাশবোর্ড
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
