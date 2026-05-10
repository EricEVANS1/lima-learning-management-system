import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, BookOpen, FileText, Award, TrendingUp, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';

interface AdminStats {
  totalUsers: number;
  totalSubjects: number;
  totalExams: number;
  totalGrades: number;
  userChange: number;
  subjectChange: number;
  examChange: number;
  gradeChange: number;
  databaseUsage: number;
  storageUsage: number;
  apiPerformance: number;
}

export const AdminDashboard: React.FC = () => {
  const { accessToken, signUp } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalSubjects: 0,
    totalExams: 0,
    totalGrades: 0,
    userChange: 0,
    subjectChange: 0,
    examChange: 0,
    gradeChange: 0,
    databaseUsage: 0,
    storageUsage: 0,
    apiPerformance: 0,
  });

  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignmentForm, setAssignmentForm] = useState({ studentId: '', subjectId: '' });
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [assignmentError, setAssignmentError] = useState('');
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
  });
  const [createUserMessage, setCreateUserMessage] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  useEffect(() => {
    fetchAnalytics();
    fetchAllData();
  }, []);

  const formatChange = (value: number) => {
    if (value > 0) return `+${value}%`;
    if (value < 0) return `${value}%`;
    return '0%';
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics`, { headers: authHeaders });

      if (response.ok) {
        const data = await response.json();

        setStats({
          totalUsers: data.totalUsers ?? 0,
          totalSubjects: data.totalSubjects ?? 0,
          totalExams: data.totalExams ?? 0,
          totalGrades: data.totalGrades ?? 0,
          userChange: data.userChange ?? 0,
          subjectChange: data.subjectChange ?? 0,
          examChange: data.examChange ?? 0,
          gradeChange: data.gradeChange ?? 0,
          databaseUsage: data.databaseUsage ?? 0,
          storageUsage: data.storageUsage ?? 0,
          apiPerformance: data.apiPerformance ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchAllData = async () => {
    try {
      const [subjectsRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/users?role=student`, { headers: authHeaders }),
      ]);

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData.subjects || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserMessage('');
    setCreateUserError('');
    setCreateUserLoading(true);

    try {
      await signUp(
        createUserForm.email,
        createUserForm.password,
        createUserForm.name,
        createUserForm.role
      );

      setCreateUserMessage(`Account created successfully for ${createUserForm.email}.`);
      setCreateUserForm({ name: '', email: '', password: '', role: 'student' });
      fetchAllData();
      fetchAnalytics();
    } catch (err: any) {
      setCreateUserError(err.message || 'Failed to create user.');
    } finally {
      setCreateUserLoading(false);
    }
  };

  const assignSubjectToStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentMessage('');
    setAssignmentError('');

    try {
      const response = await fetch(`${API_BASE_URL}/subjects/${assignmentForm.subjectId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ studentId: assignmentForm.studentId }),
      });

      const data = await response.json();

      if (response.ok) {
        setAssignmentMessage(data.message || 'Subject assigned successfully.');
        setAssignmentForm({ studentId: '', subjectId: '' });
        fetchAnalytics();
      } else {
        setAssignmentError(data.error || 'Failed to assign subject.');
      }
    } catch (error) {
      console.error('Failed to assign subject:', error);
      setAssignmentError('Failed to assign subject.');
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50 dark:bg-blue-950',
      change: formatChange(stats.userChange),
    },
    {
      title: 'Total Subjects',
      value: stats.totalSubjects,
      icon: BookOpen,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50 dark:bg-purple-950',
      change: formatChange(stats.subjectChange),
    },
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: FileText,
      color: 'bg-orange-500',
      lightColor: 'bg-orange-50 dark:bg-orange-950',
      change: formatChange(stats.examChange),
    },
    {
      title: 'Total Grades',
      value: stats.totalGrades,
      icon: Award,
      color: 'bg-green-500',
      lightColor: 'bg-green-50 dark:bg-green-950',
      change: formatChange(stats.gradeChange),
    },
  ];

  return (
    <div className="p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <div
              key={index}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.lightColor}`}>
                  <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <TrendingUp size={14} />
                  <span className="font-medium">{card.change}</span>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-1">{card.value ?? 0}</h3>
              <p className="text-sm text-muted-foreground">{card.title}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Assign Subject to Student</h3>

          <form onSubmit={assignSubjectToStudent} className="space-y-4">
            {assignmentMessage && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm">
                {assignmentMessage}
              </div>
            )}

            {assignmentError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {assignmentError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Student</label>
              <select
                value={assignmentForm.studentId}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, studentId: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.email ? `(${student.email})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select
                value={assignmentForm.subjectId}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} {subject.code ? `(${subject.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Assign Subject
            </Button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Subjects</h3>

          <div className="space-y-3">
            {subjects.slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects created yet</p>
            ) : (
              subjects.slice(0, 5).map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.code}</p>
                  </div>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
              <UserPlus className="text-indigo-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Create New User</h3>
          </div>

          <form onSubmit={createUser} className="space-y-4" autoComplete="off">
            {createUserMessage && (
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm">
                {createUserMessage}
              </div>
            )}

            {createUserError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {createUserError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={createUserForm.name}
                onChange={(e) =>
                  setCreateUserForm({ ...createUserForm, name: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter full name"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={createUserForm.email}
                onChange={(e) =>
                  setCreateUserForm({ ...createUserForm, email: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter email address"
                autoComplete="new-email"
                name="new-user-email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={createUserForm.password}
                onChange={(e) =>
                  setCreateUserForm({ ...createUserForm, password: e.target.value })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter temporary password"
                autoComplete="new-password"
                name="new-user-password"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <select
                value={createUserForm.role}
                onChange={(e) =>
                  setCreateUserForm({ ...createUserForm, role: e.target.value as any })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={createUserLoading}
            >
              {createUserLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Students</h3>

          <div className="space-y-3">
            {students.slice(0, 6).length === 0 ? (
              <p className="text-sm text-muted-foreground">No students found</p>
            ) : (
              students.slice(0, 6).map((student) => (
                <div key={student.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">System Health</h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Database Usage</span>
                <span className="font-medium">{stats.databaseUsage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${stats.databaseUsage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Storage Usage</span>
                <span className="font-medium">{stats.storageUsage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats.storageUsage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>API Performance</span>
                <span className="font-medium">{stats.apiPerformance}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${stats.apiPerformance}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Students</h3>

          <div className="space-y-3">
            {students.slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground">No students found</p>
            ) : (
              students.slice(0, 5).map((student) => (
                <div key={student.id} className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{student.name}</p>
                  <p className="text-xs text-muted-foreground">{student.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-4 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors text-left"
          >
            <Users className="mb-2" size={24} />
            <p className="font-semibold">Manage Users</p>
            <p className="text-xs opacity-75">View all users</p>
          </button>

          <button
            onClick={() => navigate('/subjects')}
            className="p-4 bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors text-left"
          >
            <BookOpen className="mb-2" size={24} />
            <p className="font-semibold">Manage Subjects</p>
            <p className="text-xs opacity-75">Edit subjects</p>
          </button>

          <button
            onClick={() => navigate('/analytics')}
            className="p-4 bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors text-left"
          >
            <FileText className="mb-2" size={24} />
            <p className="font-semibold">View Reports</p>
            <p className="text-xs opacity-75">Analytics reports</p>
          </button>

          <button
            onClick={() => navigate('/grades')}
            className="p-4 bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900 transition-colors text-left"
          >
            <Award className="mb-2" size={24} />
            <p className="font-semibold">Grade Overview</p>
            <p className="text-xs opacity-75">All grades</p>
          </button>
        </div>
      </div>
    </div>
  );
};