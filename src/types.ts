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
  achievements: string[];
  dailyChallengeCompletedAt?: string;
  dailyPoints: number;
  lastDailyUpdate?: string;
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
}
