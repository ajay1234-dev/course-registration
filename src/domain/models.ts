// =============================================================================
// OOP DOMAIN MODELS — CourseFlow Registration System
// Demonstrates: Encapsulation, Inheritance, Abstraction, Polymorphism
// =============================================================================

// --- Interfaces (Abstraction) ------------------------------------------------

export interface IUser {
  id: string;
  name: string;
  email: string;
  getDisplayName(): string;
  getRole(): 'student' | 'admin';
}

export interface IRegistrationOperation {
  validate(): Promise<ValidationResult>;
  confirm(): Promise<boolean>;
  cancel(): Promise<boolean>;
}

export interface ICourseOperation {
  isAvailable(): boolean;
  hasAvailableSeats(): boolean;
  getCourseSummary(): CourseSummary;
}

// --- Types ------------------------------------------------------------------

export type UserRole = 'student' | 'admin';
export type RegistrationStatus = 'registered' | 'pending' | 'cancelled' | 'rejected';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CourseSummary {
  courseCode: string;
  title: string;
  credits: number;
  department: string;
  instructor: string;
  availableSeats: number;
}

// Profile data shape from DB
export interface ProfileData {
  id: string;
  full_name: string;
  student_id: string;
  email: string;
  department: string;
  programme: string;
  academic_year: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Course data shape from DB
export interface CourseData {
  id: string;
  course_code: string;
  title: string;
  description: string;
  department: string;
  instructor: string;
  credits: number;
  semester: string;
  capacity: number;
  enrolled_count: number;
  registration_open: boolean;
  registration_deadline: string | null;
  created_at: string;
  updated_at: string;
  prerequisites?: string[];
  image_url?: string;
}

// Registration data shape from DB
export interface RegistrationData {
  id: string;
  student_id: string;
  course_id: string;
  status: RegistrationStatus;
  registered_at: string;
  updated_at: string;
  course?: CourseData;
  profile?: ProfileData;
}

// =============================================================================
// A. User — Base Class (Encapsulation + Abstraction)
// =============================================================================
export abstract class User implements IUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  private readonly _role: UserRole;

  constructor(id: string, name: string, email: string, role: UserRole) {
    this.id = id;
    this.name = name;
    this.email = email;
    this._role = role;
  }

  // Polymorphic method — overridden by subclasses
  getDisplayName(): string {
    return this.name;
  }

  getRole(): UserRole {
    return this._role;
  }

  isAdmin(): boolean {
    return this._role === 'admin';
  }

  isStudent(): boolean {
    return this._role === 'student';
  }

  toPlain(): Record<string, unknown> {
    return { id: this.id, name: this.name, email: this.email, role: this._role };
  }
}

// =============================================================================
// B. Student extends User (Inheritance + Encapsulation)
// =============================================================================
export class Student extends User {
  readonly studentId: string;
  readonly department: string;
  readonly academicYear: number;
  readonly programme: string;

  private _registrations: RegistrationData[] = [];
  private static readonly CREDIT_LIMIT = 25;

  constructor(data: ProfileData) {
    super(data.id, data.full_name, data.email, 'student');
    this.studentId = data.student_id;
    this.department = data.department;
    this.academicYear = data.academic_year;
    this.programme = data.programme;
  }

  // Polymorphism — overrides base class
  override getDisplayName(): string {
    return `${this.name} (${this.studentId})`;
  }

  setRegistrations(registrations: RegistrationData[]): void {
    this._registrations = registrations;
  }

  getRegistrations(): RegistrationData[] {
    return [...this._registrations];
  }

  getRegisteredCredits(): number {
    return this._registrations
      .filter(r => r.status === 'registered')
      .reduce((sum, r) => sum + (r.course?.credits ?? 0), 0);
  }

  getCreditLimit(): number {
    return Student.CREDIT_LIMIT;
  }

  canRegisterForCourse(course: Course): { allowed: boolean; reason?: string } {
    // Already registered?
    const alreadyRegistered = this._registrations.some(
      r => r.course_id === course.id && r.status === 'registered'
    );
    if (alreadyRegistered) {
      return { allowed: false, reason: 'You are already registered for this course.' };
    }

    // Credit limit check
    const currentCredits = this.getRegisteredCredits();
    if (currentCredits + course.credits > Student.CREDIT_LIMIT) {
      return {
        allowed: false,
        reason: `Adding this course would exceed your credit limit of ${Student.CREDIT_LIMIT} credits. You currently have ${currentCredits} credits.`,
      };
    }

    // Seat availability
    if (!course.hasAvailableSeats()) {
      return { allowed: false, reason: 'No seats are available for this course.' };
    }

    // Registration open
    if (!course.isAvailable()) {
      return { allowed: false, reason: 'Registration for this course is currently closed.' };
    }

    return { allowed: true };
  }
}

