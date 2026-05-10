import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/supabase-client';
import { Button } from '../ui/button';

interface Assignment {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  dueDate: string;
}

interface AssignmentFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
  assignmentToEdit?: Assignment | null;
}

export const AssignmentFormModal: React.FC<AssignmentFormModalProps> = ({
  onClose,
  onSuccess,
  assignmentToEdit,
}) => {
  const { accessToken } = useAuth();
  const isEdit = !!assignmentToEdit;
  const [subjects, setSubjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: assignmentToEdit?.title || '',
    description: assignmentToEdit?.description || '',
    subjectId: assignmentToEdit?.subjectId || '',
    dueDate: assignmentToEdit?.dueDate ? assignmentToEdit.dueDate.slice(0, 16) : '',
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/subjects`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subjectId || !form.dueDate) {
      toast.error('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      const url = isEdit
        ? `${API_BASE_URL}/assignments/${assignmentToEdit!.id}`
        : `${API_BASE_URL}/assignments`;
      const method = isEdit ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        toast.success(isEdit ? 'Assignment updated!' : 'Assignment created!');
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || (isEdit ? 'Failed to update' : 'Failed to create'));
      }
    } catch {
      toast.error(isEdit ? 'Failed to update assignment' : 'Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">{isEdit ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Assignment title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Describe what students need to do..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Subject *</label>
            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Due Date & Time *</label>
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
