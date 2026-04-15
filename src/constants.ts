import { Category } from './types';

export const CATEGORIES: Category[] = [
  {
    id: 'facebook-quiz',
    name: 'Facebook Quiz',
    nameBn: 'ফেসবুক কুইজ',
    description: 'Facebook quizzes are created purely for entertainment.',
    icon: 'Facebook',
    color: 'bg-blue-600',
    questionCount: 20
  },
  {
    id: 'islamic-knowledge',
    name: 'Islamic Knowledge',
    nameBn: 'ইসলামিক জ্ঞান',
    description: 'Deepen your understanding of Islam.',
    icon: 'MoonStar',
    color: 'bg-emerald-600',
    questionCount: 20
  },
  {
    id: 'bangladesh-history',
    name: 'Bangladesh History',
    nameBn: 'বাংলাদেশের ইতিহাস',
    description: 'Learn about our roots and liberation.',
    icon: 'Landmark',
    color: 'bg-red-600',
    questionCount: 20
  },
  {
    id: 'literature',
    name: 'Literature',
    nameBn: 'সাহিত্য',
    description: 'World and Bangla literature.',
    icon: 'Library',
    color: 'bg-indigo-600',
    questionCount: 20
  },
  {
    id: 'geography',
    name: 'Geography',
    nameBn: 'ভূগোল',
    description: 'Maps, countries, and landscapes.',
    icon: 'Compass',
    color: 'bg-amber-600',
    questionCount: 20
  },
  {
    id: 'science-tech',
    name: 'Science & Tech',
    nameBn: 'বিজ্ঞান ও প্রযুক্তি',
    description: 'Latest in science and technology.',
    icon: 'Atom',
    color: 'bg-purple-600',
    questionCount: 20
  },
  {
    id: 'general-knowledge',
    name: 'General Knowledge',
    nameBn: 'সাধারণ জ্ঞান',
    description: 'Explore the world with general facts.',
    icon: 'Brain',
    color: 'bg-blue-500',
    questionCount: 120
  }
];

export const MOCK_QUESTIONS = [
  {
    id: 'q1',
    questionText: 'বাংলাদেশের স্বাধীনতা দিবস কবে?',
    optionA: '১৬ ডিসেম্বর',
    optionB: '২৬ মার্চ',
    optionC: '২১ ফেব্রুয়ারি',
    optionD: '১৪ এপ্রিল',
    correctAnswer: 'B',
    explanation: '২৬ মার্চ বাংলাদেশের মহান স্বাধীনতা ও জাতীয় দিবস।',
    category: 'bangladesh-history',
    difficulty: 'easy',
    language: 'bn',
    approved: true
  },
  {
    id: 'q2',
    questionText: 'ইসলামের প্রথম খলিফা কে ছিলেন?',
    optionA: 'হযরত ওমর (রাঃ)',
    optionB: 'হযরত ওসমান (রাঃ)',
    optionC: 'হযরত আবু বকর (রাঃ)',
    optionD: 'হযরত আলী (রাঃ)',
    correctAnswer: 'C',
    explanation: 'হযরত আবু বকর (রাঃ) ছিলেন ইসলামের প্রথম খলিফা।',
    category: 'islamic-knowledge',
    difficulty: 'easy',
    language: 'bn',
    approved: true
  }
];

export const ACHIEVEMENTS = [
  { id: 'first-quiz', name: 'প্রথম কুইজ', icon: '🎯', color: 'bg-blue-50', desc: 'কুইজ যাত্রা শুরু', requirement: '১টি কুইজ খেলুন' },
  { id: 'ten-correct', name: '১০ সঠিক', icon: '🔥', color: 'bg-orange-50', desc: 'টানা ১০টি সঠিক', requirement: '১০টি সঠিক উত্তর দিন' },
  { id: 'history-buff', name: 'ইতিহাসবিদ', icon: '📜', color: 'bg-amber-50', desc: 'ইতিহাসে পারদর্শী', requirement: 'ইতিহাসে ৫টি কুইজ খেলুন' },
  { id: 'champion', name: 'চ্যাম্পিয়ন', icon: '🏆', color: 'bg-yellow-50', desc: 'প্রথম স্থান অর্জন', requirement: 'লিডারবোর্ডে প্রবেশ করুন' },
  { id: 'science-expert', name: 'বিজ্ঞান বিশেষজ্ঞ', icon: '🔬', color: 'bg-purple-50', desc: 'বিজ্ঞানে পারদর্শী', requirement: 'বিজ্ঞানে ৫টি কুইজ খেলুন' },
  { id: 'perfect-score', name: 'পারফেক্ট স্কোর', icon: '⭐', color: 'bg-emerald-50', desc: 'সবগুলো সঠিক', requirement: 'একটি কুইজে ১০০% স্কোর' },
  { id: 'verified', name: 'ভেরিফাইড', icon: '✅', color: 'bg-cyan-50', desc: 'যাচাইকৃত প্রোফাইল', requirement: 'প্রোফাইল ভেরিফাই করুন' },
];
