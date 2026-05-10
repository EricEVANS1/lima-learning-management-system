import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';

interface Student {
  id: string;
  name: string;
  email?: string;
  student_number?: string;
}

export const StudentsPage: React.FC = () => {
  const { accessToken, user } = useAuth();

  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!accessToken) return;
  fetchStudents();
}, [accessToken, user?.role]);

  const fetchStudents = async () => {
    try {
      let url = `${API_BASE_URL}/users?role=student`;

      // Teacher only sees own students
      if (user?.role === 'teacher') {
        url = `${API_BASE_URL}/teacher/students`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        setStudents(data.students || data.users || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        Loading students...
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Students
        </h1>

        <p className="text-muted-foreground">
          Manage and review student academic records
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-4">Student</th>
              <th className="text-left p-4">Student Number</th>
              <th className="text-left p-4">Email</th>
              <th className="text-left p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-center p-8 text-muted-foreground"
                >
                  No students found
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr
                  key={student.id}
                  className="border-t border-border"
                >
                  <td className="p-4 font-medium">
                    {student.name}
                  </td>

                  <td className="p-4">
                    {student.student_number || '-'}
                  </td>

                  <td className="p-4">
                    {student.email || '-'}
                  </td>

                  <td className="p-4">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        navigate(`/transcript/${student.id}`)
                      }
                    >
                      <FileText
                        className="mr-2"
                        size={16}
                      />
                      View Transcript
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};