import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { BottomNav } from './components/layout/BottomNav';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SubjectsPage } from './pages/SubjectsPage';
import { ExamsPage } from './pages/ExamsPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { GradesPage } from './pages/GradesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MessagesPage } from './pages/MessagesPage';
import { UsersPage } from './pages/UsersPage';
import { TranscriptPage } from './pages/TranscriptPage';
import { StudentsPage } from './pages/StudentsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar userRole={user.role} />
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <Topbar />
        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const getDashboard = () => {
    if (user.role === 'admin') {
      return <AdminDashboard />;
    } else if (user.role === 'teacher') {
      return <TeacherDashboard />;
    }
    return <StudentDashboard />;
  };

  return (
    <BrowserRouter>
      <DashboardLayout>
        <Routes>
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={getDashboard()} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/grades" element={<GradesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/transcript" element={<TranscriptPage />} />
          <Route path="/transcript/:studentId" element={<TranscriptPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </DashboardLayout>
    </BrowserRouter>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <AppContent />
    </AuthProvider>
  );
}