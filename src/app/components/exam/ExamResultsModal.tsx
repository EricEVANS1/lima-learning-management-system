import React, { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, Clock, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppModal } from '../ui/AppModal';
import { API_BASE_URL } from '../../../utils/supabase-client';

interface Submission {
  id: string;
  studentId?: string;
  studentName?: string;
  student?: { name?: string };
  score?: number;
  obtainedMarks?: number;
  obtained_marks?: number;
  totalMarks?: number;
  total_marks?: number;
  percentage?: number;
  submittedAt?: string;
  submitted_at?: string;
  answers?: number[];
}

interface ExamResultsModalProps {
  exam: {
    id: string;
    title: string;
    questions: any[];
    duration: number;
  };
  onClose: () => void;
}

export const ExamResultsModal: React.FC<ExamResultsModalProps> = ({ exam, onClose }) => {
  const { accessToken } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [exam.id]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exams/${exam.id}/submissions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const examTotalMarks =
    exam.questions?.reduce((sum: number, q: any) => sum + Number(q.marks || 1), 0) || 0;

  const getObtainedMarks = (submission: Submission) =>
    Number(submission.obtainedMarks ?? submission.obtained_marks ?? submission.score ?? 0);

  const getTotalMarks = (submission: Submission) =>
    Number(submission.totalMarks ?? submission.total_marks ?? examTotalMarks);

  const getPercentage = (submission: Submission) => {
    const rawPercentage = submission.percentage;

    if (
      rawPercentage !== undefined &&
      rawPercentage !== null &&
      !Number.isNaN(Number(rawPercentage))
    ) {
      return Math.round(Number(rawPercentage));
    }

    const obtained = getObtainedMarks(submission);
    const total = getTotalMarks(submission);

    return total > 0 ? Math.round((obtained / total) * 100) : 0;
  };

  const getStudentName = (submission: Submission) =>
    submission.studentName || submission.student?.name || 'Student';

  const getSubmittedAt = (submission: Submission) =>
    submission.submittedAt || submission.submitted_at;

  const averagePercentage =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, sub) => sum + getPercentage(sub), 0) / submissions.length
        )
      : 0;

  const averageMarks =
    submissions.length > 0
      ? Math.round(
          submissions.reduce((sum, sub) => sum + getObtainedMarks(sub), 0) / submissions.length
        )
      : 0;

  const passing = submissions.filter((sub) => getPercentage(sub) >= 50).length;

  const getScoreColor = (submission: Submission) => {
    const pct = getPercentage(submission);
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
  };

  const getScoreBg = (submission: Submission) => {
    const pct = getPercentage(submission);
    if (pct >= 80) return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
    if (pct >= 50) return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
  };

     return (
       <AppModal
         title="Exam Results"
         subtitle={exam.title}
         onClose={onClose}
         maxWidth="max-w-3xl"
      >

        {!loading && submissions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-border bg-muted/40">
            <div className="text-center">
              <p className="text-3xl font-bold">{submissions.length}</p>
              <p className="text-sm text-muted-foreground mt-1">Total Submissions</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                {averageMarks}
                <span className="text-lg text-muted-foreground">/{examTotalMarks}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Average Score ({averagePercentage}%)
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{passing}</p>
              <p className="text-sm text-muted-foreground mt-1">Passing (≥50%)</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading results...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No submissions yet</p>
              <p className="text-sm mt-1">Students haven't submitted this exam yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => {
                const obtained = getObtainedMarks(sub);
                const total = getTotalMarks(sub);
                const percentage = getPercentage(sub);
                const submittedAt = getSubmittedAt(sub);

                return (
                  <div key={sub.id} className={`border rounded-lg overflow-hidden ${getScoreBg(sub)}`}>
                    <button
                      className="w-full flex items-center justify-between p-4 text-left"
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                          <User size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{getStudentName(sub)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock size={11} />
                            {submittedAt ? new Date(submittedAt).toLocaleString() : '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xl font-bold ${getScoreColor(sub)}`}>
                            {obtained}/{total}
                          </p>
                          <p className="text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                        {expandedId === sub.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </button>

                    {expandedId === sub.id && sub.answers && exam.questions && (
                      <div className="border-t border-border/50 p-4 space-y-2 bg-background/50">
                        <p className="text-sm font-medium text-muted-foreground mb-3">
                          Answer Breakdown
                        </p>

                        {exam.questions.map((q: any, qi: number) => {
                          const studentAnswer = sub.answers![qi];
                          const isCorrect = studentAnswer === q.correctAnswer;

                          return (
                            <div key={qi} className="flex items-start gap-3 text-sm p-2 rounded">
                              {isCorrect ? (
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                              )}

                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{q.question}</p>
                                <p className="text-muted-foreground text-xs mt-0.5">
                                  Student:{' '}
                                  {studentAnswer >= 0
                                    ? String.fromCharCode(65 + studentAnswer)
                                    : 'No answer'}{' '}
                                  &nbsp;|&nbsp; Correct: {String.fromCharCode(65 + q.correctAnswer)}
                                  &nbsp;|&nbsp; {isCorrect ? `+${q.marks || 1} mark` : '0 marks'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          </div>
        
        </AppModal>

        );



      };