// =============================================================================
// C. Administrator extends User (Inheritance + Polymorphism)
// =============================================================================
export class Administrator extends User {
  constructor(data: ProfileData) {
    super(data.id, data.full_name, data.email, 'admin');
  }

  // Polymorphism — overrides base class
  override getDisplayName(): string {
    return `${this.name} [Admin]`;
  }

  canManageCourses(): boolean {
    return true;
  }

  canManageStudents(): boolean {
    return true;
  }

  canViewReports(): boolean {
    return true;
  }
}

// =============================================================================
// D. Course (Encapsulation + ICourseOperation)
// =============================================================================
export class Course implements ICourseOperation {
  readonly id: string;
  readonly courseCode: string;
  readonly title: string;
  readonly description: string;
  readonly department: string;
  readonly instructor: string;
  readonly credits: number;
  readonly semester: string;
  readonly capacity: number;
  readonly prerequisites: string[];
  readonly registrationDeadline: Date | null;
  readonly imageUrl?: string;

  private _enrolledCount: number;
  private _registrationOpen: boolean;

  constructor(data: CourseData) {
    this.id = data.id;
    this.courseCode = data.course_code;
    this.title = data.title;
    this.description = data.description;
    this.department = data.department;
    this.instructor = data.instructor;
    this.credits = data.credits;
    this.semester = data.semester;
    this.capacity = data.capacity;
    this.prerequisites = data.prerequisites ?? [];
    this.registrationDeadline = data.registration_deadline
      ? new Date(data.registration_deadline)
      : null;
    this.imageUrl = data.image_url;
    this._enrolledCount = data.enrolled_count;
    this._registrationOpen = data.registration_open;
  }

  get enrolledCount(): number {
    return this._enrolledCount;
  }

  get registrationOpen(): boolean {
    return this._registrationOpen;
  }

  isAvailable(): boolean {
    if (!this._registrationOpen) return false;
    if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
    return this.hasAvailableSeats();
  }

  hasAvailableSeats(): boolean {
    return this._enrolledCount < this.capacity;
  }

  getAvailableSeats(): number {
    return Math.max(0, this.capacity - this._enrolledCount);
  }

  getEnrollmentPercentage(): number {
    if (this.capacity === 0) return 100;
    return Math.round((this._enrolledCount / this.capacity) * 100);
  }

  getCourseSummary(): CourseSummary {
    return {
      courseCode: this.courseCode,
      title: this.title,
      credits: this.credits,
      department: this.department,
      instructor: this.instructor,
      availableSeats: this.getAvailableSeats(),
    };
  }
}

// =============================================================================
// E. Registration (Encapsulation + IRegistrationOperation)
// =============================================================================
export class Registration implements IRegistrationOperation {
  readonly id: string;
  readonly studentId: string;
  readonly courseId: string;
  readonly registeredAt: Date;

  private _status: RegistrationStatus;

  constructor(data: RegistrationData) {
    this.id = data.id;
    this.studentId = data.student_id;
    this.courseId = data.course_id;
    this._status = data.status;
    this.registeredAt = new Date(data.registered_at);
  }

  get status(): RegistrationStatus {
    return this._status;
  }

  isActive(): boolean {
    return this._status === 'registered';
  }

  isCancellable(): boolean {
    return this._status === 'registered' || this._status === 'pending';
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    if (!this.studentId) errors.push('Student ID is required.');
    if (!this.courseId) errors.push('Course ID is required.');
    return { valid: errors.length === 0, errors };
  }

  async confirm(): Promise<boolean> {
    const result = await this.validate();
    if (!result.valid) return false;
    this._status = 'registered';
    return true;
  }

  async cancel(): Promise<boolean> {
    if (!this.isCancellable()) return false;
    this._status = 'cancelled';
    return true;
  }
}

// =============================================================================
// Factory — Create domain objects from raw DB data
// =============================================================================
export class UserFactory {
  static create(data: ProfileData): Student | Administrator {
    if (data.role === 'admin') {
      return new Administrator(data);
    }
    return new Student(data);
  }
}
