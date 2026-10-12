import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  Users,
  BookOpen,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { IS_DEMO_MODE } from '@/lib/supabase';
import { DEMO_COURSES, DEMO_STUDENTS, DEMO_REGISTRATIONS } from '@/data/demoData';
import { CourseData, ProfileData, RegistrationData } from '@/domain/models';
import { registrationService } from '@/domain/RegistrationService';
import { supabase } from '@/lib/supabase';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { CourseImage } from '@/components/ui/CourseImage';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Mechanical Engineering',
];

type TabType = 'courses' | 'students' | 'registrations';

function CourseFormModal({
  course,
  onSave,
  onClose,
}: {
  course?: CourseData | null;
  onSave: (data: Partial<CourseData>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Partial<CourseData>>({
    course_code: course?.course_code ?? '',
    title: course?.title ?? '',
    description: course?.description ?? '',
    department: course?.department ?? 'Computer Science',
    instructor: course?.instructor ?? '',
    credits: course?.credits ?? 3,
    semester: course?.semester ?? 'Odd 2024-25',
    capacity: course?.capacity ?? 40,
    registration_open: course?.registration_open ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(form);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {course ? 'Edit Course' : 'Create New Course'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Course Code</label>
              <input name="course_code" type="text" value={form.course_code} onChange={handleChange}
                className="input-field" placeholder="CS301" required />
            </div>
            <div>
              <label className="label">Credits</label>
              <input name="credits" type="number" min={1} max={6} value={form.credits}
                onChange={handleChange} className="input-field" required />
            </div>
            <div className="col-span-2">
              <label className="label">Title</label>
              <input name="title" type="text" value={form.title} onChange={handleChange}
                className="input-field" placeholder="Data Structures & Algorithms" required />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea name="description" rows={3} value={form.description}
                onChange={handleChange} className="input-field resize-none" />
            </div>
            <div>
              <label className="label">Department</label>
              <select name="department" value={form.department} onChange={handleChange} className="input-field">
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Semester</label>
              <select name="semester" value={form.semester} onChange={handleChange} className="input-field">
                <option>Odd 2024-25</option>
                <option>Even 2024-25</option>
              </select>
            </div>
            <div>
              <label className="label">Instructor</label>
              <input name="instructor" type="text" value={form.instructor} onChange={handleChange}
                className="input-field" placeholder="Prof. Name" required />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input name="capacity" type="number" min={1} value={form.capacity}
                onChange={handleChange} className="input-field" required />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, registration_open: !prev.registration_open }))}
                className={`text-sm font-medium flex items-center gap-2 ${
                  form.registration_open ? 'text-green-600' : 'text-slate-400'
                }`}
              >
                {form.registration_open ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                Registration {form.registration_open ? 'Open' : 'Closed'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary flex-1 justify-center">
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <><Save size={15} /> {course ? 'Update' : 'Create'} Course</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminPage() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('courses');
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [students, setStudents] = useState<ProfileData[]>([]);
  const [regs, setRegs] = useState<RegistrationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courseModal, setCourseModal] = useState<{ open: boolean; course?: CourseData | null }>({
    open: false,
  });

  if (profile?.role !== 'admin') {
    return (
      <AppLayout title="Administration">
        <div className="card p-12 text-center">
          <p className="text-slate-500">Access denied. Administrator privileges required.</p>
        </div>
      </AppLayout>
    );
  }

  useEffect(() => {
    const load = async () => {
      if (IS_DEMO_MODE) {
        setCourses(DEMO_COURSES);
        setStudents(DEMO_STUDENTS);
        setRegs(DEMO_REGISTRATIONS);
      } else {
        const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
        if (c) setCourses(c as CourseData[]);
        const { data: s } = await supabase.from('profiles').select('*').eq('role', 'student');
        if (s) setStudents(s as ProfileData[]);
        const allRegs = await registrationService.getAllRegistrations();
        setRegs(allRegs);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleSaveCourse = async (data: Partial<CourseData>) => {
    if (IS_DEMO_MODE) {
      if (courseModal.course) {
        setCourses(prev => prev.map(c => c.id === courseModal.course?.id ? { ...c, ...data } : c));
        showToast('Course updated!', 'success');
      } else {
        const newCourse: CourseData = {
          id: `course-${Date.now()}`,
          enrolled_count: 0,
          registration_deadline: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...data,
        } as CourseData;
        setCourses(prev => [newCourse, ...prev]);
        showToast('Course created!', 'success');
      }
      return;
    }

    if (courseModal.course) {
      await supabase.from('courses').update(data).eq('id', courseModal.course.id);
      showToast('Course updated!', 'success');
    } else {
      await supabase.from('courses').insert({ ...data, enrolled_count: 0 });
      showToast('Course created!', 'success');
    }
    const { data: c } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (c) setCourses(c as CourseData[]);
  };

  const handleDeleteCourse = async (courseId: string) => {
    const hasRegs = regs.some(r => r.course_id === courseId && r.status === 'registered');
    if (hasRegs) {
      showToast('Cannot delete a course with active registrations. Archive it instead.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to delete this course?')) return;

    if (IS_DEMO_MODE) {
      setCourses(prev => prev.filter(c => c.id !== courseId));
      showToast('Course deleted.', 'success');
      return;
    }
    await supabase.from('courses').delete().eq('id', courseId);
    setCourses(prev => prev.filter(c => c.id !== courseId));
    showToast('Course deleted.', 'success');
  };

  const handleToggleRegistration = async (course: CourseData) => {
    const updated = { registration_open: !course.registration_open };
    if (IS_DEMO_MODE) {
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, ...updated } : c));
      showToast(`Registration ${updated.registration_open ? 'opened' : 'closed'}.`, 'success');
      return;
    }
    await supabase.from('courses').update(updated).eq('id', course.id);
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, ...updated } : c));
    showToast(`Registration ${updated.registration_open ? 'opened' : 'closed'}.`, 'success');
  };

  const filteredCourses = courses.filter(c =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.course_code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = students.filter(s =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRegs = regs.filter(r =>
    !search || r.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.course?.title?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'courses', label: 'Courses', icon: BookOpen },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'registrations', label: 'Registrations', icon: BookOpen },
  ];

  return (
    <AppLayout title="Administration" subtitle="Manage courses, students, and registrations">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        {activeTab === 'courses' && (
          <button
            onClick={() => setCourseModal({ open: true, course: null })}
            className="btn-primary whitespace-nowrap"
          >
            <Plus size={16} /> New Course
          </button>
        )}
      </div>

      {/* Courses Table */}
      {activeTab === 'courses' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Course</th>
                <th className="table-header">Dept.</th>
                <th className="table-header">Instructor</th>
                <th className="table-header">Credits</th>
                <th className="table-header">Enrollment</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                : filteredCourses.map(c => (
                    <tr key={c.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                            <CourseImage
                              src={c.image_url}
                              alt={c.title}
                              className="w-full h-full object-cover"
                              containerClassName="w-full h-full"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate max-w-xs">{c.title}</p>
                            <p className="text-xs text-slate-400">{c.course_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-slate-600 text-xs">{c.department}</td>
                      <td className="table-cell text-slate-600 text-xs">{c.instructor}</td>
                      <td className="table-cell">
                        <span className="badge-blue">{c.credits} cr</span>
                      </td>
                      <td className="table-cell">
                        <span className={c.enrolled_count >= c.capacity ? 'badge-red' : 'badge-green'}>
                          {c.enrolled_count}/{c.capacity}
                        </span>
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handleToggleRegistration(c)}
                          className={`text-xs font-medium flex items-center gap-1 ${
                            c.registration_open ? 'text-green-600' : 'text-slate-400'
                          }`}
                        >
                          {c.registration_open ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          {c.registration_open ? 'Open' : 'Closed'}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCourseModal({ open: true, course: c })}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Table */}
      {activeTab === 'students' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Student ID</th>
                <th className="table-header">Department</th>
                <th className="table-header">Programme</th>
                <th className="table-header">Year</th>
                <th className="table-header">Registrations</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                : filteredStudents.map(s => {
                    const studentRegs = regs.filter(
                      r => r.student_id === s.id && r.status === 'registered'
                    );
                    return (
                      <tr key={s.id} className="table-row">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-700">
                              {s.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{s.full_name}</p>
                              <p className="text-xs text-slate-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell"><span className="badge-blue">{s.student_id}</span></td>
                        <td className="table-cell text-xs text-slate-600">{s.department}</td>
                        <td className="table-cell text-xs text-slate-600">{s.programme}</td>
                        <td className="table-cell text-xs text-slate-600">Year {s.academic_year}</td>
                        <td className="table-cell">
                          <span className="badge-green">{studentRegs.length} courses</span>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {/* Registrations Table */}
      {activeTab === 'registrations' && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Student</th>
                <th className="table-header">Course</th>
                <th className="table-header">Credits</th>
                <th className="table-header">Semester</th>
                <th className="table-header">Date</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                : filteredRegs.map(r => (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell">
                        <p className="font-semibold text-slate-900">{r.profile?.full_name ?? 'N/A'}</p>
                        <p className="text-xs text-slate-400">{r.profile?.student_id}</p>
                      </td>
                      <td className="table-cell">
                        <p className="font-semibold text-slate-900">{r.course?.course_code}</p>
                        <p className="text-xs text-slate-400 truncate max-w-32">{r.course?.title}</p>
                      </td>
                      <td className="table-cell">
                        <span className="badge-blue">{r.course?.credits} cr</span>
                      </td>
                      <td className="table-cell text-xs text-slate-600">{r.course?.semester}</td>
                      <td className="table-cell text-xs text-slate-500">
                        {new Date(r.registered_at).toLocaleDateString()}
                      </td>
                      <td className="table-cell">
                        <span className={{
                          registered: 'badge-green',
                          pending: 'badge-yellow',
                          cancelled: 'badge-gray',
                          rejected: 'badge-red',
                        }[r.status] ?? 'badge-gray'}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {courseModal.open && (
        <CourseFormModal
          course={courseModal.course}
          onSave={handleSaveCourse}
          onClose={() => setCourseModal({ open: false })}
        />
      )}
    </AppLayout>
  );
}
