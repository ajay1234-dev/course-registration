import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Search,
  Download,
  X,
  ChevronDown,
  BookOpen,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { DEMO_REGISTRATIONS } from '@/data/demoData';
import { RegistrationData } from '@/domain/models';
import { registrationService } from '@/domain/RegistrationService';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { CourseImage } from '@/components/ui/CourseImage';

const STATUS_COLORS: Record<string, string> = {
  registered: 'badge-green',
  pending: 'badge-yellow',
  cancelled: 'badge-gray',
  rejected: 'badge-red',
};

function CancelDialog({
  reg,
  onConfirm,
  onCancel,
  isLoading,
}: {
  reg: RegistrationData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Cancel Registration</h3>
        <p className="text-sm text-slate-600 text-center mb-1">
          Cancel registration for <strong>{reg.course?.title}</strong>?
        </p>
        <p className="text-xs text-slate-400 text-center mb-6">
          This action will free up your seat. You can re-register if seats are available.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center" disabled={isLoading}>
            Keep It
          </button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cancelling…
              </span>
            ) : (
              'Cancel Registration'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RegistrationsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cancelTarget, setCancelTarget] = useState<RegistrationData | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = async () => {
    if (!profile) return;
    if (IS_DEMO_MODE) {
      setRegistrations(DEMO_REGISTRATIONS.filter(r => r.student_id === profile.id));
    } else {
      const regs = await registrationService.getStudentRegistrations(profile.id);
      setRegistrations(regs);
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const filtered = registrations.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.course?.title?.toLowerCase().includes(q) &&
        !r.course?.course_code?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activeRegs = registrations.filter(r => r.status === 'registered');
  const totalCredits = activeRegs.reduce((s, r) => s + (r.course?.credits ?? 0), 0);

  const handleCancel = async () => {
    if (!cancelTarget || !profile) return;
    setIsCancelling(true);

    if (IS_DEMO_MODE) {
      await new Promise(res => setTimeout(res, 600));
      setRegistrations(prev =>
        prev.map(r => r.id === cancelTarget.id ? { ...r, status: 'cancelled' as const } : r)
      );
      showToast('Registration cancelled successfully.', 'success');
    } else {
      const result = await registrationService.cancelRegistration(cancelTarget.id, profile.id);
      if (result.success) {
        await load();
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    }

    setIsCancelling(false);
    setCancelTarget(null);
  };

  const handleExportCSV = () => {
    const csv = registrationService.exportAsCSV(registrations);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${profile?.student_id ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Registration summary downloaded!', 'success');
  };

  return (
    <AppLayout title="My Registrations" subtitle="View and manage your course registrations">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">{activeRegs.length}</p>
          <p className="text-sm text-slate-500">Active Courses</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">{totalCredits}/25</p>
          <p className="text-sm text-slate-500">Registered Credits</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">
            {registrations.filter(r => r.status === 'cancelled').length}
          </p>
          <p className="text-sm text-slate-500">Cancelled</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">{registrations.length}</p>
          <p className="text-sm text-slate-500">Total Records</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field pr-8 appearance-none"
          >
            <option value="all">All Status</option>
            <option value="registered">Registered</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <button onClick={handleExportCSV} className="btn-secondary whitespace-nowrap">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="table-header">Course</th>
              <th className="table-header">Instructor</th>
              <th className="table-header">Credits</th>
              <th className="table-header">Semester</th>
              <th className="table-header">Registered</th>
              <th className="table-header">Status</th>
              <th className="table-header">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No registrations found</p>
                  <p className="text-sm text-slate-400">Go to Browse Courses to register for courses</p>
                </td>
              </tr>
            ) : (
              filtered.map(reg => (
                <tr key={reg.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <CourseImage
                          src={reg.course?.image_url}
                          alt={reg.course?.title || 'Course'}
                          className="w-full h-full object-cover"
                          containerClassName="w-full h-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate max-w-xs">{reg.course?.title}</p>
                        <p className="text-xs text-slate-400">{reg.course?.course_code} · {reg.course?.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-slate-600">{reg.course?.instructor}</td>
                  <td className="table-cell">
                    <span className="badge-blue">{reg.course?.credits} cr</span>
                  </td>
                  <td className="table-cell text-slate-600 text-xs">{reg.course?.semester}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={12} />
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={STATUS_COLORS[reg.status] ?? 'badge-gray'}>
                      {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                    </span>
                  </td>
                  <td className="table-cell">
                    {(reg.status === 'registered' || reg.status === 'pending') && (
                      <button
                        onClick={() => setCancelTarget(reg)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        <X size={12} /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cancelTarget && (
        <CancelDialog
          reg={cancelTarget}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
          isLoading={isCancelling}
        />
      )}
    </AppLayout>
  );
}
