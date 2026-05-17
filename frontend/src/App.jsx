import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import RegisterNew from './components/RegisterNew';
import StudentScanner from './components/StudentScanner';
import StudentDashboard from './components/StudentDashboard';
import LecturerDashboard from './components/LecturerDashboard';
import AdminDashboard from './components/AdminDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationContainer from './components/NotificationContainer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';

/**
 * Protected Route Component
 * Ensures user is authenticated before accessing route
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Admin Route Component
 * Ensures user is authenticated and has admin role
 */
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Student Route Component
 * Ensures user is authenticated and has student role
 */
function StudentRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'STUDENT') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Lecturer Route Component
 * Ensures user is authenticated and has lecturer role
 */
function LecturerRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'LECTURER' && user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * App Router Component
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterNew />} />
      
      <Route path="/student/scan" element={
        <StudentRoute>
          <StudentScanner />
        </StudentRoute>
      } />

      <Route path="/student/dashboard" element={
        <StudentRoute>
          <StudentDashboard />
        </StudentRoute>
      } />
      
      <Route path="/lecturer/dashboard" element={
        <LecturerRoute>
          <LecturerDashboard />
        </LecturerRoute>
      } />

      <Route path="/analytics" element={
        <LecturerRoute>
          <AnalyticsDashboard />
        </LecturerRoute>
      } />
      
      <Route path="/admin/dashboard" element={
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      } />
      
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/**
 * Main App Component
 * Sets up providers and global error handling
 */
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <NotificationContainer />
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
