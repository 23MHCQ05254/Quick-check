import { ExternalLink, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function StudentsPage() {
  const [query, setQuery] = useState('');
  const { data, loading } = useAsync(async () => (await api.get('/mentor/students')).data.items, []);
  const students = useMemo(() => {
    const q = query.toLowerCase();
    return (data || []).filter((student) => `${student.name} ${student.email} ${student.department}`.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Placement monitoring</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Student readiness</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Verified certificates, skill scores, and portfolio links help mentors identify placement-ready students.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-300/40 bg-white/70 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400">
          <Search size={16} />
          <input
            className="w-56 bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Search students"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4">
        {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        {!loading &&
          students.map((student) => (
            <GlassPanel key={student._id || student.id} className="p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <p className="font-black text-slate-950 dark:text-white">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {student.email} · {student.department || 'Department not set'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(student.skills || []).slice(0, 4).map((skill) => (
                        <span key={skill} className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4 lg:w-[520px]">
                  {[
                    ['Certificates', student.certificates || 0],
                    ['Verified', student.verified || 0],
                    ['Skill', student.skillScore || 0],
                    ['Ready', `${student.placementReadiness || 0}%`]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-900/10 bg-white/55 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="mt-1 font-black text-slate-950 dark:text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <Link className="inline-flex items-center gap-2 text-sm font-bold text-cyber-cyan" to={`/portfolio/${student.publicSlug}`}>
                  <ShieldCheck size={16} />
                  Portfolio
                  <ExternalLink size={14} />
                </Link>
              </div>
            </GlassPanel>
          ))}
      </div>
    </div>
  );
}

