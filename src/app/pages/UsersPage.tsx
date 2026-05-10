import React, { useEffect, useMemo, useState } from 'react';
import { Search, Shield, UserRound, Users, GraduationCap, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../../utils/supabase-client';
import { Button } from '../components/ui/button';

interface LMSUser {
  id: string;
  email?: string;
  name?: string;
  role: 'student' | 'teacher' | 'admin';
  created_at?: string;
}

const roleIcons = {
  admin: Shield,
  teacher: GraduationCap,
  student: UserRound
};

export const UsersPage: React.FC = () => {
  const { user, accessToken } = useAuth();
  const [users, setUsers] = useState<LMSUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const canViewUsers = user?.role === 'admin' || user?.role === 'teacher';

  const fetchUsers = async () => {
    if (!accessToken || !canViewUsers) return;

    setLoading(true);
    setError('');

    try {
      const url = roleFilter === 'all'
        ? `${API_BASE_URL}/users`
        : `${API_BASE_URL}/users?role=${roleFilter}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load users');
      }

      setUsers(data.users || []);
    } catch (err) {
      console.error('Users fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [accessToken, roleFilter, canViewUsers]);

  const filteredUsers = useMemo(() => {
    const value = searchTerm.toLowerCase().trim();
    if (!value) return users;

    return users.filter((item) =>
      item.name?.toLowerCase().includes(value) ||
      item.email?.toLowerCase().includes(value) ||
      item.role.toLowerCase().includes(value)
    );
  }, [users, searchTerm]);

  const counts = useMemo(() => ({
    all: users.length,
    admin: users.filter((item) => item.role === 'admin').length,
    teacher: users.filter((item) => item.role === 'teacher').length,
    student: users.filter((item) => item.role === 'student').length
  }), [users]);

  if (!canViewUsers) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h1 className="text-2xl font-bold mb-2">Users</h1>
          <p className="text-destructive">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">View and filter students, teachers, and admins.</p>
        </div>
        <Button type="button" variant="secondary" onClick={fetchUsers} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {(['all', 'student', 'teacher', 'admin'] as const).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setRoleFilter(role)}
            className={`bg-card rounded-xl border p-4 text-left transition-colors ${roleFilter === role ? 'border-primary' : 'border-border hover:bg-muted'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-semibold capitalize">{role}</span>
            </div>
            <p className="text-2xl font-bold">{counts[role]}</p>
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or role"
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <p className="text-sm text-muted-foreground">Showing {filteredUsers.length} user(s)</p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Role</th>
                  <th className="py-3 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => {
                  const Icon = roleIcons[item.role] || UserRound;
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-4 pr-4 font-medium">{item.name || 'Unnamed user'}</td>
                      <td className="py-4 pr-4 text-muted-foreground">{item.email || 'No email'}</td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-muted capitalize">
                          <Icon className="w-3 h-3" />
                          {item.role}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-muted-foreground">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
