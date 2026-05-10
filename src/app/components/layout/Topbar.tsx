import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SearchBar } from './SearchBar';

export const Topbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark');
    setDarkMode(!darkMode);
  };

  return (
    <div className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      {/* Search Bar - Hidden on mobile */}
      <div className="hidden md:flex flex-1 max-w-xl">
        <SearchBar />
      </div>

      {/* Mobile: Just the logo/title */}
      <div className="md:hidden flex-1 pl-12">
        <h1 className="text-lg font-bold">LMS</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-accent rounded-lg transition-colors"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="hidden sm:block">
          <NotificationsDropdown />
        </div>

        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-border">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={signOut}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
