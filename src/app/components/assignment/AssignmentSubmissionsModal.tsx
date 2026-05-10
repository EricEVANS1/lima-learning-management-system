import React, { useState, useEffect } from 'react';
import { X, User, Download, Clock, CheckCircle, FileText, Award, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/supabase-client';
import { Button } from '../ui/button';

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  fileName: string;
  filePath?: string;
  file_path?: string;
  fileUrl?: string;
  submittedAt: string;
  status: string;
  score?: number;
  feedback?: string;
}

interface AssignmentSubmissionsModalProps {
  assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
  };
  onClose: () => void;
}

export const AssignmentSubmissionsModal: React.FC<AssignmentSubmissionsModalProps> = ({
  assignment,
  onClose,
}) => {
  const { accessToken } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState<{ [key: string]: { score: string; feedback: string } }>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [assignment.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/assignments/${assignment.id}/submissions`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (sub: Submission) => {
  const filePath = sub.filePath || sub.file_path;

  if (!filePath) {
    toast.error('No file path available');
    return;
  }

  setDownloadingId(sub.id);

  try {
    const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(filePath)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      toast.error(data.error || 'Failed to get download link');
      return;
    }

    window.open(data.url, '_blank');
  } catch (error) {
    toast.error('Failed to download file');
  } finally {
    setDownloadingId(null);
  }
};




  const handleGrade = async (submissionId: string) => {
    const form = gradeForm[submissionId];
    if (!form?.score) {
      toast.error('Please enter a score');
      return;
    }
    setGradingId(submissionId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/assignment-submissions/${submissionId}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ score: Number(form.score), feedback: form.feedback || '' }),
        }
      );
      if (response.ok) {
        toast.success('Graded successfully!');
        setExpandedId(null);
        fetchSubmissions();
      } else {
        toast.error('Failed to grade submission');
      }
    } catch {
      toast.error('Failed to grade submission');
    } finally {
      setGradingId(null);
    }
  };

  const graded = submissions.filter((s) => s.status === 'graded').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold mb-1">Submissions</h2>
            <p className="text-muted-foreground text-sm line-clamp-1">{assignment.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg shrink-0 ml-3">
            <X size={22} />
          </button>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div className="grid grid-cols-3 gap-0 border-b border-border bg-muted/40 divide-x divide-border">
            <div className="text-center py-4">
              <p className="text-2xl font-bold">{submissions.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total</p>
            </div>
            <div className="text-center py-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{graded}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Graded</p>
            </div>
            <div className="text-center py-4">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {submissions.length - graded}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No submissions yet</p>
              <p className="text-sm mt-1">Students haven't submitted this assignment.</p>
            </div>
          ) : (
            submissions.map((sub) => (
              <div
                key={sub.id}
                className="border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
              >
                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={18} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{sub.studentName || 'Student'}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sub.status === 'graded'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        }`}
                      >
                        {sub.status === 'graded' ? `Graded · ${sub.score}` : 'Pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        <span className="truncate max-w-[140px]">{sub.fileName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Download */}
                    <button
                      onClick={() => handleDownload(sub)}
                      disabled={downloadingId === sub.id}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-50"
                      title="Download submission"
                    >
                      {downloadingId === sub.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download size={16} />
                      )}
                    </button>

                    {/* Expand for grading */}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === sub.id ? null : sub.id)
                      }
                      className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                      title="Grade / view details"
                    >
                      {expandedId === sub.id ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded grading panel */}
                {expandedId === sub.id && (
                  <div className="border-t border-border p-4 bg-muted/40 space-y-3">
                    {sub.status === 'graded' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-2">
                        <CheckCircle size={15} />
                        <span>
                          Score: <strong>{sub.score}</strong>
                          {sub.feedback && ` · "${sub.feedback}"`}
                        </span>
                      </div>
                    )}

                    <p className="text-sm font-medium">
                      {sub.status === 'graded' ? 'Update grade' : 'Grade this submission'}
                    </p>

                    <div className="flex gap-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Score (0–100)"
                        defaultValue={sub.score ?? ''}
                        onChange={(e) =>
                          setGradeForm((prev) => ({
                            ...prev,
                            [sub.id]: { ...prev[sub.id], score: e.target.value },
                          }))
                        }
                        className="w-36 px-3 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Feedback (optional)"
                        defaultValue={sub.feedback ?? ''}
                        onChange={(e) =>
                          setGradeForm((prev) => ({
                            ...prev,
                            [sub.id]: { ...prev[sub.id], feedback: e.target.value },
                          }))
                        }
                        className="flex-1 px-3 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      <Button
                        variant="primary"
                        onClick={() => handleGrade(sub.id)}
                        disabled={gradingId === sub.id}
                        className="shrink-0"
                      >
                        {gradingId === sub.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Send size={15} />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
