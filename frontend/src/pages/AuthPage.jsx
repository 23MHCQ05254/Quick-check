import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, FileScan, LockKeyhole, Radar, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Logo } from '../components/common/Logo.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { login, signup, user, isAuthenticated } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    rollNumber: '',
    graduationYear: ''
  });

  const target = useMemo(() => (user?.role === 'MENTOR' ? '/mentor' : '/student'), [user]);
  if (isAuthenticated) return <Navigate to={target} replace />;

  const submit = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const nextUser =
        mode === 'login'
          ? await login({ email: form.email, password: form.password })
          : await signup({
            name: form.name,
            email: form.email,
            password: form.password,
            department: form.department,
            rollNumber: form.rollNumber,
            graduationYear: Number(form.graduationYear)
          });
      navigate(nextUser.role === 'MENTOR' ? '/mentor' : '/student', { replace: true });
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-grid-fade bg-[length:36px_36px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Logo />
        <ThemeToggle />
      </div>

      <main className="mx-auto grid max-w-7xl gap-6 py-10 lg:grid-cols-[1fr_460px] lg:items-center lg:py-16">
        <section className="min-w-0">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-normal text-slate-600 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300">
              <Radar size={14} className="text-cyber-green" />
              AI-assisted certificate intelligence
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-normal text-slate-950 dark:text-white sm:text-5xl lg:text-7xl">
              QuickCheck
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
              A premium student certificate vault with template-based fraud probability, mentor verification, duplicate detection,
              placement readiness, and public achievement portfolios.
            </p>
          </motion.div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: FileScan, title: 'Template Locked', text: 'Students select the exact certification before upload.' },
              { icon: ShieldCheck, title: 'Fraud Probability', text: 'OCR, QR, image hash, and visual anomaly scoring.' },
              { icon: BadgeCheck, title: 'Mentor Review', text: 'Suspicious uploads flow to a verification command center.' }
            ].map((item, index) => (
              <GlassPanel key={item.title} className="p-4" delay={0.1 + index * 0.08}>
                <item.icon className="text-cyber-cyan" size={21} />
                <p className="mt-4 text-sm font-black text-slate-950 dark:text-white">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.text}</p>
              </GlassPanel>
            ))}
          </div>
        </section>

        <GlassPanel className="p-5 sm:p-6">
          <div className="flex rounded-2xl bg-slate-900/5 p-1 dark:bg-white/10">
            {['login', 'signup'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError('');
                }}
                className={`focus-ring flex-1 rounded-xl px-4 py-2 text-sm font-bold capitalize transition ${mode === item ? 'bg-white text-slate-950 shadow-sm dark:bg-ink dark:text-white' : 'text-slate-500 dark:text-slate-300'
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" method="post" noValidate onSubmit={submit}>
            {mode === 'signup' && (
              <>
                <input className="field" placeholder="Full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="field" placeholder="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} />
                  <input className="field" placeholder="Roll number" value={form.rollNumber} onChange={(event) => setForm({ ...form, rollNumber: event.target.value })} />
                </div>
                <input className="field" type="number" placeholder="Graduation year" value={form.graduationYear} onChange={(event) => setForm({ ...form, graduationYear: event.target.value })} />
              </>
            )}

            <input className="field" type="email" placeholder="Email address" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            <input className="field" type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />

            {error && <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Securing session' : mode === 'login' ? 'Enter workspace' : 'Create student vault'}
              <ArrowRight size={17} />
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-900/10 bg-white/55 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300">
            <LockKeyhole className="mt-0.5 shrink-0 text-cyber-green" size={18} />
            <p>New signups are always students. Mentor accounts are managed by the institution.</p>
          </div>
        </GlassPanel>
      </main>
    </div>
  );
}
