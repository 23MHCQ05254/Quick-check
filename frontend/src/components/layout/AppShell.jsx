import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BadgeCheck,
  Bell,
  BookOpenCheck,
  FileCheck2,
  FileWarning,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  RadioTower,
  Search,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../common/Logo.jsx';
import { ThemeToggle } from '../common/ThemeToggle.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const studentNav = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, end: true },
  { label: 'Catalog', to: '/dashboard/catalog', icon: BookOpenCheck },
  { label: 'Upload', to: '/dashboard/upload', icon: UploadCloud },
  { label: 'Certificates', to: '/dashboard/certificates', icon: FileCheck2 }
];

const mentorNav = [
  { label: 'Command', to: '/mentor/dashboard', icon: BarChart3, end: true },
  { label: 'Review', to: '/mentor/review', icon: FileWarning },
  { label: 'Moderation', to: '/mentor/moderation', icon: ShieldCheck },
  { label: 'Analytics', to: '/mentor/analytics', icon: RadioTower },
  { label: 'Catalog', to: '/mentor/catalog', icon: BookOpenCheck },
  { label: 'Templates', to: '/mentor/templates', icon: BadgeCheck },
  { label: 'Students', to: '/mentor/students', icon: UsersRound },
  { label: 'Activity', to: '/mentor/activity', icon: Bell }
];

function NavItem({ item, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={Boolean(item.end)}
      onClick={onClick}
      className={({ isActive }) =>
        `focus-ring flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${isActive
          ? 'bg-ink text-white shadow-glow dark:bg-white dark:text-ink'
          : 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10'
        }`
      }
    >
      <Icon size={18} />
      {item.label}
    </NavLink>
  );
}

function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const nav = user.role === 'MENTOR' ? mentorNav : studentNav;

  return (
    <aside className={`${mobile ? 'h-full w-80' : 'hidden w-72 shrink-0 lg:flex'} flex-col border-r border-slate-900/10 bg-white/60 p-5 backdrop-blur-2xl dark:border-white/10 dark:bg-ink/72`}>
      <div className="flex items-center justify-between">
        <Logo />
        {mobile && (
          <button className="focus-ring rounded-2xl p-2 hover:bg-slate-900/5 dark:hover:bg-white/10" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-900/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/[0.05]">
        <p className="text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">Signed in</p>
        <p className="mt-2 truncate text-sm font-bold text-slate-950 dark:text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2">
        {nav.map((item) => (
          <NavItem key={item.to} item={item} onClick={onClose} />
        ))}
      </nav>

      <button
        onClick={logout}
        className="focus-ring mt-6 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-300"
      >
        <LogOut size={18} />
        Sign out
      </button>
    </aside>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const title = user.role === 'MENTOR' ? 'Mentor Verification Command' : 'Student Certificate Vault';

  return (
    <div className="flex min-h-screen bg-grid-fade bg-[length:34px_34px]">
      <Sidebar />

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="h-full"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar mobile onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-white/58 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-ink/68 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="focus-ring grid h-11 w-11 place-items-center rounded-2xl border border-slate-300/40 bg-white/70 lg:hidden dark:border-white/10 dark:bg-white/[0.06]"
                onClick={() => setOpen(true)}
                aria-label="Open menu"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">{title}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{location.pathname}</p>
              </div>
            </div>

            <div className="hidden min-w-[280px] items-center gap-2 rounded-2xl border border-slate-300/40 bg-white/70 px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400 md:flex">
              <Search size={16} />
              Search certificates, students, templates
            </div>

            <div className="flex items-center gap-2">
              <button className="focus-ring grid h-11 w-11 place-items-center rounded-2xl border border-slate-300/40 bg-white/70 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200" aria-label="Notifications" title="Notifications">
                <Bell size={18} />
              </button>
              <ThemeToggle />
              <div className="hidden h-11 w-11 place-items-center rounded-2xl bg-ink text-sm font-black text-white dark:bg-white dark:text-ink sm:grid">
                {user.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
