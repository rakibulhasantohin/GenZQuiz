import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, increment, arrayUnion, updateDoc, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
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

        await setDoc(userDocRef, {
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
        }, { merge: true });

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
      try {
        console.log('Auth state changed:', firebaseUser?.uid);
        setUser(firebaseUser);
        
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (firebaseUser) {
          // Try to load from offline storage first
          const profilePromise = offlineStorage.getProfile(firebaseUser.uid);
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
          
          const cachedProfile = await Promise.race([profilePromise, timeoutPromise]);
          if (cachedProfile && !profile) {
            setProfile(cachedProfile.profile);
          }

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          
          // Use onSnapshot for real-time profile
          unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              setProfile(data);
              offlineStorage.saveProfile(firebaseUser.uid, data);
            } else if (firebaseUser.email) {
              // Only create if it definitely doesn't exist and we're not in the middle of a migration check
              console.log('Profile doc does not exist, initializing...');
              initializeProfile(firebaseUser, userDocRef);
            }
            setLoading(false);
          }, (error) => {
            console.error('Profile snapshot error:', error);
            setLoading(false);
          });

          // Wait a bit for the first snapshot, but don't hang forever
          setTimeout(() => setLoading(false), 3000);
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setLoading(false);
      }
    });

    const initializeProfile = async (firebaseUser: User, userDocRef: any) => {
      try {
        // Fallback: If no profile exists for this UID, check if one exists for this EMAIL
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', firebaseUser.email), limit(1));
        const emailQuery = await getDocs(q);
        
        if (!emailQuery.empty) {
          const existingDoc = emailQuery.docs[0];
          const existingData = existingDoc.data() as UserProfile;
          
          if (existingDoc.id !== firebaseUser.uid) {
            console.log('Migrating profile from', existingDoc.id, 'to', firebaseUser.uid);
            const migratedProfile: UserProfile = {
              ...existingData,
              uid: firebaseUser.uid,
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, migratedProfile);
            await deleteDoc(doc(db, 'users', existingDoc.id)).catch(console.warn);
            return;
          }
        }

        // Create truly new profile
        const newProfile: UserProfile = {
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
          achievements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
      } catch (e) {
        console.error('Error in initializeProfile:', e);
      }
    };

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const isAdmin = profile?.role === 'admin' || user?.email === 'rakibulhasantohin@gmail.com' || user?.email === 'rakibulhasantuhin010@gmail.com';

  useEffect(() => {
    if (!user || !isOnline) return;
    
    const updatePresence = async () => {
      if (!profile) return; // Wait for profile to be ready
      try {
        await setDoc(doc(db, 'users', user.uid), {
          lastActiveAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error("Error updating presence:", e);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [user, isOnline]);

  const claimDailyCoins = async () => {
    if (!profile || !user) return { success: false, message: 'Please login first' };
    
    const today = new Date().toLocaleDateString('en-CA');
    if (profile.lastDailyCoinClaim === today) {
      return { success: false, message: 'আপনি আজ ইতিমদ্ধেই আপনার ফ্রি কয়েন নিয়েছেন!' };
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        coins: increment(10),
        lastDailyCoinClaim: today,
        updatedAt: new Date().toISOString()
      }, { merge: true });
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
