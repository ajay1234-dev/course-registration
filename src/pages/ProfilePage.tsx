import React, { useState } from 'react';
import { User, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
];

const PROGRAMMES = [
  'B.Tech Computer Science',
  'B.Tech Information Technology',
  'B.Tech Electronics',
  'B.Tech Mechanical Engineering',
  'B.Tech Civil Engineering',
  'M.Tech Computer Science',
  'MCA',
];

export function ProfilePage() {
  const { profile, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    department: profile?.department ?? '',
    programme: profile?.programme ?? '',
    academic_year: profile?.academic_year ?? 1,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state whenever active profile changes
  React.useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name,
        department: profile.department,
        programme: profile.programme,
        academic_year: profile.academic_year,
      });
    }
  }, [profile]);

  if (!profile) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Automatically generate clean email matching the updated name
    const cleaned = form.full_name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const newEmail = cleaned ? `${cleaned}@student.courseflow.edu` : profile.email;

    const result = await updateProfile({
      ...form,
      email: newEmail,
    });
    setIsSaving(false);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      setSaved(true);
      showToast('Profile and email updated successfully!', 'success');
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <AppLayout title="My Profile" subtitle="Manage your academic profile">
      <div className="max-w-2xl">
        {/* Avatar section */}
        <div className="card p-6 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 text-2xl font-bold">
            {profile.full_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-500">{profile.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="badge-blue">{profile.student_id}</span>
              <span className={profile.role === 'admin' ? 'badge-purple' : 'badge-green'}>
                {profile.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-600" />
            Academic Information
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Full Name</label>
                <input
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="label">Student ID</label>
                <input
                  type="text"
                  value={profile.student_id}
                  className="input-field bg-slate-50 text-slate-400 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">Student ID cannot be changed</p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="label">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  className="input-field bg-slate-50 text-slate-400 cursor-not-allowed"
                  disabled
                />
              </div>

              <div>
                <label className="label">Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="input-field"
                >
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Academic Year</label>
                <select
                  name="academic_year"
                  value={form.academic_year}
                  onChange={handleChange}
                  className="input-field"
                >
                  {[1, 2, 3, 4].map(y => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="label">Programme</label>
                <select
                  name="programme"
                  value={form.programme}
                  onChange={handleChange}
                  className="input-field"
                >
                  {PROGRAMMES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving…
                  </span>
                ) : saved ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle size={15} /> Saved!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save size={15} /> Save Changes
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Current Semester</p>
            <p className="font-semibold text-slate-900">Odd 2024-25</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500 mb-1">Account Created</p>
            <p className="font-semibold text-slate-900">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
