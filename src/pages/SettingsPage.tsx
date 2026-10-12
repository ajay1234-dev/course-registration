import React from 'react';
import { Settings, Info, Shield, Palette } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { IS_DEMO_MODE } from '@/lib/supabase';

export function SettingsPage() {
  const { profile } = useAuth();

  return (
    <AppLayout title="Settings" subtitle="Application preferences and information">
      <div className="max-w-2xl space-y-6">
        {/* App Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">Application Information</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Application</span>
              <span className="font-medium text-slate-900">CourseFlow v1.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Academic Year</span>
              <span className="font-medium text-slate-900">2024-25</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Current Semester</span>
              <span className="font-medium text-slate-900">Odd 2024-25</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Mode</span>
              <span className={`font-medium ${IS_DEMO_MODE ? 'text-amber-600' : 'text-green-600'}`}>
                {IS_DEMO_MODE ? 'Demo Mode' : 'Production'}
              </span>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-green-600" />
            <h3 className="font-semibold text-slate-900">Account Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Email</span>
              <span className="font-medium text-slate-900">{profile?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Role</span>
              <span className={`font-medium ${profile?.role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                {profile?.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>
            {IS_DEMO_MODE && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>Demo Mode:</strong> Authentication is simulated. Configure your Supabase credentials in{' '}
                  <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code> to enable real authentication.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* OOP Info */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={18} className="text-purple-600" />
            <h3 className="font-semibold text-slate-900">OOP Architecture</h3>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { concept: 'Encapsulation', where: 'User, Student, Course, Registration classes' },
              { concept: 'Inheritance', where: 'Student extends User, Administrator extends User' },
              { concept: 'Abstraction', where: 'IUser, ICourseOperation, IRegistrationOperation interfaces' },
              { concept: 'Polymorphism', where: 'getDisplayName() and getRole() overrides' },
              { concept: 'Service Layer', where: 'RegistrationService (Singleton pattern)' },
              { concept: 'Factory Pattern', where: 'UserFactory.create()' },
            ].map(item => (
              <div key={item.concept} className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-50">
                <span className="font-medium text-slate-900">{item.concept}</span>
                <span className="text-slate-500 text-xs sm:text-right sm:max-w-xs">{item.where}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supabase setup note */}
        {IS_DEMO_MODE && (
          <div className="card p-6 border-amber-200 bg-amber-50">
            <h3 className="font-semibold text-amber-900 mb-3">Configure Supabase (Optional)</h3>
            <p className="text-sm text-amber-800 mb-3">
              To connect real database persistence, create a <code className="bg-amber-100 px-1 rounded">.env</code> file:
            </p>
            <pre className="bg-amber-100 rounded-lg p-3 text-xs text-amber-900 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
            </pre>
            <p className="text-xs text-amber-700 mt-3">
              Run the SQL migration in <code>supabase/migrations/001_init.sql</code> in your Supabase SQL editor.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
