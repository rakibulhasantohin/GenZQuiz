import { openDB, IDBPDatabase } from 'idb';
import { Question } from '../types';

const DB_NAME = 'quiz-db';
const DB_VERSION = 2;

interface QuizDB {
  questions: {
    key: string; // categoryId
    value: {
      categoryId: string;
      questions: Question[];
      lastUpdated: number;
    };
  };
  pendingScores: {
    key: string; // timestamp or random id
    value: {
      id: string;
      categoryId: string;
      score: number;
      totalQuestions: number;
      xpEarned: number;
      timestamp: number;
      userId: string;
    };
  };
  userProfile: {
    key: string; // userId
    value: {
      userId: string;
      profile: any; // UserProfile
      lastUpdated: number;
    };
  };
  quizHistory: {
    key: string; // userId
    value: {
      userId: string;
      history: any[]; // QuizHistoryEntry[]
      lastUpdated: number;
    };
  };
  categories: {
    key: string; // 'all'
    value: {
      id: string; // 'all'
      data: any[]; // Category[]
      lastUpdated: number;
    };
  };
  mistakes: {
    key: string; // userId
    value: {
      userId: string;
      mistakes: any[]; // Mistake[]
      lastUpdated: number;
    };
  };
  leaderboard: {
    key: string; // 'weekly'
    value: {
      id: string; // 'weekly'
      data: any[]; // LeaderboardEntry[]
      lastUpdated: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<QuizDB>> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<QuizDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('questions')) {
          db.createObjectStore('questions', { keyPath: 'categoryId' });
        }
        if (!db.objectStoreNames.contains('pendingScores')) {
          db.createObjectStore('pendingScores', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('quizHistory')) {
          db.createObjectStore('quizHistory', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('mistakes')) {
          db.createObjectStore('mistakes', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('leaderboard')) {
          db.createObjectStore('leaderboard', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const offlineStorage = {
  // Questions
  async saveQuestions(categoryId: string, questions: Question[]) {
    const db = await getDB();
    await db.put('questions', {
      categoryId,
      questions,
      lastUpdated: Date.now(),
    });
  },

  async getQuestions(categoryId: string) {
    const db = await getDB();
    return db.get('questions', categoryId);
  },

  // Pending Scores
  async savePendingScore(scoreData: Omit<QuizDB['pendingScores']['value'], 'id'>) {
    const db = await getDB();
    const id = crypto.randomUUID();
    await db.put('pendingScores', { ...scoreData, id });
  },

  async getAllPendingScores() {
    const db = await getDB();
    return db.getAll('pendingScores');
  },

  async removePendingScore(id: string) {
    const db = await getDB();
    await db.delete('pendingScores', id);
  },

  async clearPendingScores() {
    const db = await getDB();
    await db.clear('pendingScores');
  },

  // User Profile
  async saveProfile(userId: string, profile: any) {
    const db = await getDB();
    await db.put('userProfile', {
      userId,
      profile,
      lastUpdated: Date.now(),
    });
  },

  async getProfile(userId: string) {
    const db = await getDB();
    return db.get('userProfile', userId);
  },

  // Quiz History
  async saveQuizHistory(userId: string, history: any[]) {
    const db = await getDB();
    await db.put('quizHistory', {
      userId,
      history,
      lastUpdated: Date.now(),
    });
  },

  async getQuizHistory(userId: string) {
    const db = await getDB();
    return db.get('quizHistory', userId);
  },

  // Categories
  async saveCategories(categories: any[]) {
    const db = await getDB();
    await db.put('categories', {
      id: 'all',
      data: categories,
      lastUpdated: Date.now(),
    });
  },

  async getCategories() {
    const db = await getDB();
    return db.get('categories', 'all');
  },

  // Mistakes
  async saveMistakes(userId: string, mistakes: any[]) {
    const db = await getDB();
    await db.put('mistakes', {
      userId,
      mistakes,
      lastUpdated: Date.now(),
    });
  },

  async getMistakes(userId: string) {
    const db = await getDB();
    return db.get('mistakes', userId);
  },

  // Leaderboard
  async saveLeaderboard(data: any[]) {
    const db = await getDB();
    await db.put('leaderboard', {
      id: 'weekly',
      data,
      lastUpdated: Date.now(),
    });
  },

  async getLeaderboard() {
    const db = await getDB();
    return db.get('leaderboard', 'weekly');
  }
};
