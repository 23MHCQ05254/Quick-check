import { ArrowLeft, Award, BadgeCheck, BriefcaseBusiness, CalendarDays, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Logo } from '../components/common/Logo.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function PortfolioPage() {
  const { slug } = useParams();
  const { data, loading, error } = useAsync(async () => (await api.get(`/portfolio/${slug}`)).data, [slug]);
  const student = data?.student;
  const certificates = data?.certificates || [];

  return (
    <div className="min-h-screen bg-grid-fade bg-[length:36px_36px] px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Link className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-300/40 bg-white/70 px-4 text-sm font-bold text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200" to="/">
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <main className="mx-auto max-w-6xl py-10">
        {loading && <Skeleton className="h-96" />}
        {error && <GlassPanel className="p-6 text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</GlassPanel>}
        {student && (
          <div className="space-y-6">
            <GlassPanel className="overflow-hidden">
              <div className="relative p-6 sm:p-8">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyber-green via-cyber-cyan to-cyber-rose" />
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyber-green">Verified achievement portfolio</p>
                    <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950 dark:text-white sm:text-5xl">{student.name}</h1>
                    <p className="mt-3 text-slate-500 dark:text-slate-400">
                      {student.department || 'Student'} · {student.rollNumber || 'Institution verified vault'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:w-[460px]">
                    {[
                      ['Verified', certificates.length, Award],
                      ['Skill', student.skillScore || 0, BadgeCheck],
                      ['Ready', `${student.placementReadiness || 0}%`, BriefcaseBusiness]
                    ].map(([label, value, Icon]) => (
                      <div key={label} className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                        <Icon size={18} className="text-cyber-cyan" />
                        <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white">{value}</p>
                        <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassPanel>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <GlassPanel className="p-6">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Verified certificates</h2>
                <div className="mt-5 space-y-4">
                  {certificates.map((certificate) => (
                    <div key={certificate._id || certificate.id} className="rounded-2xl border border-slate-900/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black text-slate-950 dark:text-white">{certificate.title}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{certificate.organization?.name}</p>
                        </div>
                        <a className="inline-flex items-center gap-2 text-sm font-bold text-cyber-cyan" href={certificate.fileUrl || '#'} target="_blank" rel="noreferrer">
                          Evidence
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                  {!certificates.length && <p className="text-sm text-slate-500 dark:text-slate-400">No mentor-verified certificates are public yet.</p>}
                </div>
              </GlassPanel>

              <GlassPanel className="p-6">
                <h2 className="text-lg font-black text-slate-950 dark:text-white">Achievement timeline</h2>
                <div className="mt-5 space-y-4">
                  {certificates.map((certificate) => (
                    <div key={`${certificate._id || certificate.id}-timeline`} className="flex gap-3">
                      <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-cyber-green">
                        <CalendarDays size={15} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-950 dark:text-white">{certificate.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString() : 'Issue date unavailable'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

