import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  BarChart3,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { IS_DEMO_MODE } from '@/lib/supabase';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Browse Courses', icon: BookOpen, path: '/courses' },
  { label: 'My Registrations', icon: ClipboardList, path: '/registrations' },
  { label: 'My Profile', icon: User, path: '/profile' },
  { label: 'Administration', icon: ShieldCheck, path: '/admin', adminOnly: true },
  { label: 'Reports', icon: BarChart3, path: '/admin/reports', adminOnly: true },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

function NavLink({
  item,
  isAdmin,
  onClick,
}: {
  item: NavItem;
  isAdmin: boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  if (item.adminOnly && !isAdmin) return null;

  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        navigate(item.path);
        onClick?.();
      }}
      className={isActive ? 'sidebar-link-active w-full' : 'sidebar-link w-full'}
    >
      <Icon size={18} />
      <span>{item.label}</span>
      {isActive && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );
}

function SidebarContent({
  onClose,
  isAdmin,
  onLogout,
}: {
  onClose?: () => void;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const { profile, isDemoMode, switchDemoRole, demoRole } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-slate-100">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <GraduationCap size={18} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm leading-tight">CourseFlow</p>
          <p className="text-xs text-slate-400 leading-tight">Odd 2024-25</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Role Switcher */}
      <div className="mx-3 mt-3 p-1.5 bg-slate-100 rounded-xl">
        <div className="flex gap-1">
          <button
            onClick={() => switchDemoRole('student')}
            className={`text-xs font-semibold py-1.5 rounded-lg flex-1 transition-all flex items-center justify-center gap-1.5 ${
              demoRole === 'student'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>Student</span>
          </button>
          <button
            onClick={() => switchDemoRole('admin')}
            className={`text-xs font-semibold py-1.5 rounded-lg flex-1 transition-all flex items-center justify-center gap-1.5 ${
              demoRole === 'admin'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <NavLink key={item.path} item={item} isAdmin={isAdmin} onClick={onClose} />
        ))}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-blue-700 font-semibold text-xs">
              {profile?.full_name?.charAt(0) ?? '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { profile, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 border-r border-slate-200 bg-white flex-col shrink-0">
        <SidebarContent isAdmin={isAdmin} onLogout={handleLogout} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-white flex flex-col shadow-xl z-50">
            <SidebarContent
              isAdmin={isAdmin}
              onLogout={handleLogout}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-slate-900 text-sm leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button className="hidden sm:flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Search size={14} />
              <span className="text-xs">Search…</span>
            </button>

            <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold"
            >
              {profile?.full_name?.charAt(0) ?? '?'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
