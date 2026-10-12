import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, IS_DEMO_MODE } from '@/lib/supabase';
import {
  ProfileData,
  UserRole,
  Student,
  Administrator,
  UserFactory,
} from '@/domain/models';
import {
  DEMO_ADMIN,
  DEMO_STUDENT,
} from '@/data/demoData';

interface AuthContextType {
  profile: ProfileData | null;
  domainUser: Student | Administrator | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  demoRole: UserRole;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (
    email: string,
    password: string,
    name: string,
    studentId: string,
    department: string,
    programme: string,
    academicYear: number
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<{ error?: string }>;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [domainUser, setDomainUser] = useState<Student | Administrator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demoRole, setDemoRole] = useState<UserRole>('student');

  const buildDomainUser = useCallback((p: ProfileData) => {
    setDomainUser(UserFactory.create(p));
  }, []);

  // Demo mode — pre-load demo profile
  useEffect(() => {
    if (IS_DEMO_MODE) {
      const demoProfile = demoRole === 'admin' ? DEMO_ADMIN : DEMO_STUDENT;
      setProfile(demoProfile);
      buildDomainUser(demoProfile);
      setIsLoading(false);
      return;
    }
  }, [demoRole, buildDomainUser]);

  // Real Supabase mode — listen for auth state changes
  useEffect(() => {
    if (IS_DEMO_MODE) return;

    let mounted = true;

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (mounted && data) {
        setProfile(data as ProfileData);
        buildDomainUser(data as ProfileData);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setDomainUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [buildDomainUser]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    if (IS_DEMO_MODE) {
      // Demo: accept any credentials
      if (email.includes('admin')) {
        setDemoRole('admin');
        setProfile(DEMO_ADMIN);
        buildDomainUser(DEMO_ADMIN);
      } else {
        setDemoRole('student');
        setProfile(DEMO_STUDENT);
        buildDomainUser(DEMO_STUDENT);
      }
      return {};
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    studentId: string,
    department: string,
    programme: string,
    academicYear: number
  ): Promise<{ error?: string }> => {
    if (IS_DEMO_MODE) {
      return { error: 'Cannot register in demo mode. Use demo credentials instead.' };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Sign-up failed. Please try again.' };

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name,
      student_id: studentId,
      email,
      department,
      programme,
      academic_year: academicYear,
      role: 'student',
    });

    if (profileError) return { error: profileError.message };
    return {};
  };

  const logout = async () => {
    if (IS_DEMO_MODE) {
      setProfile(DEMO_STUDENT);
      buildDomainUser(DEMO_STUDENT);
      setDemoRole('student');
      return;
    }
    await supabase.auth.signOut();
    setProfile(null);
    setDomainUser(null);
  };

  const updateProfile = async (updates: Partial<ProfileData>): Promise<{ error?: string }> => {
    if (!profile) return { error: 'Not authenticated.' };
    if (IS_DEMO_MODE) {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      buildDomainUser(updated);
      return {};
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', profile.id);

    if (error) return { error: error.message };

    const updated = { ...profile, ...updates };
    setProfile(updated);
    buildDomainUser(updated);
    return {};
  };

  const switchDemoRole = (role: UserRole) => {
    if (!IS_DEMO_MODE) return;
    setDemoRole(role);
    const p = role === 'admin' ? DEMO_ADMIN : DEMO_STUDENT;
    setProfile(p);
    buildDomainUser(p);
  };

  return (
    <AuthContext.Provider
      value={{
        profile,
        domainUser,
        isLoading,
        isAuthenticated: !!profile,
        isDemoMode: IS_DEMO_MODE,
        demoRole,
        login,
        register,
        logout,
        updateProfile,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
