import { openDB, IDBPDatabase } from 'idb';
import { Question } from '../types';

const DB_NAME = 'quiz-db';
const DB_VERSION = 1;

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
  }
};
