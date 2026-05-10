import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';

interface Grade {
  id: string;
  studentId: string;
  studentName?: string;
  subjectId: string;
  subjectName?: string;
  subject?: { id: string; name: string; code?: string };
  score: number;
  letterGrade: string;
  createdAt?: string;
}

export const AnalyticsPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    fetchGrades();
  }, [accessToken]);

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/grades`, { headers: authHeaders });

      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades || []);
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (grade: Grade) =>
    grade.subjectName ||
    grade.subject?.name ||
    `Subject ${grade.subjectId?.substring(0, 8)}`;

  const getProgressData = () => {
    const grouped: Record<string, { month: string; total: number; count: number }> = {};

    grades.forEach((grade) => {
      const date = new Date(grade.createdAt || new Date());
      const month = date.toLocaleDateString('en-US', { month: 'short' });

      if (!grouped[month]) grouped[month] = { month, total: 0, count: 0 };

      grouped[month].total += Number(grade.score || 0);
      grouped[month].count += 1;
    });

    return Object.values(grouped).map((item) => ({
      month: item.month,
      avgScore: Math.round(item.total / item.count),
    }));
  };

  const getPerformanceData = () => {
    const grouped: Record<string, { subject: string; total: number; count: number }> = {};

    grades.forEach((grade) => {
      const subject = getSubjectName(grade);

      if (!grouped[subject]) grouped[subject] = { subject, total: 0, count: 0 };

      grouped[subject].total += Number(grade.score || 0);
      grouped[subject].count += 1;
    });

    return Object.values(grouped).map((item) => ({
      subject: item.subject,
      score: Math.round(item.total / item.count),
    }));
  };

  const getGradeDistribution = () => {
    const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

    grades.forEach((grade) => {
      const letter = grade.letterGrade || 'F';
      distribution[letter] = (distribution[letter] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  };

  const progressData = getProgressData();
  const performanceData = getPerformanceData();
  const distributionData = getGradeDistribution();

  const averageScore =
    grades.length > 0
      ? Math.round(grades.reduce((sum, g) => sum + Number(g.score || 0), 0) / grades.length)
      : 0;

  const title =
    user?.role === 'student'
      ? 'My Analytics'
      : user?.role === 'teacher'
        ? 'Class Analytics'
        : 'System Analytics';

  const subtitle =
    user?.role === 'student'
      ? 'Track your academic performance'
      : user?.role === 'teacher'
        ? 'View performance for your students and subjects'
        : 'View overall student performance across the LMS';

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (grades.length === 0) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">No grade data available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground">Total Grades</p>
          <h3 className="text-3xl font-bold mt-2">{grades.length}</h3>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground">Average Score</p>
          <h3 className="text-3xl font-bold mt-2">{averageScore}%</h3>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <p className="text-sm text-muted-foreground">Subjects Graded</p>
          <h3 className="text-3xl font-bold mt-2">{performanceData.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Progress Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2} name="Average Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Performance by Subject</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="subject" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="score" fill="#8b5cf6" name="Average Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Grade Distribution</h3>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={distributionData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={120}
              dataKey="value"
            >
              {distributionData.map((_, index) => (
                <Cell key={index} fill={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'][index % 5]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};