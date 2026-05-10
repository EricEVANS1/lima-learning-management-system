import React, { useState, useEffect } from 'react';
import { Plus, Users, CheckCircle, Pencil, Trash2, X, GraduationCap, Mail, Calendar, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';

interface Subject {
  id: string;
  name: string;
  description: string;
  code: string;
  teacherName: string;
  teacherId: string;
}

interface Enrollment {
  id: string;
  subjectId: string;
  studentId: string;
}

interface RosterStudent {
  id: string;
  name: string;
  email: string;
  enrolledAt: string;
}

type ModalMode = 'create' | 'edit' | null;

interface Teacher {
  id: string;
  name: string;
}

export const SubjectsPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', code: '', teacherId: '' });
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Roster state
  const [rosterSubject, setRosterSubject] = useState<Subject | null>(null);
  const [rosterStudents, setRosterStudents] = useState<RosterStudent[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const authHeaders = { 'Authorization': `Bearer ${accessToken}` };

  useEffect(() => {
    fetchSubjects();
    if (user?.role === 'student') fetchEnrollments();
    if (user?.role === 'admin') fetchTeachers();
  }, [user?.role]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users?role=teacher`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.users || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/enrollments`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
      }
    } catch (e) { console.error(e); }
  };

  const isEnrolled = (subjectId: string) =>
    enrollments.some((e) => e.subjectId === subjectId);

  const canManage = (subject: Subject) =>
    user?.role === 'admin' || (user?.role === 'teacher' && subject.teacherId === user?.id);

  // ── Create / Edit ──────────────────────────────────────────────
  const openCreate = () => {
    setEditingSubject(null);
    setSubjectForm({ name: '', description: '', code: '', teacherId: '' });
    setFormError('');
    setModalMode('create');
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectForm({ name: subject.name, description: subject.description, code: subject.code, teacherId: subject.teacherId || '' });
    setFormError('');
    setModalMode('edit');
  };

  const closeModal = () => { setModalMode(null); setEditingSubject(null); setFormError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const isEdit = modalMode === 'edit' && editingSubject;
    const url = isEdit
      ? `${API_BASE_URL}/subjects/${editingSubject.id}`
      : `${API_BASE_URL}/subjects`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ ...subjectForm, teacher_id: subjectForm.teacherId || undefined })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isEdit ? 'Subject updated!' : 'Subject created!');
        closeModal();
        fetchSubjects();
      } else {
        setFormError(data.error || 'Failed to save subject');
      }
    } catch (e) {
      setFormError('Something went wrong');
    }
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (subject: Subject) => {
    if (!window.confirm(`Delete "${subject.name}"? This cannot be undone.`)) return;
    setDeletingId(subject.id);
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      if (res.ok) {
        toast.success('Subject deleted');
        setSubjects(prev => prev.filter(s => s.id !== subject.id));
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete subject');
      }
    } catch (e) {
      toast.error('Failed to delete subject');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Roster ─────────────────────────────────────────────────────
  const openRoster = async (subject: Subject) => {
    setRosterSubject(subject);
    setRosterStudents([]);
    setRosterSearch('');
    setRosterLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/${subject.id}/roster`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const mapped = (data.roster || data.students || []).map((r: any) => ({
          id: r.studentId || r.id,
          name: r.studentName || r.name || 'Unnamed',
          email: r.email || '',
          enrolledAt: r.enrolledAt || r.enrolled_at,
        }));
        setRosterStudents(mapped);
      } else {
        toast.error('Failed to load roster');
      }
    } catch (e) {
      toast.error('Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const closeRoster = () => { setRosterSubject(null); setRosterStudents([]); };

  const filteredRoster = rosterStudents.filter(s =>
    s.name?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // ── Enroll / Unenroll ──────────────────────────────────────────
  const enrollInSubject = async (subjectId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/enroll`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (res.ok) { toast.success(data.message || 'Enrolled!'); fetchEnrollments(); }
      else toast.error(data.error || 'Failed to enroll');
    } catch (e) { toast.error('Failed to enroll'); }
  };

  const unenrollFromSubject = async (subjectId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/subjects/${subjectId}/enroll`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (res.ok) { toast.success(data.message || 'Unenrolled'); fetchEnrollments(); }
      else toast.error(data.error || 'Failed to unenroll');
    } catch (e) { toast.error('Failed to unenroll'); }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subjects</h1>
          <p className="text-muted-foreground">Browse and manage subjects</p>
        </div>
        {isTeacherOrAdmin && (
          <Button onClick={openCreate}>
            <Plus className="mr-2" size={20} />
            Create Subject
          </Button>
        )}
      </div>

      {/* Grid */}
      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="text-muted-foreground mb-3" size={48} />
          <p className="text-muted-foreground">No subjects yet. {isTeacherOrAdmin ? 'Create one to get started.' : ''}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => {
            const enrolled = isEnrolled(subject.id);
            const manageable = canManage(subject);

            return (
              <div key={subject.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
                    <GraduationCap className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {user?.role === 'student' && enrolled && (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                        <CheckCircle size={12} /> Enrolled
                      </span>
                    )}
                    <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{subject.code}</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold mb-2">{subject.name}</h3>
                <p className="text-sm text-muted-foreground mb-2 flex-1">{subject.description}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  <span className="font-medium">Teacher:</span> {subject.teacherName}
                </p>

                <div className="space-y-2 mt-auto">
                  {/* Roster button for teacher/admin */}
                  {isTeacherOrAdmin && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => openRoster(subject)}
                    >
                      <Users size={16} className="mr-2" />
                      View Roster
                    </Button>
                  )}

                  {/* Edit / Delete for owner teacher or admin */}
                  {manageable && (
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => openEdit(subject)}
                      >
                        <Pencil size={14} className="mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={deletingId === subject.id}
                        onClick={() => handleDelete(subject)}
                      >
                        <Trash2 size={14} className="mr-1.5" />
                        {deletingId === subject.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  )}

                  {/* Enroll/Unenroll for students */}
                  {user?.role === 'student' && (
                    enrolled ? (
                      <Button variant="secondary" className="w-full" onClick={() => unenrollFromSubject(subject.id)}>
                        Unenroll
                      </Button>
                    ) : (
                      <Button variant="primary" className="w-full" onClick={() => enrollInSubject(subject.id)}>
                        Enroll
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────── */}
      {modalMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">
                {modalMode === 'edit' ? 'Edit Subject' : 'Create New Subject'}
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject Name</label>
                <input
                  type="text"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Introduction to Mathematics"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Subject Code</label>
                <input
                  type="text"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., MATH101"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Brief description of the subject"
                  required
                />
              </div>

              {user?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Assign Teacher</label>
                  <select
                    value={subjectForm.teacherId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- No teacher assigned --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formError && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{formError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="submit" variant="primary" className="flex-1">
                  {modalMode === 'edit' ? 'Save Changes' : 'Create Subject'}
                </Button>
                <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Roster Modal ────────────────────────────────────────────── */}
      {rosterSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold">{rosterSubject.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Student Roster · <span className="font-mono">{rosterSubject.code}</span>
                </p>
              </div>
              <button onClick={closeRoster} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Search students…"
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-input bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {rosterLoading ? (
                <div className="space-y-3 mt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredRoster.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="text-muted-foreground mb-2" size={36} />
                  <p className="text-sm text-muted-foreground">
                    {rosterSearch ? 'No students match your search' : 'No students enrolled yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {filteredRoster.map((student, index) => (
                    <div key={student.id} className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {(student.name || student.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.name || 'Unnamed'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                        </div>
                        {student.enrolledAt && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar size={11} className="text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Enrolled {new Date(student.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                      </div>
                      <span className="text-xs bg-background border border-border px-2 py-1 rounded-full text-muted-foreground shrink-0">
                        #{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!rosterLoading && (
              <div className="px-6 pb-4 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {filteredRoster.length} student{filteredRoster.length !== 1 ? 's' : ''} enrolled
                  {rosterSearch && rosterStudents.length !== filteredRoster.length && ` (${rosterStudents.length} total)`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};