import React, { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, CheckCircle, Pencil, Trash2, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { ExamCreator } from '../components/exam/ExamCreator';
import { ExamTaker } from '../components/exam/ExamTaker';
import { ExamResultsModal } from '../components/exam/ExamResultsModal';
import { examService } from '../services/examService';
import { PageLoader } from '../components/ui/PageLoader';
import { EmptyState } from '../components/ui/EmptyState';

interface Exam {
  id: string;
  title: string;
  subjectId: string;
  duration: number;
  startDate: string;
  endDate: string;
  questions: any[];
}

interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  deadline: string;
  submittedAt?: string | null;
  status: 'in_progress' | 'submitted' | 'expired';
  answers: number[];
}

interface SelectedExamSession {
  exam: Exam;
  attempt: ExamAttempt;
}

export const ExamsPage: React.FC = () => {
  const { user, accessToken } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SelectedExamSession | null>(null);
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [resultsExam, setResultsExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdminOrTeacher = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    if (!accessToken) return;

    fetchExams();

    if (user?.role === 'student') {
      fetchSubmissions();
    }
  }, [user?.role, accessToken]);

const fetchExams = async () => {
  try {
    setLoading(true);

    const data = await examService.getExams(accessToken);

    setExams(data.exams || []);
  } catch (error) {
    console.error('Failed to fetch exams:', error);
    toast.error('Failed to load exams');
  } finally {
    setLoading(false);
  }
};

const fetchSubmissions = async () => {
  try {
    const data = await examService.getExamSubmissions(accessToken);
    setSubmissions(data.submissions || []);
  } catch (error) {
    console.error('Failed to fetch exam submissions:', error);
    toast.error('Failed to load exam submissions');
  }
};

const handleDeleteExam = async (exam: Exam) => {
  if (!window.confirm(`Delete "${exam.title}"? This action cannot be undone.`)) return;

  setDeletingId(exam.id);

  try {
    await examService.deleteExam(exam.id, accessToken);
    toast.success('Exam deleted successfully');
    fetchExams();
  } catch (error: any) {
    toast.error(error.message || 'Failed to delete exam');
  } finally {
    setDeletingId(null);
  }
};

const handleStartExam = async (exam: Exam) => {
  setStartingExamId(exam.id);

  try {
    const data = await examService.startExam(exam.id, accessToken);

    setSelectedSession({
      exam: data.exam || exam,
      attempt: data.attempt,
    });

    if (data.resumed) {
      toast.info('Previous exam attempt resumed');
    } else {
      toast.success('Exam started');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to start exam');
  } finally {
    setStartingExamId(null);
  }
};

  const hasSubmittedExam = (examId: string) =>
    submissions.some((submission) => submission.examId === examId);

  const isExamAvailable = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);

    return now >= start && now <= end;
  };

  if (selectedSession) {
    return (
      <ExamTaker
        exam={selectedSession.exam}
        attempt={selectedSession.attempt}
        onExit={() => {
          setSelectedSession(null);
          fetchExams();

          if (user?.role === 'student') {
            fetchSubmissions();
          }
        }}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Exams</h1>
          <p className="text-muted-foreground">View and manage exams</p>
        </div>

        {isAdminOrTeacher && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2" size={20} />
            Create Exam
          </Button>
        )}
      </div>

      {loading ? (
  <PageLoader text="Loading exams..." />
) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => {
          const available = isExamAvailable(exam);
          const submitted = hasSubmittedExam(exam.id);

          return (
            <div
              key={exam.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    available ? 'bg-green-50 dark:bg-green-950' : 'bg-gray-50 dark:bg-gray-950'
                  }`}
                >
                  <Clock className={`w-6 h-6 ${available ? 'text-green-500' : 'text-gray-500'}`} />
                </div>

                {user?.role === 'student' && submitted ? (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                    <CheckCircle size={12} /> Submitted
                  </span>
                ) : user?.role === 'student' && available ? (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                    Available
                  </span>
                ) : null}

                {isAdminOrTeacher && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setResultsExam(exam)}
                      className="p-1.5 rounded hover:bg-primary/10 text-primary transition-colors"
                      title="View results"
                    >
                      <BarChart2 size={16} />
                    </button>

                    <button
                      onClick={() => setEditingExam(exam)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit exam"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDeleteExam(exam)}
                      disabled={deletingId === exam.id}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      title="Delete exam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="text-xl font-semibold mb-2">{exam.title}</h3>

              <div className="space-y-2 text-sm text-muted-foreground mb-4 flex-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{exam.duration} minutes</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{new Date(exam.startDate).toLocaleString()}</span>
                </div>

                <p>{exam.questions?.length || 0} questions</p>
              </div>

              {user?.role === 'student' && submitted && (
                <Button variant="secondary" className="w-full" disabled>
                  Already Submitted
                </Button>
              )}

              {user?.role === 'student' && !submitted && available && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStartExam(exam)}
                  disabled={startingExamId === exam.id}
                >
                  {startingExamId === exam.id ? 'Starting...' : 'Start Exam'}
                </Button>
              )}

              {user?.role === 'student' && !submitted && !available && (
                <Button variant="secondary" className="w-full" disabled>
                  Not Available
                </Button>
              )}

              {isAdminOrTeacher && (
                <div
                  className={`text-xs text-center py-1.5 px-3 rounded-md font-medium ${
                    available
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : new Date() < new Date(exam.startDate)
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {available
                    ? 'Live now'
                    : new Date() < new Date(exam.startDate)
                    ? `Starts ${new Date(exam.startDate).toLocaleString()}`
                    : 'Ended'}
                </div>
              )}
            </div>
          );
        })}

             {exams.length === 0 && (
             <div className="col-span-full">
              <EmptyState
                 icon={<Clock className="w-12 h-12" />}
                 title="No exams found"
                 description={
                   isAdminOrTeacher
                     ? 'Create your first exam to get started.'
                    : 'No exams are currently available.'
            }
          />
         </div>
       )}
        
      </div>

     
      )}

      {showCreateModal && (
        <ExamCreator
          onClose={() => {
            setShowCreateModal(false);
            fetchExams();
          }}
        />
      )}

      {editingExam && (
        <ExamCreator
          examToEdit={editingExam}
          onClose={() => {
            setEditingExam(null);
            fetchExams();
          }}
        />
      )}

      {resultsExam && (
        <ExamResultsModal
          exam={resultsExam}
          onClose={() => setResultsExam(null)}
        />
      )}
    </div>


  );
};