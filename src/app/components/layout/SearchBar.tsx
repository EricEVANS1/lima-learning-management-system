import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, BookOpen, ClipboardList, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../../utils/supabase-client';

interface SearchResults {
  subjects: any[];
  exams: any[];
  assignments: any[];
  messages: any[];
}

const emptyResults: SearchResults = {
  subjects: [],
  exams: [],
  assignments: [],
  messages: [],
};

export const SearchBar: React.FC = () => {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const trimmed = query.trim();

    if (!accessToken || trimmed.length < 2) {
      setResults(emptyResults);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performSearch(trimmed);
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, accessToken]);

  const performSearch = async (searchTerm: string) => {
    setLoading(true);
    setIsOpen(true);

    try {
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setResults({
          subjects: data.results?.subjects || [],
          exams: data.results?.exams || [],
          assignments: data.results?.assignments || [],
          messages: data.results?.messages || [],
        });
      } else {
        setResults(emptyResults);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults(emptyResults);
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type: string) => {
    setIsOpen(false);
    setQuery('');
    setResults(emptyResults);

    if (type === 'subject') navigate('/subjects');
    if (type === 'exam') navigate('/exams');
    if (type === 'assignment') navigate('/assignments');
    if (type === 'message') navigate('/messages');
  };

  const clearSearch = () => {
    setQuery('');
    setResults(emptyResults);
    setIsOpen(false);
  };

  const totalResults =
    results.subjects.length +
    results.exams.length +
    results.assignments.length +
    results.messages.length;

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          placeholder="Search subjects, exams, assignments, messages..."
          className="w-full pl-10 pr-10 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">Searching...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {results.subjects.length > 0 && (
                <ResultSection title="Subjects">
                  {results.subjects.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() => handleResultClick('subject')}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <BookOpen size={16} className="text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.code || 'Subject'}</p>
                      </div>
                    </button>
                  ))}
                </ResultSection>
              )}

              {results.exams.length > 0 && (
                <ResultSection title="Exams">
                  {results.exams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => handleResultClick('exam')}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <FileText size={16} className="text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">{exam.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {exam.questions?.length || 0} questions
                        </p>
                      </div>
                    </button>
                  ))}
                </ResultSection>
              )}

              {results.assignments.length > 0 && (
                <ResultSection title="Assignments">
                  {results.assignments.map((assignment) => (
                    <button
                      key={assignment.id}
                      type="button"
                      onClick={() => handleResultClick('assignment')}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <ClipboardList size={16} className="text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {assignment.description || 'Assignment'}
                        </p>
                      </div>
                    </button>
                  ))}
                </ResultSection>
              )}

              {results.messages.length > 0 && (
                <ResultSection title="Messages">
                  {results.messages.map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => handleResultClick('message')}
                      className="w-full text-left px-4 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                    >
                      <MessageSquare size={16} className="text-green-500" />
                      <div>
                        <p className="text-sm font-medium">{message.subject || 'Message'}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {message.content}
                        </p>
                      </div>
                    </button>
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ResultSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-2">
    <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
      {title}
    </p>
    {children}
  </div>
);