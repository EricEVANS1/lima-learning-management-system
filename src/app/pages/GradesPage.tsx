import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';

interface Grade {
  id: string;
  studentId: string;
  studentName?: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  subject?: {
    id: string;
    name: string;
    code?: string;
  };
  student?: {
    id: string;
    name: string;
    student_number?: string;
  };
  score: number;
  letterGrade: string;
  feedback: string;
  gradeType?: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
  teacherId?: string;
}

interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
}

export const GradesPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [newGrade, setNewGrade] = useState({
  studentId: '',
  subjectId: '',
  score: 0,
  gradeType: 'manual',
  feedback: ''
});

useEffect(() => {
  fetchGrades();
  fetchSubjects();

  if (user?.role === 'teacher' || user?.role === 'admin') {
    fetchStudents();
    fetchEnrollments();
  }
}, [user?.role]);

  const authHeaders = {
    'Authorization': `Bearer ${accessToken}`
  };

  const fetchGrades = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/grades`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setGrades(data.grades || []);
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users?role=student`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/enrollments`, { headers: authHeaders });
      if (response.ok) {
        const data = await response.json();
        setEnrollments(data.enrollments || []);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
    }
  };

  const getStudentsForSelectedSubject = () => {
    if (!newGrade.subjectId) return [];

    const enrolledStudentIds = enrollments
      .filter((enrollment) => enrollment.subjectId === newGrade.subjectId)
      .map((enrollment) => enrollment.studentId);

    return students.filter((student) => enrolledStudentIds.includes(student.id));
  };

const getStudentName = (grade: Grade) => {
  return (
    grade.studentName ||
    grade.student?.name ||
    students.find((s) => s.id === grade.studentId)?.name ||
    `Student ${grade.studentId?.substring(0, 8)}`
  );
};

const getSubjectName = (grade: Grade) => {
  return (
    grade.subjectName ||
    grade.subject?.name ||
    subjects.find((s) => s.id === grade.subjectId)?.name ||
    `Subject ${grade.subjectId?.substring(0, 8)}`
  );
};

  const createGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/grades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(newGrade)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewGrade({
        studentId: '',
        subjectId: '',
        score: 0,
        gradeType: 'manual',
        feedback: ''
  });
        fetchGrades();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create grade');
      }
    } catch (error) {
      console.error('Failed to create grade:', error);
      setError('Failed to create grade');
    }
  };

  const deleteGrade = async (gradeId: string) => {
    if (!confirm('Are you sure you want to delete this grade?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/grades/${gradeId}`, {
        method: 'DELETE',
        headers: authHeaders
      });

      if (response.ok) {
        fetchGrades();
      }
    } catch (error) {
      console.error('Failed to delete grade:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Grades</h1>
          <p className="text-muted-foreground">
            {user?.role === 'student' ? 'View your academic performance' : 'Manage student grades'}
          </p>
        </div>

        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2" size={20} />
            Add Grade
          </Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {user?.role !== 'student' && <th className="text-left p-4">Student</th>}
              <th className="text-left p-4">Subject</th>
              <th className="text-left p-4">Category</th>
              <th className="text-left p-4">Score</th>
              <th className="text-left p-4">Grade</th>
              <th className="text-left p-4">Feedback</th>
              
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <th className="text-left p-4">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {grades.length === 0 ? (
              <tr>
                <td colSpan={user?.role === 'student' ? 5 : 7} className="text-center p-8 text-muted-foreground">
                  No grades available
                </td>
              </tr>
            ) : (
              grades.map((grade) => (
                <tr key={grade.id} className="border-t border-border hover:bg-muted/50">
                  {user?.role !== 'student' && (
                     <td className="p-4">{getStudentName(grade)}</td>
                  )}
                  <td className="p-4">{getSubjectName(grade)}</td>
                  <td className="p-4 capitalize">
                     {grade.gradeType || 'manual'}
                   </td>
                  <td className="p-4 font-medium">{grade.score}%</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      grade.letterGrade === 'A' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                      grade.letterGrade === 'B' ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' :
                      grade.letterGrade === 'C' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                    }`}>
                      {grade.letterGrade}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{grade.feedback || '-'}</td>
                  {(user?.role === 'teacher' || user?.role === 'admin') && (
                    <td className="p-4">
                      <button
                        onClick={() => deleteGrade(grade.id)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add Grade</h2>

            <form onSubmit={createGrade} className="space-y-4">
              {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <select
                  value={newGrade.subjectId}
                  onChange={(e) => setNewGrade({ ...newGrade, subjectId: e.target.value, studentId: '' })}
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

              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <select
                  value={newGrade.studentId}
                  onChange={(e) => setNewGrade({ ...newGrade, studentId: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!newGrade.subjectId}
                  required
                >
                  <option value="">
                    {newGrade.subjectId ? 'Select enrolled student' : 'Select subject first'}
                  </option>
                  {getStudentsForSelectedSubject().map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} {student.email ? `(${student.email})` : ''}
                    </option>
                  ))}
                </select>
                {newGrade.subjectId && getStudentsForSelectedSubject().length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No students are enrolled in this subject yet.
                  </p>
                )}
              </div>

              <div>
                 <label className="block text-sm font-medium mb-2">Grade Category</label>
                 <select
                   value={newGrade.gradeType}
                   onChange={(e) => setNewGrade({ ...newGrade, gradeType: e.target.value })}
                   className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                   required
                >
                   <option value="assignment">Assignment</option>
                   <option value="exam">Exam</option>
                   <option value="participation">Participation</option>
                   <option value="manual">Manual</option>
                 </select>
               </div>

              <div>
                <label className="block text-sm font-medium mb-2">Score (0-100)</label>
                <input
                  type="number"
                  value={newGrade.score}
                  onChange={(e) => setNewGrade({ ...newGrade, score: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Feedback</label>
                <textarea
                  value={newGrade.feedback}
                  onChange={(e) => setNewGrade({ ...newGrade, feedback: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="primary" className="flex-1">
                  Add Grade
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
