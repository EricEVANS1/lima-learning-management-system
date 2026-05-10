import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setForgotMessage('');

    // Integrate with authentication provider
    setForgotMessage(
      'If an account exists for that email, a reset link has been sent.'
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">

          {!showForgotPassword ? (
            <>
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-9 h-9 text-white" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  LIMA
                </h1>

                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Learning Integrated Management Application
                </p>

                <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                  Sign in to access your dashboard
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Password
                  </label>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 dark:bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Please wait...' : 'Sign In'}
                </button>
              </form>

              {/* Demo Accounts */}
              <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                <div className="text-center mb-4">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Demo Accounts
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Use the accounts below to explore different user roles.
                  </p>
                </div>

                <div className="space-y-3">

                  {/* Admin */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    <p className="font-semibold text-sm text-red-600 dark:text-red-400">
                      Admin
                    </p>

                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Email: admin@lms.com</p>
                      <p>Password: admin123</p>
                    </div>
                  </div>

                  {/* Teacher */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    <p className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                      Teacher
                    </p>

                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Email: teacher@lms.com</p>
                      <p>Password: teacher123</p>
                    </div>
                  </div>

                  {/* Student */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    <p className="font-semibold text-sm text-green-600 dark:text-green-400">
                      Student
                    </p>

                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>Email: student@lms.com</p>
                      <p>Password: student123</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Forgot Password */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                >
                  Forgot your password?
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-9 h-9 text-white" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Reset Password
                </h1>

                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Enter your email to receive a reset link
                </p>
              </div>

              {/* Forgot Password Form */}
              <form onSubmit={handleForgotPassword} className="space-y-5">

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                    Email
                  </label>

                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {forgotMessage && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                    {forgotMessage}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Send Reset Link
                </button>
              </form>

              {/* Back */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotMessage('');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};