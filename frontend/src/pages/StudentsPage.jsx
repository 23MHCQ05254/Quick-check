import { ExternalLink, Filter, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { Link } from 'react-router-dom';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { RiskPill } from '../components/mentor/RiskPill.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function StudentsPage() {
  const [filters, setFilters] = useState({ search: '', department: '', year: '', risk: '', readiness: '', sort: 'readiness' });
  const debouncedSearch = useDebouncedValue(filters.search);
  const params = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const { data, loading } = useAsync(async () => (await api.get('/mentor/students', { params })).data, [params]);
  const students = data?.items || [];

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Placement monitoring</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Student readiness intelligence</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Search, sort, and filter students by department, year, risk, trust score, certificate activity, and placement readiness.
          </p>
        </div>
      </div>

      <GlassPanel className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_repeat(4,180px)]">
          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
            <Search size={17} className="text-cyber-cyan" />
            <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder="Search students, skills, departments" value={filters.search} onChange={(event) => update('search', event.target.value)} />
          </div>
          <select className="field" value={filters.risk} onChange={(event) => update('risk', event.target.value)}>
            <option value="">All risk</option>
            <option value="low">Low risk</option>
            <option value="medium">Medium risk</option>
            <option value="high">High risk</option>
          </select>
          <select className="field" value={filters.readiness} onChange={(event) => update('readiness', event.target.value)}>
            <option value="">All readiness</option>
            <option value="ready">Placement ready</option>
            <option value="needs-focus">Needs focus</option>
          </select>
          <select className="field" value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
            <option value="readiness">Sort readiness</option>
            <option value="risk">Sort risk</option>
            <option value="certificates">Sort uploads</option>
            <option value="name">Sort name</option>
          </select>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/5 px-4 text-sm font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
            <Filter size={16} />
            {students.length} students
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-4">
        {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
        {!loading &&
          students.map((student) => {
            const riskLevel = student.fraudScore >= 65 ? 'HIGH' : student.fraudScore >= 35 ? 'MEDIUM' : 'LOW';
            return (
              <GlassPanel key={student._id || student.id} className="p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
                      <GraduationCap size={22} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950 dark:text-white">{student.name}</p>
                        <RiskPill level={riskLevel} />
                        <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-black uppercase text-slate-500 dark:bg-white/10 dark:text-slate-300">
                          {student.mentorStatus}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {student.email} - {student.department || 'Department not set'} - {student.graduationYear || 'Year not set'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(student.skills || []).slice(0, 5).map((skill) => (
                          <span key={skill} className="rounded-full bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-5 xl:w-[650px]">
                    {[
                      ['Uploads', student.certificates || 0],
                      ['Verified', student.verified || 0],
                      ['Fraud', `${student.fraudScore || 0}%`],
                      ['Trust', `${student.trustScore || 0}%`],
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
                    Showcase
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </GlassPanel>
            );
          })}
      </div>
    </div>
  );
}
