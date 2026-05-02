export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  totalPoints: number;
  xp: number;
  level: number;
  streak: number;
  accuracy: number;
  quizzesPlayed: number;
  preferredLanguage: 'bn' | 'en';
  role: 'user' | 'admin';
  isBlocked?: boolean;
  isVerified?: boolean;
  achievements: string[];
  dailyChallengeCompletedAt?: string;
  dailyPoints: number;
  lastDailyUpdate?: string;
  weeklyPoints: number;
  lastWeeklyUpdate?: string;
  coins: number;
  lastDailyCoinClaim?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  category: string;
  topic?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  language: 'bn' | 'en';
  sourceType: 'manual' | 'ai';
  approved: boolean;
  createdAt: string;
}

export interface QuizSession {
  sessionId: string;
  userId: string;
  mode: string;
  category: string;
  score: number;
  questionsAnswered: number;
  correctCount: number;
  wrongCount: number;
  earnedXP: number;
  startedAt: string;
  endedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalPoints: number;
  level: number;
  xp: number;
  avatar?: string;
  isVerified?: boolean;
}

export interface Mistake {
  id?: string;
  userId: string;
  questionId: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  category: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  icon: string;
  color: string;
  questionCount?: number;
  order?: number;
  image?: string;
}

export interface BattleMessage {
  id: string;
  battleId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

export interface Battle {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  opponentId?: string;
  opponentName?: string;
  opponentPhoto?: string;
  stake: number;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  category: string;
  categoryNameBn: string;
  questions: Question[]; // Embedded for simplicity in matching
  creatorScore: number;
  opponentScore: number;
  creatorCompleted: boolean;
  opponentCompleted: boolean;
  creatorCoinsDeducted?: boolean;
  creatorPrizeAwarded?: boolean;
  opponentPrizeAwarded?: boolean;
  winnerId?: string | 'draw';
  createdAt: any; // Firestore timestamp
}
