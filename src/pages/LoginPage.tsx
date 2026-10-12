import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { IS_DEMO_MODE } from '@/lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      navigate('/dashboard');
    }
  };

  const loginAsDemo = async (role: 'student' | 'admin') => {
    const demoEmail = role === 'admin' ? 'admin@courseflow.edu' : 'shweta.v@student.courseflow.edu';
    setIsLoading(true);
    await login(demoEmail, 'demo');
    setIsLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <GraduationCap size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">CourseFlow</h1>
          <p className="text-slate-500 text-sm mt-1">Your Courses. Your Semester. Your Future.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Sign in to your account</h2>

          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-600 mb-2 text-center">Quick Sign-in</p>
            <div className="flex gap-2">
              <button
                onClick={() => loginAsDemo('student')}
                className="flex-1 text-xs bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Student</span>
              </button>
              <button
                onClick={() => loginAsDemo('admin')}
                className="flex-1 text-xs bg-slate-800 text-white px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors font-medium flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Admin</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@university.edu"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary justify-center py-2.5 rounded-lg text-sm font-semibold"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            New student?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          CourseFlow v1.0 · Academic Year 2024-25
        </p>
      </div>
    </div>
  );
}
