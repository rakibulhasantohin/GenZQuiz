import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Category } from './types';
import { CATEGORIES as DEFAULT_CATEGORIES } from './constants';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategoryCount: (categoryId: string, count: number) => Promise<void>;
  categoryCounts: Record<string, number>;
}

const CategoryContext = createContext<CategoryContextType>({
  categories: DEFAULT_CATEGORIES,
  loading: true,
  addCategory: async () => {},
  updateCategoryCount: async () => {},
  categoryCounts: {},
});

export const useCategories = () => useContext(CategoryContext);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for custom categories
    const unsubscribe = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const customCategories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      
      // Merge with default categories, ensuring no duplicates by ID
      const merged = [...DEFAULT_CATEGORIES];
      customCategories.forEach(custom => {
        const index = merged.findIndex(c => c.id === custom.id);
        if (index !== -1) {
          merged[index] = custom;
        } else {
          merged.push(custom);
        }
      });
      
      setCategories(merged);
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
      await setDoc(doc(db, 'categories', id), {
        ...category,
        id
      });
    } catch (error) {
      console.error('Error adding category:', error);
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
    <CategoryContext.Provider value={{ categories, loading, addCategory, updateCategoryCount, categoryCounts }}>
      {children}
    </CategoryContext.Provider>
  );
};
