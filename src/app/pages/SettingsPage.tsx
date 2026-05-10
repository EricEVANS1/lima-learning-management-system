import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { User, Bell, Lock, Save } from 'lucide-react';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal';
import { API_BASE_URL } from '../../utils/supabase-client';
import { toast } from 'sonner';

export const SettingsPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profileForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileForm.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: profileForm.name,
          email: profileForm.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <form onSubmit={saveProfile} className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <User className="text-blue-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Profile Information</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-input bg-muted text-muted-foreground capitalize cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Role cannot be changed from settings.
              </p>
            </div>

            {user?.student_number && (
              <div>
                <label className="block text-sm font-medium mb-2">Student Number</label>
                <input
                  type="text"
                  value={user.student_number}
                  disabled
                  className="w-full px-4 py-2 rounded-lg border border-input bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={saving}>
              <Save className="mr-2" size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <Bell className="text-purple-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Notifications</h3>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Email notifications</span>
              <input type="checkbox" className="w-5 h-5 rounded border-input" defaultChecked />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Assignment reminders</span>
              <input type="checkbox" className="w-5 h-5 rounded border-input" defaultChecked />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Grade updates</span>
              <input type="checkbox" className="w-5 h-5 rounded border-input" defaultChecked />
            </label>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <Lock className="text-orange-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Security</h3>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </Button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};