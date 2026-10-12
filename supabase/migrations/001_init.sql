-- =============================================================================
-- CourseFlow Database Migration — 001_init.sql
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLES
-- =============================================================================

-- Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  programme TEXT NOT NULL DEFAULT '',
  academic_year INTEGER NOT NULL DEFAULT 1 CHECK (academic_year BETWEEN 1 AND 6),
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL,
  instructor TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits BETWEEN 1 AND 6),
  semester TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  enrolled_count INTEGER NOT NULL DEFAULT 0 CHECK (enrolled_count >= 0),
  registration_open BOOLEAN NOT NULL DEFAULT TRUE,
  registration_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_course_code_per_semester UNIQUE (course_code, semester)
);

-- Course prerequisites
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT no_self_prerequisite CHECK (course_id != prerequisite_course_id),
  CONSTRAINT unique_prerequisite UNIQUE (course_id, prerequisite_course_id)
);

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'pending', 'cancelled', 'rejected')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_active_registration UNIQUE (student_id, course_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_registrations_student_id ON registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_registrations_course_id ON registrations(course_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update own profile (no role escalation)"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Courses policies (public read for authenticated users)
CREATE POLICY "Authenticated users can view courses"
  ON courses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can create courses"
  ON courses FOR INSERT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can update courses"
  ON courses FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can delete courses"
  ON courses FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Course prerequisites (read for all authenticated)
CREATE POLICY "Authenticated users can view prerequisites"
  ON course_prerequisites FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage prerequisites"
  ON course_prerequisites FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Registrations policies
CREATE POLICY "Students can view own registrations"
  ON registrations FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Admins can view all registrations"
  ON registrations FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update registrations"
  ON registrations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- FUNCTIONS (Atomic operations with validation)
-- =============================================================================

-- Register student for a course (atomic, prevents race conditions)
CREATE OR REPLACE FUNCTION register_student_for_course(
  p_student_id UUID,
  p_course_id UUID
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course courses%ROWTYPE;
  v_existing_reg registrations%ROWTYPE;
  v_current_credits INTEGER;
  v_new_reg registrations%ROWTYPE;
BEGIN
  -- Verify caller is the student or admin
  IF auth.uid() != p_student_id THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Unauthorized: You can only register yourself.';
    END IF;
  END IF;

  -- Lock the course row to prevent concurrent seat allocation
  SELECT * INTO v_course FROM courses WHERE id = p_course_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course not found.';
  END IF;

  -- Check registration is open
  IF NOT v_course.registration_open THEN
    RAISE EXCEPTION 'Registration is closed for this course.';
  END IF;

  -- Check deadline
  IF v_course.registration_deadline IS NOT NULL AND NOW() > v_course.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed for this course.';
  END IF;

  -- Check seats
  IF v_course.enrolled_count >= v_course.capacity THEN
    RAISE EXCEPTION 'No seats available — this course is full.';
  END IF;

  -- Check already registered
  SELECT * INTO v_existing_reg
  FROM registrations
  WHERE student_id = p_student_id AND course_id = p_course_id AND status IN ('registered', 'pending');

  IF FOUND THEN
    RAISE EXCEPTION 'Student is already registered for this course.';
  END IF;

  -- Check credit limit (25 credits max)
  SELECT COALESCE(SUM(c.credits), 0) INTO v_current_credits
  FROM registrations r
  JOIN courses c ON c.id = r.course_id
  WHERE r.student_id = p_student_id AND r.status = 'registered';

  IF v_current_credits + v_course.credits > 25 THEN
    RAISE EXCEPTION 'Credit limit exceeded. Current: %, Adding: %, Limit: 25.',
      v_current_credits, v_course.credits;
  END IF;

  -- Create registration
  INSERT INTO registrations (student_id, course_id, status)
  VALUES (p_student_id, p_course_id, 'registered')
  RETURNING * INTO v_new_reg;

  -- Increment enrolled count atomically
  UPDATE courses SET enrolled_count = enrolled_count + 1, updated_at = NOW()
  WHERE id = p_course_id;

  RETURN v_new_reg;
END;
$$;

-- Cancel registration (atomic)
CREATE OR REPLACE FUNCTION cancel_student_registration(
  p_registration_id UUID,
  p_student_id UUID
)
RETURNS registrations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reg registrations%ROWTYPE;
BEGIN
  -- Verify caller owns this registration or is admin
  IF auth.uid() != p_student_id THEN
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'Unauthorized.';
    END IF;
  END IF;

  -- Lock registration
  SELECT * INTO v_reg FROM registrations WHERE id = p_registration_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found.';
  END IF;

  IF v_reg.student_id != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: This is not your registration.';
  END IF;

  IF v_reg.status NOT IN ('registered', 'pending') THEN
    RAISE EXCEPTION 'This registration cannot be cancelled (status: %).', v_reg.status;
  END IF;

  -- Update status
  UPDATE registrations
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_registration_id
  RETURNING * INTO v_reg;

  -- Release the seat
  UPDATE courses
  SET enrolled_count = GREATEST(0, enrolled_count - 1), updated_at = NOW()
  WHERE id = v_reg.course_id;

  RETURN v_reg;
END;
$$;

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- SEED DATA (Sample courses)
-- =============================================================================

INSERT INTO courses (course_code, title, description, department, instructor, credits, semester, capacity, registration_open) VALUES
('CS301', 'Data Structures & Algorithms', 'Comprehensive study of data structures and algorithms with practical implementation in C++ and Java.', 'Computer Science', 'Prof. Anil Kumar', 4, 'Odd 2024-25', 60, true),
('CS401', 'Database Management Systems', 'Introduction to RDBMS, SQL, normalization, transactions, and NoSQL.', 'Computer Science', 'Dr. Kavitha Reddy', 4, 'Odd 2024-25', 55, true),
('CS501', 'Machine Learning', 'Supervised and unsupervised learning, neural networks, and deep learning with Python.', 'Computer Science', 'Dr. Rajan Pillai', 4, 'Odd 2024-25', 40, true),
('IT301', 'Web Technologies', 'Modern web development with HTML5, CSS3, JavaScript, React, and Node.js.', 'Information Technology', 'Prof. Sunita Rao', 3, 'Odd 2024-25', 50, true),
('IT401', 'Network Security', 'Cybersecurity fundamentals including encryption, firewalls, and ethical hacking.', 'Information Technology', 'Dr. Mohan Das', 3, 'Odd 2024-25', 45, true),
('EC301', 'Digital Signal Processing', 'Digital signals, Fourier transforms, FIR/IIR filters, and MATLAB analysis.', 'Electronics', 'Prof. Deepa Menon', 4, 'Odd 2024-25', 40, true),
('EC401', 'VLSI Design', 'CMOS VLSI design, logic synthesis, layout, and Cadence tool usage.', 'Electronics', 'Dr. Srinath Kumar', 4, 'Odd 2024-25', 35, false),
('ME301', 'Thermodynamics', 'Fundamental laws of thermodynamics and applications in engineering.', 'Mechanical Engineering', 'Prof. Kiran Bose', 4, 'Odd 2024-25', 60, true),
('ME401', 'Finite Element Analysis', 'FEA theory and practice using ANSYS and SolidWorks.', 'Mechanical Engineering', 'Dr. Venkat Rao', 3, 'Odd 2024-25', 40, true),
('CS201', 'Object-Oriented Programming', 'OOP concepts: classes, inheritance, polymorphism, and design patterns using Java and C++.', 'Computer Science', 'Prof. Anjali Singh', 4, 'Odd 2024-25', 65, true),
('IT501', 'Cloud Computing', 'AWS, Azure, GCP platforms, Docker, Kubernetes, and serverless architecture.', 'Information Technology', 'Dr. Pradeep Nambiar', 3, 'Even 2024-25', 50, true),
('CS601', 'Artificial Intelligence', 'AI search algorithms, knowledge representation, NLP, and computer vision.', 'Computer Science', 'Prof. Suresh Babu', 4, 'Even 2024-25', 45, true)
ON CONFLICT DO NOTHING;
