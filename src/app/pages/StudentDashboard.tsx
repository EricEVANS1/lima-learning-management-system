import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, CheckCircle, Award, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';

interface DashboardStats {
  enrolledSubjects: number;
  completedExams: number;
  submittedAssignments: number;
  averageGrade: number;
}

interface Exam {
  id: string;
  title: string;
  subjectId: string;
  duration: number;
  startDate: string;
  endDate: string;
}

interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName?: string;
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  score: number;
  letterGrade: string;
  feedback: string;
  createdAt?: string;
}

export const StudentDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledSubjects: 0,
    completedExams: 0,
    submittedAssignments: 0,
    averageGrade: 0
  });
  const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);
  const [recentGrades, setRecentGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

  useEffect(() => {
    fetchAnalytics();
    fetchExams();
    fetchGrades();
    fetchSubjects();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics`, { headers: authHeaders });


      if (res.ok) {
        const data = await res.json();

        setStats({
        enrolledSubjects: data.enrolledSubjects ?? data.totalSubjects ?? 0,
        completedExams: data.completedExams ?? data.totalExams ?? 0,
        submittedAssignments: data.submittedAssignments ?? data.pendingSubmissions ?? 0,
        averageGrade: data.averageGrade ?? 0,
      });
    }
    } catch (e) { console.error(e); }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exams`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const now = new Date();
        const upcoming = (data.exams || [])
          .filter((e: Exam) => new Date(e.startDate) > now)
          .sort((a: Exam, b: Exam) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 5);
        setUpcomingExams(upcoming);
      }
    } catch (e) { console.error(e); }
  };

  const fetchGrades = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/grades`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.grades || [])
          .sort((a: Grade, b: Grade) =>
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 5);
        setRecentGrades(sorted);
      }
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
      }
    } catch (e) { console.error(e); }
  };

  const getSubjectName = (id: string) =>
    subjects.find(s => s.id === id)?.name || 'Unknown Subject';

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const getUrgencyColor = (dateStr: string) => {
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return 'text-red-500 dark:text-red-400';
    if (days <= 3) return 'text-orange-500 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getGradeColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950';
    if (score >= 75) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950';
  };

  const statCards = [
    { title: 'Enrolled Subjects', value: stats.enrolledSubjects, icon: BookOpen, color: 'bg-blue-500', lightColor: 'bg-blue-50 dark:bg-blue-950' },
    { title: 'Completed Exams', value: stats.completedExams, icon: CheckCircle, color: 'bg-green-500', lightColor: 'bg-green-50 dark:bg-green-950' },
    { title: 'Submitted Assignments', value: stats.submittedAssignments, icon: Clock, color: 'bg-orange-500', lightColor: 'bg-orange-50 dark:bg-orange-950' },
    { title: 'Average Grade', value: `${stats.averageGrade}%`, icon: Award, color: 'bg-purple-500', lightColor: 'bg-purple-50 dark:bg-purple-950' }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-muted-foreground">Track your academic progress and upcoming deadlines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.lightColor}`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{card.value ?? 0}</h3>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams Widget */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <Calendar className="text-indigo-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Upcoming Exams</h3>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="text-green-400 mb-2" size={32} />
              <p className="text-sm text-muted-foreground">No upcoming exams — you're all clear!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exam.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{getSubjectName(exam.subjectId)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={11} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{exam.duration} min · {formatDate(exam.startDate)}</span>
                    </div>
                  </div>
                  <div className="ml-3 text-right shrink-0">
                    <span className={`text-xs font-semibold ${getUrgencyColor(exam.startDate)}`}>
                      {getDaysUntil(exam.startDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Grades Widget */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <TrendingUp className="text-purple-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Recent Grades</h3>
          </div>

          {recentGrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="text-muted-foreground mb-2" size={32} />
              <p className="text-sm text-muted-foreground">No grades recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentGrades.map((grade) => (
                <div key={grade.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{getSubjectName(grade.subjectId)}</p>
                    {grade.feedback && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{grade.feedback}</p>
                    )}
                  </div>
                  <div className="ml-3 shrink-0 flex items-center gap-2">
                    <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${getGradeColor(grade.score)}`}>
                      {grade.score}%
                    </span>
                    {grade.letterGrade && (
                      <span className="text-xs font-semibold text-muted-foreground">{grade.letterGrade}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
