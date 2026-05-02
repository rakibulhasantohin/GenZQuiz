import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, getDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Category } from './types';
import { CATEGORIES as DEFAULT_CATEGORIES } from './constants';
import { offlineStorage } from './services/offlineStorage';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateCategoryCount: (categoryId: string, count: number) => Promise<void>;
  reorderCategories: (categories: Category[]) => Promise<void>;
  categoryCounts: Record<string, number>;
}

const CategoryContext = createContext<CategoryContextType>({
  categories: DEFAULT_CATEGORIES,
  loading: true,
  addCategory: async () => {},
  updateCategory: async () => {},
  deleteCategory: async () => {},
  updateCategoryCount: async () => {},
  reorderCategories: async () => {},
  categoryCounts: {},
});

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try loading from offline storage first
    const loadCached = async () => {
      const cached = await offlineStorage.getCategories();
      if (cached && cached.data) {
        setCategories(cached.data);
      }
    };
    loadCached();

    // Listen for custom categories
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const customCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      
      // Merge with default categories, ensuring no duplicates by ID
      const merged = DEFAULT_CATEGORIES.map((c, index) => ({ ...c, order: c.order ?? index }));
      customCategories.forEach(custom => {
        const index = merged.findIndex(c => c.id === custom.id);
        if (index !== -1) {
          merged[index] = { ...merged[index], ...custom };
        } else {
          merged.push({ ...custom, order: custom.order ?? merged.length });
        }
      });
      
      // Sort by order
      merged.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCategories(merged);
      offlineStorage.saveCategories(merged);
    });

    // Listen for category counts/settings
    const unsubscribeCounts = onSnapshot(doc(db, 'settings', 'categoryConfig'), (doc) => {
      if (doc.exists()) {
        setCategoryCounts(doc.data() as Record<string, number>);
      }
    });

    setLoading(false);
    return () => {
      unsubscribe();
      unsubscribeCounts();
    };
  }, []);

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      const id = category.name.toLowerCase().replace(/\s+/g, '-');
      const order = categories.length;
      await setDoc(doc(db, 'categories', id), {
        ...category,
        id,
        order
      });
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, category: Partial<Category>) => {
    try {
      await setDoc(doc(db, 'categories', id), category, { merge: true });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  const reorderCategories = async (newCategories: Category[]) => {
    try {
      const batch = writeBatch(db);
      newCategories.forEach((cat, index) => {
        const docRef = doc(db, 'categories', cat.id);
        batch.set(docRef, { ...cat, order: index }, { merge: true });
      });
      await batch.commit();
      setCategories(newCategories.map((c, i) => ({ ...c, order: i })));
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  };

  const updateCategoryCount = async (categoryId: string, count: number) => {
    try {
      const newCounts = { ...categoryCounts, [categoryId]: count };
      await setDoc(doc(db, 'settings', 'categoryConfig'), newCounts);
      setCategoryCounts(newCounts);
    } catch (error) {
      console.error('Error updating category count:', error);
      throw error;
    }
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, addCategory, updateCategory, deleteCategory, updateCategoryCount, reorderCategories, categoryCounts }}>
      {children}
    </CategoryContext.Provider>
  );
};
