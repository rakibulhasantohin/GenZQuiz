import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, increment, arrayUnion, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { offlineStorage } from './services/offlineStorage';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  claimDailyCoins: () => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isOnline: navigator.onLine,
  claimDailyCoins: async () => ({ success: false, message: 'Not initialized' }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const getWeekId = useCallback(() => {
    const d = new Date();
    const day = d.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = (day + 1) % 7; // Saturday is start (0 offset)
    d.setDate(d.getDate() - diff);
    return d.toLocaleDateString('en-CA'); // Saturday's date
  }, []);

  const syncPendingScores = useCallback(async (userId: string) => {
    if (!navigator.onLine) return;
    
    const pendingScores = await offlineStorage.getAllPendingScores();
    if (pendingScores.length === 0) return;

    console.log(`Syncing ${pendingScores.length} pending scores...`);

    for (const scoreData of pendingScores) {
      if (scoreData.userId !== userId) continue;

      try {
        const userDocRef = doc(db, 'users', userId);
        const today = new Date().toLocaleDateString('en-CA');
        const currentWeek = getWeekId();

        await updateDoc(userDocRef, {
          totalPoints: increment(scoreData.score),
          xp: increment(scoreData.xpEarned),
          quizzesPlayed: increment(1),
          dailyPoints: profile?.lastDailyUpdate === today ? increment(scoreData.score) : scoreData.score,
          lastDailyUpdate: today,
          weeklyPoints: profile?.lastWeeklyUpdate === currentWeek ? increment(scoreData.score) : scoreData.score,
          lastWeeklyUpdate: currentWeek,
          updatedAt: new Date().toISOString(),
          quizHistory: arrayUnion({
            categoryId: scoreData.categoryId,
            score: scoreData.score,
            totalQuestions: scoreData.totalQuestions,
            timestamp: new Date(scoreData.timestamp).toISOString(),
          })
        });

        await offlineStorage.removePendingScore(scoreData.id);
      } catch (error) {
        console.error('Error syncing score:', error);
      }
    }
  }, [profile?.lastDailyUpdate]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user) syncPendingScores(user.uid);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, syncPendingScores]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check and creation if needed
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const newProfile: Partial<UserProfile> = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            totalPoints: 0,
            xp: 0,
            level: 1,
            streak: 0,
            accuracy: 0,
            quizzesPlayed: 0,
            dailyPoints: 0,
            lastDailyUpdate: new Date().toLocaleDateString('en-CA'),
            weeklyPoints: 0,
            lastWeeklyUpdate: getWeekId(),
            coins: 10,
            lastDailyCoinClaim: '',
            preferredLanguage: 'bn',
            role: 'user',
            isBlocked: false,
            isVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
        }

        // Listen for real-time updates
        unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as UserProfile;
            setProfile(data);
            
            // Auto-grant verified achievement if verified
            if (data.isVerified && !data.achievements?.includes('verified')) {
              updateDoc(userDocRef, {
                achievements: arrayUnion('verified')
              }).catch(console.error);
            }
          }
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'rakibulhasantohin@gmail.com';

  const claimDailyCoins = async () => {
    if (!profile || !user) return { success: false, message: 'Please login first' };
    
    const today = new Date().toLocaleDateString('en-CA');
    if (profile.lastDailyCoinClaim === today) {
      return { success: false, message: 'আপনি আজ ইতিমদ্ধেই আপনার ফ্রি কয়েন নিয়েছেন!' };
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        coins: increment(10),
        lastDailyCoinClaim: today,
        updatedAt: new Date().toISOString()
      });
      return { success: true, message: 'অভিনন্দন! আপনি ১০টি ফ্রি কয়েন পেয়েছেন!' };
    } catch (error) {
      console.error('Error claiming coins:', error);
      return { success: false, message: 'কয়েন নিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isOnline, claimDailyCoins }}>
      {children}
    </AuthContext.Provider>
  );
};
