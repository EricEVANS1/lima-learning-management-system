import React, { useState, useEffect } from 'react';
import { Users, BookOpen, Clock, FileCheck, Plus, ClipboardList, Award, ChevronRight, FileText, Star } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';

interface DashboardStats {
  totalStudents: number;
  activeSubjects: number;
  pendingSubmissions: number;
  upcomingExams: number;
}

interface ActivityItem {
  id: string;
  type: 'exam' | 'grade' | 'assignment' | 'submission';
  title: string;
  subtitle: string;
  timestamp: string;
  badge?: string;
  badgeColor?: string;
}

interface Exam {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  duration: number;
  createdAt?: string;
}

interface Grade {
  id: string;
  score: number;
  letterGrade: string;
  subjectId: string;
  studentId?: string;
  createdAt?: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  submittedAt: string;
  status: string;
  fileName?: string;
}

export const TeacherDashboard: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeSubjects: 0,
    pendingSubmissions: 0,
    upcomingExams: 0
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

  useEffect(() => {
    fetchAnalytics();
    fetchRecentActivity();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/analytics`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();

        setStats({
          totalStudents: data.totalStudents ?? 0,
          activeSubjects: data.activeSubjects ?? data.totalSubjects ?? 0,
          pendingSubmissions: data.pendingSubmissions ?? 0,
          upcomingExams: data.upcomingExams ?? data.totalExams ?? 0,
    });
  }
    } catch (e) { console.error(e); }
  };

  const fetchRecentActivity = async () => {
    setLoadingActivity(true);
    try {
      const [examsRes, gradesRes, subjectsRes, submissionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/exams`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/grades`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/assignment-submissions`, { headers: authHeaders }).catch(() => null)
      ]);

      const subjectsData = subjectsRes.ok ? await subjectsRes.json() : { subjects: [] };
      const fetchedSubjects: Subject[] = subjectsData.subjects || [];
      setSubjects(fetchedSubjects);

      const getSubjectName = (id: string) => fetchedSubjects.find(s => s.id === id)?.name || 'Unknown Subject';

      const items: ActivityItem[] = [];

      if (examsRes.ok) {
        const data = await examsRes.json();
        (data.exams || []).slice(0, 4).forEach((exam: Exam) => {
          const now = new Date();
          const start = new Date(exam.startDate);
          const isUpcoming = start > now;
          items.push({
            id: `exam-${exam.id}`,
            type: 'exam',
            title: exam.title,
            subtitle: isUpcoming
              ? `Starts ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${exam.duration} min`
              : `Ended ${new Date(exam.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            timestamp: exam.startDate,
            badge: isUpcoming ? 'Upcoming' : 'Completed',
            badgeColor: isUpcoming ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
          });
        });
      }

      if (gradesRes.ok) {
        const data = await gradesRes.json();
        (data.grades || []).slice(0, 4).forEach((grade: Grade) => {
          const color = grade.score >= 90
            ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
            : grade.score >= 75
              ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400'
              : grade.score >= 60
                ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
                : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400';
          items.push({
            id: `grade-${grade.id}`,
            type: 'grade',
            title: `Grade recorded — ${getSubjectName(grade.subjectId)}`,
            subtitle: `Score: ${grade.score}% · ${grade.letterGrade || ''}`,
            timestamp: grade.createdAt || new Date().toISOString(),
            badge: `${grade.score}%`,
            badgeColor: color
          });
        });
      }

      if (submissionsRes && submissionsRes.ok) {
        const data = await submissionsRes.json();
        (data.submissions || []).slice(0, 3).forEach((sub: Submission) => {
          items.push({
            id: `sub-${sub.id}`,
            type: 'submission',
            title: sub.fileName ? `Submission: ${sub.fileName}` : 'Assignment submitted',
            subtitle: `Status: ${sub.status} · ${new Date(sub.submittedAt).toLocaleDateString()}`,
            timestamp: sub.submittedAt,
            badge: sub.status,
            badgeColor: sub.status === 'graded'
              ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400'
              : 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
          });
        });
      }

      // Sort by timestamp, most recent first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 8));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivity(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'exam': return <FileText size={16} className="text-indigo-500" />;
      case 'grade': return <Star size={16} className="text-purple-500" />;
      case 'submission': return <FileCheck size={16} className="text-orange-500" />;
      default: return <ClipboardList size={16} className="text-blue-500" />;
    }
  };

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: Users, color: 'bg-blue-500', lightColor: 'bg-blue-50 dark:bg-blue-950' },
    { title: 'Active Subjects', value: stats.activeSubjects, icon: BookOpen, color: 'bg-purple-500', lightColor: 'bg-purple-50 dark:bg-purple-950' },
    { title: 'Pending Submissions', value: stats.pendingSubmissions, icon: FileCheck, color: 'bg-orange-500', lightColor: 'bg-orange-50 dark:bg-orange-950' },
    { title: 'Upcoming Exams', value: stats.upcomingExams, icon: Clock, color: 'bg-green-500', lightColor: 'bg-green-50 dark:bg-green-950' }
  ];

  const quickActions = [
    {
      label: 'Create New Exam',
      description: 'Set up a timed exam for your students',
      icon: <Plus size={18} />,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      iconBg: '',
      onClick: () => navigate('/exams')
    },
    {
      label: 'Grade Assignments',
      description: 'Review and score pending submissions',
      icon: <Award size={18} />,
      color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      iconBg: '',
      onClick: () => navigate('/assignments')
    },
    {
      label: 'Manage Subjects',
      description: 'Add or edit your course subjects',
      icon: <BookOpen size={18} />,
      color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      iconBg: '',
      onClick: () => navigate('/subjects')
    },
    {
      label: 'View Grades',
      description: 'See all recorded grades',
      icon: <ClipboardList size={18} />,
      color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
      iconBg: '',
      onClick: () => navigate('/grades')
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Manage your classes and student progress</p>
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
              <h3 className="text-2xl font-bold mb-1">{card.value}</h3>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <Plus className="text-indigo-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </div>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${action.color}`}
              >
                <div className="flex items-center gap-3">
                  <span>{action.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs opacity-70">{action.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="opacity-50 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <ClipboardList className="text-purple-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Recent Activity</h3>
          </div>

          {loadingActivity ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="text-muted-foreground mb-2" size={32} />
              <p className="text-sm text-muted-foreground">No recent activity yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-1.5 bg-background rounded-md shrink-0">
                    {getActivityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  {item.badge && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
