// =============================================================================
// RegistrationService — Business Logic Service (F in spec)
// Demonstrates: Composition, Dependency Injection, Service Layer
// =============================================================================

import { supabase } from '@/lib/supabase';
import {
  Course,
  Registration,
  Student,
  CourseData,
  RegistrationData,
  ValidationResult,
} from '@/domain/models';

export interface RegistrationResult {
  success: boolean;
  message: string;
  registration?: RegistrationData;
}

export class RegistrationService {
  private static instance: RegistrationService;

  // Singleton pattern — single service instance
  static getInstance(): RegistrationService {
    if (!RegistrationService.instance) {
      RegistrationService.instance = new RegistrationService();
    }
    return RegistrationService.instance;
  }

  private constructor() {}

  // ── Check eligibility (pure domain logic) ──────────────────────────────────
  async checkEligibility(
    student: Student,
    course: Course
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // 1. Registration open?
    if (!course.isAvailable()) {
      errors.push('Registration for this course is currently closed or deadline has passed.');
    }

    // 2. Seats available?
    if (!course.hasAvailableSeats()) {
      errors.push('This course has no available seats.');
    }

    // 3. Already registered?
    const { data: existing } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('student_id', student.id)
      .eq('course_id', course.id)
      .in('status', ['registered', 'pending'])
      .single();

    if (existing) {
      errors.push('You are already registered for this course.');
    }

    // 4. Credit limit
    const currentCredits = await this.calculateRegisteredCredits(student.id);
    if (currentCredits + course.credits > 25) {
      errors.push(
        `Adding this course (${course.credits} credits) would exceed your limit of 25 credits. You have ${currentCredits} credits.`
      );
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Check seat availability (realtime) ────────────────────────────────────
  async checkSeatAvailability(courseId: string): Promise<{ available: boolean; seats: number }> {
    const { data: course } = await supabase
      .from('courses')
      .select('capacity, enrolled_count')
      .eq('id', courseId)
      .single();

    if (!course) return { available: false, seats: 0 };
    const seats = course.capacity - course.enrolled_count;
    return { available: seats > 0, seats: Math.max(0, seats) };
  }

  // ── Calculate credits ──────────────────────────────────────────────────────
  async calculateRegisteredCredits(studentId: string): Promise<number> {
    const { data } = await supabase
      .from('registrations')
      .select('courses(credits)')
      .eq('student_id', studentId)
      .eq('status', 'registered');

    if (!data) return 0;
    return data.reduce((sum, r) => {
      const reg = r as unknown as { courses: { credits: number } | null };
      return sum + (reg.courses?.credits ?? 0);
    }, 0);
  }

  // ── Register student (atomic DB operation) ─────────────────────────────────
  async registerStudent(
    studentId: string,
    courseId: string
  ): Promise<RegistrationResult> {
    try {
      // Call the secure DB function (handles race conditions atomically)
      const { data, error } = await supabase.rpc('register_student_for_course', {
        p_student_id: studentId,
        p_course_id: courseId,
      });

      if (error) {
        // Parse friendly messages from DB errors
        const msg = error.message ?? 'Registration failed.';
        if (msg.includes('already registered')) {
          return { success: false, message: 'You are already registered for this course.' };
        }
        if (msg.includes('no seats') || msg.includes('capacity')) {
          return { success: false, message: 'No seats available. The course is full.' };
        }
        if (msg.includes('closed')) {
          return { success: false, message: 'Registration for this course is closed.' };
        }
        if (msg.includes('credit')) {
          return { success: false, message: 'Registering would exceed your credit limit of 25 credits.' };
        }
        return { success: false, message: msg };
      }

      return {
        success: true,
        message: 'Successfully registered for the course!',
        registration: data as RegistrationData,
      };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      };
    }
  }

  // ── Cancel registration ────────────────────────────────────────────────────
  async cancelRegistration(
    registrationId: string,
    studentId: string
  ): Promise<RegistrationResult> {
    try {
      const { data, error } = await supabase.rpc('cancel_student_registration', {
        p_registration_id: registrationId,
        p_student_id: studentId,
      });

      if (error) {
        return { success: false, message: error.message ?? 'Failed to cancel registration.' };
      }

      // Use data to satisfy no-unused-vars (it's the updated registration row)
      void data;

      return { success: true, message: 'Registration cancelled successfully.' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      };
    }
  }

  // ── Get student registrations ──────────────────────────────────────────────
  async getStudentRegistrations(studentId: string): Promise<RegistrationData[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        course:courses(*)
      `)
      .eq('student_id', studentId)
      .order('registered_at', { ascending: false });

    if (error || !data) return [];
    return data as unknown as RegistrationData[];
  }

  // ── Get all registrations (admin) ─────────────────────────────────────────
  async getAllRegistrations(): Promise<RegistrationData[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select(`
        *,
        course:courses(*),
        profile:profiles(*)
      `)
      .order('registered_at', { ascending: false });

    if (error || !data) return [];
    return data as unknown as RegistrationData[];
  }

  // ── Export registrations as CSV ────────────────────────────────────────────
  exportAsCSV(registrations: RegistrationData[]): string {
    const headers = [
      'Registration ID',
      'Student Name',
      'Student ID',
      'Course Code',
      'Course Title',
      'Credits',
      'Semester',
      'Status',
      'Registered At',
    ];

    const rows = registrations.map(r => [
      r.id,
      r.profile?.full_name ?? '',
      r.profile?.student_id ?? '',
      r.course?.course_code ?? '',
      r.course?.title ?? '',
      r.course?.credits ?? '',
      r.course?.semester ?? '',
      r.status,
      new Date(r.registered_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  // ── Create new registration domain object ──────────────────────────────────
  createRegistrationObject(data: RegistrationData): Registration {
    return new Registration(data);
  }
}

// Singleton export
export const registrationService = RegistrationService.getInstance();
