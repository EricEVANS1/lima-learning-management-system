import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  GraduationCap,
  BarChart3,
  MessageSquare,
  Settings,
  Menu,
  X,
  ScrollText,
  Users,
} from 'lucide-react';
import { cn } from '../../../utils/cn';

interface SidebarProps {
  userRole: 'student' | 'teacher' | 'admin';
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'Subjects', path: '/subjects' },
  { icon: FileText, label: 'Exams', path: '/exams' },
  { icon: ClipboardList, label: 'Assignments', path: '/assignments' },
  { icon: GraduationCap, label: 'Grades', path: '/grades' },

  ...(userRole === 'teacher' || userRole === 'admin'
  ? [{ icon: Users, label: 'Students', path: '/students' }]
  : []),

  ...(userRole === 'student'
    ? [{ icon: ScrollText, label: 'Transcript', path: '/transcript' }]
    : []),

  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-sidebar rounded-lg border border-sidebar-border"
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-64 lg:w-16' : 'w-64'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            {!collapsed && (
              <h1 className="text-xl font-bold text-sidebar-foreground">LIMA</h1>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-2 hover:bg-sidebar-accent rounded-lg transition-colors"
            >
              {collapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Icon size={20} className="shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <div
              className={cn(
                'px-3 py-2 rounded-lg bg-sidebar-accent',
                collapsed && 'text-center'
              )}
            >
              {!collapsed && (
                <p className="text-xs text-sidebar-foreground capitalize">
                  {userRole}
                </p>
              )}
              {collapsed && (
                <p className="text-xs text-sidebar-foreground capitalize truncate">
                  {userRole.charAt(0).toUpperCase()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={cn('hidden lg:block transition-all duration-300', collapsed ? 'ml-16' : 'ml-64')} />
    </>
  );
};