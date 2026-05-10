import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, XCircle, Printer, Download } from 'lucide-react';
import { useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { API_BASE_URL } from '../../utils/supabase-client';

interface TranscriptRow {
  subjectId: string;
  subjectName: string;
  subjectCode?: string | null;
  passMark: number;
  assignmentAvg: number | null;
  examAvg: number | null;
  participationAvg: number | null;
  manualAvg: number | null;
  finalAverage: number | null;
  letterGrade: string;
  status: 'Pass' | 'Fail' | 'No grades';
}

export const TranscriptPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const { studentId } = useParams();
  const [error, setError] = useState('');
  const [transcript, setTranscript] = useState<TranscriptRow[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);



useEffect(() => {
  if (!accessToken) return;
  fetchTranscript();
}, [accessToken, studentId]);

 const fetchTranscript = async () => {
  try {
    setLoading(true);
    setError('');

    const endpoint = studentId
      ? `${API_BASE_URL}/transcript/${studentId}`
      : `${API_BASE_URL}/transcript`;

    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Failed to load transcript');
      return;
    }

    setStudent(data.student);
    setTranscript(data.transcript || []);
  } catch (error) {
    console.error('Failed to fetch transcript:', error);
    setError('Failed to load transcript');
  } finally {
    setLoading(false);
  }
};
  const printTranscript = () => {
  window.print();
};

  const formatScore = (score: number | null) => {
    return score === null ? '-' : `${score}%`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Pass') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          <CheckCircle size={14} />
          Pass
        </span>
      );
    }

    if (status === 'Fail') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
          <XCircle size={14} />
          Fail
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground">
        No grades
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="text-primary" size={28} />
          <h1 className="text-3xl font-bold">Transcript</h1>
        </div>
        <p className="text-muted-foreground">
          Weighted academic performance by subject
        </p>

        <div className="flex gap-3 mt-4 print:hidden">

         <Button variant="secondary" onClick={printTranscript}>
          <Printer className="mr-2" size={16} />
           Print
       </Button>

         <Button variant="primary" onClick={printTranscript}>
           <Download className="mr-2" size={16} />
            Save as PDF
        </Button>
     </div>

     {error && (
       <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
         {error}
       </div>
      )}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">Student Information</h2>
        <p className="text-sm text-muted-foreground">
          Name: <span className="font-medium text-foreground">{student?.name || user?.name}</span>
        </p>
        {student?.student_number && (
          <p className="text-sm text-muted-foreground">
            Student Number:{' '}
            <span className="font-medium text-foreground">{student.student_number}</span>
          </p>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading transcript...
          </div>
        ) : transcript.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No transcript data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-4">Subject</th>
                  <th className="text-left p-4">Assignment Avg</th>
                  <th className="text-left p-4">Exam Avg</th>
                  <th className="text-left p-4">Participation</th>
                  <th className="text-left p-4">Manual</th>
                  <th className="text-left p-4">Final Average</th>
                  <th className="text-left p-4">Letter Grade</th>
                  <th className="text-left p-4">Pass Mark</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {transcript.map((row) => (
                  <tr key={row.subjectId} className="border-t border-border hover:bg-muted/50">
                    <td className="p-4">
                      <p className="font-medium">{row.subjectName}</p>
                      {row.subjectCode && (
                        <p className="text-xs text-muted-foreground">{row.subjectCode}</p>
                      )}
                    </td>
                    <td className="p-4">{formatScore(row.assignmentAvg)}</td>
                    <td className="p-4">{formatScore(row.examAvg)}</td>
                    <td className="p-4">{formatScore(row.participationAvg)}</td>
                    <td className="p-4">{formatScore(row.manualAvg)}</td>
                    <td className="p-4 font-semibold">{formatScore(row.finalAverage)}</td>
                    <td className="p-4 font-semibold">{row.letterGrade}</td>
                    <td className="p-4">{row.passMark}%</td>
                    <td className="p-4">{getStatusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};