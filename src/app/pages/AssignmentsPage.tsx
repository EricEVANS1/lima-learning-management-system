import React, { useState, useEffect } from 'react';
import {
  Plus, Upload, Clock, Pencil, Trash2, Users, FileText,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';
import { AssignmentFormModal } from '../components/assignment/AssignmentFormModal';
import { AssignmentSubmissionsModal } from '../components/assignment/AssignmentSubmissionsModal';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  dueDate: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  fileUrl: string;
  submittedAt: string;
  status: string;
  score?: number;
  feedback?: string;
}

export const AssignmentsPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [submissionsAssignment, setSubmissionsAssignment] = useState<Assignment | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isStaff = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    fetchAssignments();
    fetchSubmissions();
  }, []);

  const fetchAssignments = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/assignments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const d = await r.json();
        setAssignments(d.assignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/assignment-submissions`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        const d = await r.json();
        setSubmissions(d.submissions || []);
      }
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    if (!window.confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
    setDeletingId(assignment.id);
    try {
      const r = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (r.ok) {
        toast.success('Assignment deleted');
        fetchAssignments();
      } else {
        const d = await r.json();
        toast.error(d.error || 'Failed to delete assignment');
      }
    } catch {
      toast.error('Failed to delete assignment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (assignmentId: string, file: File) => {
    setUploadingId(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const submitRes = await fetch(
        `${API_BASE_URL}/assignments/${assignmentId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
             fileName: uploadData.fileName,
             filePath: uploadData.filePath || uploadData.path,
           }),
        }
      );
      const submitData = await submitRes.json().catch(() => ({}));
      if (submitRes.ok) {
        toast.success('Assignment submitted successfully!');
        fetchSubmissions();
      } else {
        toast.error(submitData.error || 'Failed to submit assignment');
      }
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingId(null);
    }
  };

  const getStudentSubmission = (assignmentId: string) =>
    submissions.find((s) => s.assignmentId === assignmentId && s.studentId === user?.id);

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  // Helper: how many submissions does an assignment have (for staff badge)
  const submissionCount = (assignmentId: string) =>
    submissions.filter((s) => s.assignmentId === assignmentId).length;

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Assignments</h1>
          <p className="text-muted-foreground">Manage and submit assignments</p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2" size={20} />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assignments.map((assignment) => {
          const studentSub = getStudentSubmission(assignment.id);
          const overdue = isOverdue(assignment.dueDate);
          const count = submissionCount(assignment.id);

          return (
            <div
              key={assignment.id}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow flex flex-col gap-4"
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold mb-1 truncate">{assignment.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
                </div>

                {/* Staff action buttons */}
                {isStaff && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* View submissions */}
                    <button
                      onClick={() => setSubmissionsAssignment(assignment)}
                      className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors relative"
                      title="View submissions"
                    >
                      <Users size={16} />
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
                          {count > 9 ? '9+' : count}
                        </span>
                      )}
                    </button>
                    {/* Edit */}
                    <button
                      onClick={() => setEditingAssignment(assignment)}
                      className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit assignment"
                    >
                      <Pencil size={16} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(assignment)}
                      disabled={deletingId === assignment.id}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      title="Delete assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {/* Student submission badge */}
                {user?.role === 'student' && studentSub && (
                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${
                      studentSub.status === 'graded'
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {studentSub.status}
                  </span>
                )}
              </div>

              {/* Due date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={15} />
                <span className={overdue && !studentSub ? 'text-destructive font-medium' : ''}>
                  Due: {new Date(assignment.dueDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {overdue && !studentSub && '  · Overdue'}
                </span>
              </div>

              {/* Staff: submission count pill */}
              {isStaff && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-lg">
                    <FileText size={12} />
                    {count} submission{count !== 1 ? 's' : ''}
                  </span>
                  {overdue ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg">
                      <AlertCircle size={11} /> Closed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-2 py-1 rounded-lg">
                      <CheckCircle size={11} /> Open
                    </span>
                  )}
                </div>
              )}

              {/* Student: submission area */}
              {user?.role === 'student' && (
                <>
                  {!studentSub && !overdue && (
                    <div>
                      <input
                        type="file"
                        id={`file-${assignment.id}`}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.zip"
                        onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                          handleFileUpload(assignment.id, file);
                          e.target.value = '';
                        }
                      }}
                        disabled={uploadingId === assignment.id}
                      />
                      <label htmlFor={`file-${assignment.id}`}>
                        <Button
                          type="button"
                          variant="primary"
                          className="w-full cursor-pointer"
                          disabled={uploadingId === assignment.id}
                          onClick={() => {
                          const input = document.getElementById(`file-${assignment.id}`) as HTMLInputElement | null;
                          input?.click();
                       }}
                    >
                        <Upload className="mr-2" size={18} />
                        {uploadingId === assignment.id ? 'Uploading...' : 'Submit Assignment'}
                    </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">
                        Accepted: PDF, DOC, DOCX, ZIP · One submission only
                      </p>
                    </div>
                  )}

                  {!studentSub && overdue && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
                      <AlertCircle size={15} />
                      Submission closed — due date has passed.
                    </div>
                  )}

                  {studentSub && (
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <FileText size={15} className="text-primary" />
                        {studentSub.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(studentSub.submittedAt).toLocaleString()}
                      </p>
                      {studentSub.score !== undefined && (
                        <div className="border-t border-border pt-2 mt-2">
                          <p className="text-sm">
                            <span className="font-medium">Score:</span> {studentSub.score}
                          </p>
                          {studentSub.feedback && (
                            <p className="text-sm mt-1">
                              <span className="font-medium">Feedback:</span> {studentSub.feedback}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {assignments.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No assignments found</p>
            {isStaff && (
              <p className="text-sm mt-1">
                Click <strong>Create Assignment</strong> to add one.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <AssignmentFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchAssignments}
        />
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <AssignmentFormModal
          assignmentToEdit={editingAssignment}
          onClose={() => setEditingAssignment(null)}
          onSuccess={fetchAssignments}
        />
      )}

      {/* Submissions Modal */}
      {submissionsAssignment && (
        <AssignmentSubmissionsModal
          assignment={submissionsAssignment}
          onClose={() => setSubmissionsAssignment(null)}
        />
      )}
    </div>
  );
};
