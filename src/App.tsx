import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { CategoryProvider } from './CategoryContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import QuizPage from './pages/QuizPage';
import ResultPage from './pages/ResultPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import PublicProfilePage from './pages/PublicProfilePage';
import AdminPage from './pages/AdminPage';
import MistakesPage from './pages/MistakesPage';
import BattlePage from './pages/BattlePage';
import BattleArena from './pages/BattleArena';

export default function App() {
  return (
    <AuthProvider>
      <CategoryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/categories" element={<CategoryPage />} />
              <Route path="/quiz/:categoryId" element={<QuizPage />} />
              <Route path="/result" element={<ResultPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/user/:userId" element={<PublicProfilePage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/mistakes" element={<MistakesPage />} />
              <Route path="/battle" element={<BattlePage />} />
              <Route path="/battle/:battleId" element={<BattleArena />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CategoryProvider>
    </AuthProvider>
  );
}
