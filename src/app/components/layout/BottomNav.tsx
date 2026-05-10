import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  GraduationCap,
  User
} from 'lucide-react';
import { cn } from '../../../utils/cn';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: BookOpen, label: 'Subjects', path: '/subjects' },
    { icon: FileText, label: 'Exams', path: '/exams' },
    { icon: GraduationCap, label: 'Grades', path: '/grades' },
    { icon: User, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={20} />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
