import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import {
  DEMO_REGISTRATIONS,
  DEMO_COURSES,
  DEMO_STUDENT,
} from '@/data/demoData';
import { RegistrationData, CourseData } from '@/domain/models';
import { registrationService } from '@/domain/RegistrationService';
import { StatCardSkeleton, CourseCardSkeleton } from '@/components/ui/Skeleton';
import { CourseImage } from '@/components/ui/CourseImage';

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [availableCourses, setAvailableCourses] = useState<CourseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const load = async () => {
      if (IS_DEMO_MODE) {
        const myRegs = DEMO_REGISTRATIONS.filter(
          r => r.student_id === (isAdmin ? 'admin-001' : DEMO_STUDENT.id)
        );
        setRegistrations(myRegs);
        setAvailableCourses(
          DEMO_COURSES.filter(c => c.registration_open && c.enrolled_count < c.capacity)
        );
      } else {
        if (profile) {
          const regs = await registrationService.getStudentRegistrations(profile.id);
          setRegistrations(regs);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [profile, isAdmin]);

  const activeRegistrations = registrations.filter(r => r.status === 'registered');
  const totalCredits = activeRegistrations.reduce(
    (sum, r) => sum + (r.course?.credits ?? 0),
    0
  );

  if (isAdmin) {
    return (
      <AppLayout title="Administration Overview" subtitle="System-wide statistics">
        <AdminDashboard />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`Welcome back, ${profile?.full_name?.split(' ')[0] ?? 'Student'}!`}
      subtitle={`${profile?.programme} · Year ${profile?.academic_year} · Odd 2024-25`}
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              icon={BookOpen}
              label="Enrolled Courses"
              value={activeRegistrations.length}
              sub="This semester"
              color="blue"
            />
            <StatCard
              icon={CreditCard}
              label="Registered Credits"
              value={`${totalCredits}/25`}
              sub="Credit limit: 25"
              color="green"
            />
            <StatCard
              icon={CheckCircle}
              label="Available Courses"
              value={availableCourses.length}
              sub="Open for registration"
              color="purple"
            />
            <StatCard
              icon={Clock}
              label="Credit Utilization"
              value={`${Math.round((totalCredits / 25) * 100)}%`}
              sub={totalCredits >= 20 ? 'Near limit' : 'Room available'}
              color="amber"
            />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Registrations */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">My Registered Courses</h2>
            <button
              onClick={() => navigate('/registrations')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <CourseCardSkeleton />
            ) : activeRegistrations.length === 0 ? (
              <div className="card p-8 text-center">
                <BookOpen size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No courses registered yet</p>
                <p className="text-sm text-slate-400 mb-4">Browse the course catalogue to get started</p>
                <button
                  onClick={() => navigate('/courses')}
                  className="btn-primary mx-auto"
                >
                  Browse Courses
                </button>
              </div>
            ) : (
              activeRegistrations.map(reg => (
                <div key={reg.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    <CourseImage
                      src={reg.course?.image_url}
                      alt={reg.course?.title || 'Course'}
                      className="w-full h-full object-cover"
                      containerClassName="w-full h-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{reg.course?.title}</p>
                        <p className="text-xs text-slate-500">{reg.course?.course_code} · {reg.course?.instructor}</p>
                      </div>
                      <span className="badge-green shrink-0">{reg.course?.credits} cr</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="badge-blue">{reg.course?.department}</span>
                      <span className="badge-green">Registered</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Registration Deadline */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-blue-600" />
              <h3 className="font-semibold text-sm text-slate-900">Registration Deadline</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900">Dec 31</p>
            <p className="text-xs text-slate-500">Odd Semester 2024-25</p>
            <div className="mt-3 h-1.5 bg-slate-100 rounded-full">
              <div className="h-1.5 bg-blue-600 rounded-full" style={{ width: '65%' }} />
            </div>
            <p className="text-xs text-slate-400 mt-1">65% of semester complete</p>
          </div>

          {/* Credit Summary */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-green-600" />
              <h3 className="font-semibold text-sm text-slate-900">Credit Summary</h3>
            </div>
            <div className="space-y-2">
              {activeRegistrations.map(r => (
                <div key={r.id} className="flex items-center justify-between">
                  <p className="text-xs text-slate-600 truncate flex-1 mr-2">{r.course?.course_code}</p>
                  <span className="text-xs font-semibold text-slate-700">{r.course?.credits} cr</span>
                </div>
              ))}
              {activeRegistrations.length > 0 && (
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Total</span>
                  <span className="text-sm font-bold text-blue-600">{totalCredits} / 25 cr</span>
                </div>
              )}
              {activeRegistrations.length === 0 && (
                <p className="text-xs text-slate-400">No courses registered yet.</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-4">
            <h3 className="font-semibold text-sm text-slate-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/courses')}
                className="w-full btn-primary justify-start text-xs py-2"
              >
                <BookOpen size={14} /> Browse Courses
              </button>
              <button
                onClick={() => navigate('/registrations')}
                className="w-full btn-secondary justify-start text-xs py-2"
              >
                <CheckCircle size={14} /> My Registrations
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="w-full btn-secondary justify-start text-xs py-2"
              >
                <AlertTriangle size={14} /> Update Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    activeRegistrations: 0,
    nearCapacity: 0,
  });
  const [recentRegs, setRecentRegs] = useState<RegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (IS_DEMO_MODE) {
        setStats({
          totalStudents: 4,
          totalCourses: DEMO_COURSES.length,
          activeRegistrations: DEMO_REGISTRATIONS.filter(r => r.status === 'registered').length,
          nearCapacity: DEMO_COURSES.filter(
            c => c.capacity > 0 && c.enrolled_count / c.capacity >= 0.8
          ).length,
        });
        setRecentRegs(DEMO_REGISTRATIONS.slice(0, 5));
      } else {
        const regs = await registrationService.getAllRegistrations();
        setRecentRegs(regs.slice(0, 5));
        setStats({
          totalStudents: new Set(regs.map(r => r.student_id)).size,
          totalCourses: DEMO_COURSES.length,
          activeRegistrations: regs.filter(r => r.status === 'registered').length,
          nearCapacity: 0,
        });
      }
      setIsLoading(false);
    };
    load();
  }, []);

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={BookOpen} label="Total Students" value={stats.totalStudents} color="blue" />
            <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} color="green" />
            <StatCard icon={CheckCircle} label="Active Registrations" value={stats.activeRegistrations} color="purple" />
            <StatCard icon={AlertTriangle} label="Near Capacity" value={stats.nearCapacity} sub="courses" color="amber" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Recent Registrations</h2>
            <button
              onClick={() => navigate('/admin')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-header">Student</th>
                  <th className="table-header">Course</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRegs.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="table-cell">
                      <p className="font-medium">{r.profile?.full_name ?? 'Student'}</p>
                      <p className="text-xs text-slate-400">{r.profile?.student_id}</p>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium">{r.course?.course_code}</p>
                      <p className="text-xs text-slate-400 truncate max-w-28">{r.course?.title}</p>
                    </td>
                    <td className="table-cell">
                      <span className="badge-green">{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Quick Admin Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="card p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BookOpen size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">Manage Courses</p>
                <p className="text-xs text-slate-500">Create, edit, archive courses</p>
              </div>
              <ArrowRight size={16} className="text-slate-400 ml-auto" />
            </button>
            <button
              onClick={() => navigate('/admin?tab=students')}
              className="card p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">Student Management</p>
                <p className="text-xs text-slate-500">View and manage student records</p>
              </div>
              <ArrowRight size={16} className="text-slate-400 ml-auto" />
            </button>
            <button
              onClick={() => navigate('/admin/reports')}
              className="card p-4 text-left hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">Reports & Analytics</p>
                <p className="text-xs text-slate-500">Enrollment reports and CSV export</p>
              </div>
              <ArrowRight size={16} className="text-slate-400 ml-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
