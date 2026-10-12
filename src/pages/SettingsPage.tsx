import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle,
  Bell,
  Shield,
  Palette,
  Sliders,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export interface AppSettings {
  appName: string;
  academicYear: string;
  currentSemester: string;
  maxCreditsPerSemester: number;
  allowWaitlist: boolean;
  registrationOpenByDefault: boolean;
  notifyOnEnrollment: boolean;
  notifyOnDeadline: boolean;
  themePreference: 'light' | 'dark' | 'system';
  customNotes: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'CourseFlow',
  academicYear: '2024-25',
  currentSemester: 'Odd 2024-25',
  maxCreditsPerSemester: 25,
  allowWaitlist: true,
  registrationOpenByDefault: true,
  notifyOnEnrollment: true,
  notifyOnDeadline: true,
  themePreference: 'light',
  customNotes: 'Academic semester enrollment policy active for all undergraduate & graduate students.',
};

const SETTINGS_KEY = 'courseflow_app_settings';

export function SettingsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch {
      // Fallback to defaults
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setSettings(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggle = (key: keyof AppSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setTimeout(() => {
        setIsSaving(false);
        setSaved(true);
        showToast('Settings saved successfully!', 'success');
        setTimeout(() => setSaved(false), 3000);
      }, 400);
    } catch {
      setIsSaving(false);
      showToast('Failed to save settings to browser storage.', 'error');
    }
  };

  const handleReset = () => {
    if (confirm('Reset all application preferences to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(SETTINGS_KEY);
      showToast('Settings restored to defaults.', 'info');
    }
  };

  return (
    <AppLayout title="Settings" subtitle="Customize and manage application preferences">
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6 pb-10">
        
        {/* Quick Save Bar (Sticky or Top) */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">System Configuration</h3>
            <p className="text-xs text-slate-500">Edit any setting below and save your changes.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5"
            >
              <RotateCcw size={14} /> Reset
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              {isSaving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle size={15} />
              ) : (
                <Save size={15} />
              )}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Academic & Institution Settings */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sliders size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">Academic & System Information</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Application Title</label>
              <input
                type="text"
                name="appName"
                value={settings.appName}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Academic Year</label>
              <input
                type="text"
                name="academicYear"
                value={settings.academicYear}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Active Semester</label>
              <select
                name="currentSemester"
                value={settings.currentSemester}
                onChange={handleChange}
                className="input-field"
              >
                <option value="Odd 2024-25">Odd 2024-25</option>
                <option value="Even 2024-25">Even 2024-25</option>
                <option value="Summer 2025">Summer 2025</option>
              </select>
            </div>

            <div>
              <label className="label">Max Credits Per Student</label>
              <input
                type="number"
                name="maxCreditsPerSemester"
                min={12}
                max={35}
                value={settings.maxCreditsPerSemester}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label">Institutional Memo / Notes</label>
              <textarea
                name="customNotes"
                rows={2}
                value={settings.customNotes}
                onChange={handleChange}
                className="input-field resize-none text-xs"
                placeholder="Notes for faculty or student guidelines…"
              />
            </div>
          </div>
        </div>

        {/* Registration Workflow Rules */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-emerald-600" />
            <h3 className="font-semibold text-slate-900">Course Registration Controls</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Registration Open by Default</p>
                <p className="text-xs text-slate-500">Newly created courses will be automatically open for enrollment</p>
              </div>
              <input
                type="checkbox"
                name="registrationOpenByDefault"
                checked={settings.registrationOpenByDefault}
                onChange={() => handleToggle('registrationOpenByDefault')}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Enable Waitlist Queues</p>
                <p className="text-xs text-slate-500">Allow students to queue when maximum course capacity is reached</p>
              </div>
              <input
                type="checkbox"
                name="allowWaitlist"
                checked={settings.allowWaitlist}
                onChange={() => handleToggle('allowWaitlist')}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Alerts */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} className="text-amber-600" />
            <h3 className="font-semibold text-slate-900">Alerts & Notifications</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Enrollment Confirmation Toasts</p>
                <p className="text-xs text-slate-500">Display immediate confirmation toasts upon course selection</p>
              </div>
              <input
                type="checkbox"
                name="notifyOnEnrollment"
                checked={settings.notifyOnEnrollment}
                onChange={() => handleToggle('notifyOnEnrollment')}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-medium text-slate-900">Registration Deadline Reminders</p>
                <p className="text-xs text-slate-500">Notify students when registration deadlines are approaching</p>
              </div>
              <input
                type="checkbox"
                name="notifyOnDeadline"
                checked={settings.notifyOnDeadline}
                onChange={() => handleToggle('notifyOnDeadline')}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Active Account Overview */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-purple-600" />
            <h3 className="font-semibold text-slate-900">Current User Session</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-0.5">Signed-in User</span>
              <span className="font-semibold text-slate-900">{profile?.full_name}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-0.5">Active Role</span>
              <span className={`font-semibold ${profile?.role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                {profile?.role === 'admin' ? 'Administrator' : 'Student'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-0.5">Contact Email</span>
              <span className="font-semibold text-slate-900">{profile?.email}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-xs text-slate-500 block mb-0.5">Storage Persistence</span>
              <span className="font-semibold text-emerald-600">Local Browser Storage (Saved)</span>
            </div>
          </div>
        </div>

        {/* Save & Reset Actions Bottom */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
          >
            <RotateCcw size={15} /> Reset Defaults
          </button>
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
                <CheckCircle size={15} /> Changes Saved!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save size={15} /> Save All Settings
              </span>
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
