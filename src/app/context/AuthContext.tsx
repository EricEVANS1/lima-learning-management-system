import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, API_BASE_URL } from '../../utils/supabase-client';
import { publicAnonKey } from '../../../utils/supabase/info';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: 'student' | 'teacher' | 'admin') => Promise<void>;
  signOut: () => Promise<void>;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        fetchUserProfile(session.access_token);
      } else {
        setUser(null);
        setAccessToken(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await fetchUserProfile(session.access_token);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Check user error:', error);
      setLoading(false);
    }
  };

const fetchUserProfile = async (token: string) => {
  try {
    const { data: { user: authUser }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !authUser) {
      throw authError;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', authUser.id)
      .single();

    // If profile doesn't exist, try to create it from user metadata
    if (profileError && profileError.code === 'PGRST116') {
     console.log('Profile not found during sign in, creating from metadata...');

      const metadata = authUser.user_metadata || {};
      const newProfile = {
        id: authUser.id,
        email: authUser.email || '',
        name: metadata.name || authUser.email?.split('@')[0] || 'User',
        role: metadata.role || 'student'
      };

      // Try to insert the profile
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile);

      if (insertError) {
        console.error('Failed to create profile:', insertError);
        // Fallback to metadata
        setUser(newProfile);
      } else {
        setUser(newProfile);
      }
    } else if (profileError) {
      throw profileError;
    } else {
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        name: profile.name,
        role: profile.role
      });
    }
  } catch (error) {
    console.error('Fetch user profile error:', error);
    // Sign out on critical errors
    await supabase.auth.signOut();
  } finally {
    setLoading(false);
  }
};

  const signUp = async (email: string, password: string, name: string, role: 'student' | 'teacher' | 'admin') => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({ email, password, name, role })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    await signIn(email, password);
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', data.user.id)
        .single();

      // If profile doesn't exist, create it from user metadata
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Profile not found during sign in, creating from metadata...');

        const metadata = data.user.user_metadata || {};
        const newProfile = {
          id: data.user.id,
          email: data.user.email || '',
          name: metadata.name || data.user.email?.split('@')[0] || 'User',
          role: metadata.role || 'student'
        };

        // Try to insert the profile
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (insertError) {
          console.error('Failed to create profile on sign in:', insertError);
        }

        setUser(newProfile);
      } else if (profileError) {
        throw profileError;
      } else {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: profile.name,
          role: profile.role
        });
      }

      setAccessToken(data.session?.access_token || null);
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, accessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
