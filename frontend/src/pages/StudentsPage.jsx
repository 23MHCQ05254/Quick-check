import { Download, ExternalLink, Filter, GraduationCap, Search, ShieldCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { Link } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { RiskPill } from '../components/mentor/RiskPill.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../lib/api.js';

export default function StudentsPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    department: '',
    year: '',
    certification: '',
    risk: '',
    readiness: '',
    dateFrom: '',
    dateTo: '',
    minCerts: '',
    maxCerts: '',
    sort: 'readiness'
  });
  const debouncedSearch = useDebouncedValue(filters.search);
  const params = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const { data, loading } = useAsync(async () => (await api.get('/mentor/students', { params })).data, [params]);
  const students = data?.items || [];

  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const exportStudents = async (format) => {
    const response = await api.get('/mentor/students/export', {
      params: { ...params, format },
      responseType: 'blob'
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quickcheck-filtered-students.${format === 'xlsx' ? 'xls' : 'csv'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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
            <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" placeholder="Search name, email, branch, certification" value={filters.search} onChange={(event) => update('search', event.target.value)} />
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
            <option value="moderate">Moderate</option>
            <option value="needs-focus">Needs focus</option>
          </select>
          <select className="field" value={filters.sort} onChange={(event) => update('sort', event.target.value)}>
            <option value="readiness">Highest readiness</option>
            <option value="trust">Highest trust</option>
            <option value="verified">Most verified</option>
            <option value="recent">Recent uploads</option>
            <option value="fraud">Fraud %</option>
            <option value="name">Sort name</option>
          </select>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900/5 px-4 text-sm font-bold text-slate-500 dark:bg-white/10 dark:text-slate-300">
            <Filter size={16} />
            {students.length} students
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input className="field" placeholder="Branch" value={filters.department} onChange={(event) => update('department', event.target.value)} />
          <input className="field" placeholder="Year" inputMode="numeric" value={filters.year} onChange={(event) => update('year', event.target.value)} />
          <input className="field" placeholder="Certification" value={filters.certification} onChange={(event) => update('certification', event.target.value)} />
          <input className="field" type="date" value={filters.dateFrom} onChange={(event) => update('dateFrom', event.target.value)} />
          <input className="field" type="date" value={filters.dateTo} onChange={(event) => update('dateTo', event.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="Min certs" inputMode="numeric" value={filters.minCerts} onChange={(event) => update('minCerts', event.target.value)} />
            <input className="field" placeholder="Max certs" inputMode="numeric" value={filters.maxCerts} onChange={(event) => update('maxCerts', event.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-cyan-500/12 px-4 py-2 text-sm font-black text-cyan-700 ring-1 ring-cyan-500/20 dark:text-cyan-200" type="button" onClick={() => exportStudents('csv')}>
            <Download size={16} />
            CSV
          </button>
          <button className="focus-ring inline-flex items-center gap-2 rounded-2xl bg-emerald-500/12 px-4 py-2 text-sm font-black text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200" type="button" onClick={() => exportStudents('xlsx')}>
            <Download size={16} />
            XLSX
          </button>
        </div>
      </GlassPanel>

      <div className="grid gap-4">
        {loading && Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36" />)}
        {!loading && students.length === 0 && (
          <GlassPanel className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            No students match the current filters.
          </GlassPanel>
        )}
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
