import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  BookOpen,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  Info,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { DEMO_COURSES, DEMO_REGISTRATIONS } from '@/data/demoData';
import { CourseData, RegistrationData, Course, Student } from '@/domain/models';
import { registrationService } from '@/domain/RegistrationService';
import { supabase } from '@/lib/supabase';
import { CourseCardSkeleton } from '@/components/ui/Skeleton';
import { CourseImage } from '@/components/ui/CourseImage';

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical Engineering',
];

const SEMESTERS = ['All Semesters', 'Odd 2024-25', 'Even 2024-25'];

function CapacityBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 100;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{enrolled}/{capacity} enrolled</span>
        <span>{capacity - enrolled} seats left</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CourseDetailModal({
  course,
  onClose,
  onRegister,
  isRegistered,
  isRegistering,
}: {
  course: CourseData;
  onClose: () => void;
  onRegister: () => void;
  isRegistered: boolean;
  isRegistering: boolean;
}) {
  const c = new Course(course);
  const available = c.isAvailable();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-hidden">
        {course.image_url && (
          <div className="relative h-48 w-full overflow-hidden bg-slate-100">
            <CourseImage
              src={course.image_url}
              alt={course.title}
              className="w-full h-full object-cover"
              containerClassName="w-full h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end pointer-events-none">
              <span className="badge-blue bg-white/90 text-blue-800 shadow-sm">{course.course_code}</span>
              <span className="text-xs text-white/90 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                {course.credits} Credits
              </span>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            {!course.image_url && <span className="badge-blue mb-2">{course.course_code}</span>}
            <h2 className="text-xl font-bold text-slate-900 mt-1">{course.title}</h2>
            <p className="text-sm text-slate-500">{course.department}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Instructor</p>
              <p className="text-sm font-semibold text-slate-900">{course.instructor}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Credits</p>
              <p className="text-sm font-semibold text-slate-900">{course.credits}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Semester</p>
              <p className="text-sm font-semibold text-slate-900">{course.semester}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Capacity</p>
              <p className="text-sm font-semibold text-slate-900">{course.enrolled_count}/{course.capacity}</p>
            </div>
          </div>

          {course.prerequisites && course.prerequisites.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Prerequisites Required</p>
              <div className="flex flex-wrap gap-1">
                {course.prerequisites.map(p => (
                  <span key={p} className="badge-yellow">{p}</span>
                ))}
              </div>
            </div>
          )}

          <CapacityBar enrolled={course.enrolled_count} capacity={course.capacity} />

          {!available && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={14} />
              <span>
                {!course.registration_open
                  ? 'Registration is currently closed for this course.'
                  : 'This course is full.'}
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">
              Close
            </button>
            {isRegistered ? (
              <button disabled className="flex-1 btn-primary justify-center opacity-75 cursor-not-allowed">
                <CheckCircle size={15} /> Registered
              </button>
            ) : (
              <button
                onClick={onRegister}
                disabled={!available || isRegistering}
                className={`flex-1 btn-primary justify-center ${
                  !available ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isRegistering ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Registering…
                  </span>
                ) : (
                  'Register Now'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  course,
  onConfirm,
  onCancel,
  isLoading,
}: {
  course: CourseData;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
          <Info size={22} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Confirm Registration</h3>
        <p className="text-sm text-slate-600 text-center mb-1">
          Register for <strong>{course.title}</strong>?
        </p>
        <p className="text-xs text-slate-400 text-center mb-6">
          {course.credits} credits · {course.department}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center" disabled={isLoading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-primary flex-1 justify-center" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering…
              </span>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CoursesPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [semester, setSemester] = useState('All Semesters');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseData | null>(null);
  const [confirmCourse, setConfirmCourse] = useState<CourseData | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (IS_DEMO_MODE) {
        setCourses(DEMO_COURSES);
        setRegistrations(DEMO_REGISTRATIONS.filter(r => r.student_id === profile?.id));
      } else {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        if (coursesData) setCourses(coursesData as CourseData[]);

        if (profile) {
          const regs = await registrationService.getStudentRegistrations(profile.id);
          setRegistrations(regs);
        }
      }
      setIsLoading(false);
    };
    load();
  }, [profile]);

  const registeredCourseIds = new Set(
    registrations.filter(r => r.status === 'registered').map(r => r.course_id)
  );

  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase()) &&
        !c.course_code.toLowerCase().includes(search.toLowerCase())) return false;
      if (department !== 'All Departments' && c.department !== department) return false;
      if (semester !== 'All Semesters' && c.semester !== semester) return false;
      if (availableOnly && (c.enrolled_count >= c.capacity || !c.registration_open)) return false;
      return true;
    });
  }, [courses, search, department, semester, availableOnly]);

  const handleRegisterClick = (course: CourseData) => {
    if (!profile) return;
    // Check student eligibility using domain class
    if (profile.role === 'student') {
      const s = new Student(profile);
      const existing = registrations.map(r => ({ ...r }));
      s.setRegistrations(existing);
      const c = new Course(course);
      const check = s.canRegisterForCourse(c);
      if (!check.allowed) {
        showToast(check.reason ?? 'Cannot register for this course.', 'error');
        return;
      }
    }
    setConfirmCourse(course);
    setSelectedCourse(null);
  };

  const handleConfirmRegister = async () => {
    if (!confirmCourse || !profile) return;
    setIsRegistering(true);

    if (IS_DEMO_MODE) {
      // Demo: simulate registration
      await new Promise(res => setTimeout(res, 800));
      const newReg: RegistrationData = {
        id: `reg-demo-${Date.now()}`,
        student_id: profile.id,
        course_id: confirmCourse.id,
        status: 'registered',
        registered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        course: confirmCourse,
        profile: profile as RegistrationData['profile'],
      };
      setRegistrations(prev => [...prev, newReg]);
      // Update enrolled count in courses
      setCourses(prev =>
        prev.map(c =>
          c.id === confirmCourse.id ? { ...c, enrolled_count: c.enrolled_count + 1 } : c
        )
      );
      showToast(`Successfully registered for ${confirmCourse.title}!`, 'success');
    } else {
      const result = await registrationService.registerStudent(profile.id, confirmCourse.id);
      if (result.success) {
        const regs = await registrationService.getStudentRegistrations(profile.id);
        setRegistrations(regs);
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    }

    setIsRegistering(false);
    setConfirmCourse(null);
  };

  return (
    <AppLayout title="Browse Courses" subtitle="Find and register for courses this semester">
      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or code…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>

          <div className="relative">
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="input-field pr-8 appearance-none"
            >
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={semester}
              onChange={e => setSemester(e.target.value)}
              className="input-field pr-8 appearance-none"
            >
              {SEMESTERS.map(s => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={e => setAvailableOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600"
            />
            <span className="text-sm text-slate-600">Show available seats only</span>
          </label>
          <p className="text-sm text-slate-500">
            {filtered.length} course{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CourseCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Filter size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No courses match your filters</p>
          <button
            onClick={() => { setSearch(''); setDepartment('All Departments'); setSemester('All Semesters'); setAvailableOnly(false); }}
            className="mt-3 btn-secondary mx-auto"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => {
            const c = new Course(course);
            const isRegistered = registeredCourseIds.has(course.id);
            const isFull = !c.hasAvailableSeats();
            const isClosed = !course.registration_open;

            return (
              <div
                key={course.id}
                className="card overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 cursor-pointer group border border-slate-200/80"
                onClick={() => setSelectedCourse(course)}
              >
                {/* Course Image Header */}
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  <CourseImage
                    src={course.image_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    containerClassName="w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <span className="badge-blue bg-white/95 text-blue-800 shadow-sm font-semibold">{course.course_code}</span>
                  </div>

                  <div className="absolute top-3 right-3 flex gap-1 pointer-events-none">
                    {isRegistered && <span className="badge-green shadow-sm">Registered</span>}
                    {isFull && !isRegistered && <span className="badge-red shadow-sm">Full</span>}
                    {isClosed && !isFull && <span className="badge-gray shadow-sm">Closed</span>}
                    {!isFull && !isClosed && !isRegistered && <span className="badge-green shadow-sm">Open</span>}
                  </div>

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs pointer-events-none">
                    <span className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded font-medium">
                      {course.department}
                    </span>
                    <span className="bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded font-semibold">
                      {course.credits} Credits
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 flex flex-col flex-1">
                  <h3 className="font-semibold text-slate-900 text-base mb-1.5 leading-snug group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{course.description}</p>

                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-xs text-slate-500 mb-3 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Users size={13} className="text-blue-500" /> {course.enrolled_count}/{course.capacity} seats
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" /> {course.semester}
                    </span>
                  </div>

                  <CapacityBar enrolled={course.enrolled_count} capacity={course.capacity} />

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <p className="text-xs text-slate-500 truncate" title={course.instructor}>
                      {course.instructor}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); if (!isRegistered && c.isAvailable()) handleRegisterClick(course); }}
                      disabled={isRegistered || isFull || isClosed}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                        isRegistered
                          ? 'bg-green-50 text-green-700 cursor-not-allowed font-semibold'
                          : isFull || isClosed
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {isRegistered ? 'Registered' : isFull ? 'Full' : isClosed ? 'Closed' : 'Register'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Course Detail Modal */}
      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          onClose={() => setSelectedCourse(null)}
          onRegister={() => handleRegisterClick(selectedCourse)}
          isRegistered={registeredCourseIds.has(selectedCourse.id)}
          isRegistering={isRegistering}
        />
      )}

      {/* Confirm Dialog */}
      {confirmCourse && (
        <ConfirmDialog
          course={confirmCourse}
          onConfirm={handleConfirmRegister}
          onCancel={() => setConfirmCourse(null)}
          isLoading={isRegistering}
        />
      )}
    </AppLayout>
  );
}
