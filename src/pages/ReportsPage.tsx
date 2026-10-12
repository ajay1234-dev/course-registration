import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { Download, BarChart3, PieChartIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { DEMO_COURSES, DEMO_REGISTRATIONS } from '@/data/demoData';
import { registrationService } from '@/domain/RegistrationService';
import { RegistrationData } from '@/domain/models';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export function ReportsPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [regs, setRegs] = useState<RegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (IS_DEMO_MODE) {
        setRegs(DEMO_REGISTRATIONS);
      } else {
        const all = await registrationService.getAllRegistrations();
        setRegs(all);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  if (profile?.role !== 'admin') {
    return (
      <AppLayout title="Reports">
        <div className="card p-12 text-center">
          <p className="text-slate-500">Access denied.</p>
        </div>
      </AppLayout>
    );
  }

  // Enrollment by department
  const deptData = DEMO_COURSES.reduce<Record<string, number>>((acc, c) => {
    const deptRegs = regs.filter(r => r.course_id === c.id && r.status === 'registered').length;
    acc[c.department] = (acc[c.department] ?? 0) + deptRegs;
    return acc;
  }, {});
  const departmentChartData = Object.entries(deptData).map(([name, value]) => ({ name: name.split(' ')[0], value }));

  // Course enrollment
  const courseChartData = DEMO_COURSES.slice(0, 8).map(c => ({
    name: c.course_code,
    enrolled: c.enrolled_count,
    capacity: c.capacity,
    available: Math.max(0, c.capacity - c.enrolled_count),
  }));

  // Status breakdown
  const statusData = [
    { name: 'Registered', value: regs.filter(r => r.status === 'registered').length },
    { name: 'Cancelled', value: regs.filter(r => r.status === 'cancelled').length },
    { name: 'Pending', value: regs.filter(r => r.status === 'pending').length },
  ].filter(d => d.value > 0);

  const handleExportAll = () => {
    const csv = registrationService.exportAsCSV(regs);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-registrations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Report exported!', 'success');
  };

  return (
    <AppLayout title="Reports & Analytics" subtitle="Enrollment statistics and data export">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">{regs.filter(r => r.status === 'registered').length}</p>
          <p className="text-sm text-slate-500">Active Registrations</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">{DEMO_COURSES.length}</p>
          <p className="text-sm text-slate-500">Total Courses</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">
            {DEMO_COURSES.filter(c => c.enrolled_count >= c.capacity).length}
          </p>
          <p className="text-sm text-slate-500">Full Courses</p>
        </div>
        <div className="stat-card">
          <p className="text-2xl font-bold text-slate-900">
            {Math.round(DEMO_COURSES.reduce((s, c) => s + (c.capacity > 0 ? c.enrolled_count / c.capacity : 0), 0) / DEMO_COURSES.length * 100)}%
          </p>
          <p className="text-sm text-slate-500">Avg. Fill Rate</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={handleExportAll} className="btn-primary">
          <Download size={15} /> Export All Registrations
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Enrollment by Department */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="font-semibold text-slate-900">Registrations by Department</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={departmentChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} name="Registrations" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Registration Status Breakdown */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon size={18} className="text-purple-600" />
            <h3 className="font-semibold text-slate-900">Registration Status</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Course Enrollment Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-green-600" />
            <h3 className="font-semibold text-slate-900">Course Enrollment vs Capacity</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={courseChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="enrolled" fill="#2563eb" radius={[4, 4, 0, 0]} name="Enrolled" />
              <Bar dataKey="available" fill="#bbf7d0" radius={[4, 4, 0, 0]} name="Available" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AppLayout>
  );
}
