import { AnimatePresence, motion } from 'framer-motion';
import { Archive, BadgeCheck, Building2, Edit3, Plus, RotateCcw, Save, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/common/Button.jsx';
import { GlassPanel } from '../components/common/GlassPanel.jsx';
import { Skeleton } from '../components/common/Skeleton.jsx';
import { StatusBadge } from '../components/common/StatusBadge.jsx';
import { CertificationDetailsModal } from '../components/catalog/CertificationDetailsModal.jsx';
import { CATEGORY_LABELS, DIFFICULTY_LABELS, pretty, VERIFICATION_LABELS } from '../lib/catalogMeta.js';
import { api } from '../lib/api.js';
import { useCatalog } from '../hooks/useCatalog.js';

const categories = Object.keys(CATEGORY_LABELS);
const difficulties = Object.keys(DIFFICULTY_LABELS);
const verificationTypes = Object.keys(VERIFICATION_LABELS);

const emptyOrg = { name: '', description: '', category: 'OTHER', website: '', brandColor: '#38D5FF' };
const emptyCert = {
  organizationId: '',
  certificateName: '',
  description: '',
  difficultyLevel: 'INTERMEDIATE',
  category: 'OTHER',
  verificationType: 'HYBRID_AI',
  templateStatus: 'NOT_TRAINED',
  skills: ''
};

export default function MentorCatalogManager() {
  const catalog = useCatalog();
  const [organizations, setOrganizations] = useState([]);
  const [orgForm, setOrgForm] = useState(emptyOrg);
  const [certForm, setCertForm] = useState(emptyCert);
  const [editingOrg, setEditingOrg] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(null);

  const loadOrganizations = async () => {
    const { data } = await api.get('/catalog/organizations', { params: { includeStats: true } });
    setOrganizations(data.items || []);
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const organizationOptions = useMemo(() => organizations.filter((org) => org.active !== false), [organizations]);

  const submitOrganization = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (editingOrg) {
        await api.patch(`/catalog/mentor/organizations/${editingOrg._id || editingOrg.id}`, orgForm);
        setMessage('Organization updated.');
      } else {
        await api.post('/catalog/mentor/organizations', orgForm);
        setMessage('Organization created.');
      }
      setOrgForm(emptyOrg);
      setEditingOrg(null);
      await loadOrganizations();
      await catalog.reload();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Organization save failed');
    } finally {
      setSaving(false);
    }
  };

  const submitCertification = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const payload = {
      ...certForm,
      skills: certForm.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean)
    };

    try {
      if (editingCert) {
        await api.patch(`/catalog/mentor/certifications/${editingCert._id || editingCert.id}`, payload);
        setMessage('Certification updated.');
      } else {
        await api.post('/catalog/mentor/certifications', payload);
        setMessage('Certification created.');
      }
      setCertForm(emptyCert);
      setEditingCert(null);
      await loadOrganizations();
      await catalog.reload();
    } catch (err) {
      setMessage(err.response?.data?.message || err.message || 'Certification save failed');
    } finally {
      setSaving(false);
    }
  };

  const editCertification = (certification) => {
    setEditingCert(certification);
    setCertForm({
      organizationId: certification.organization?._id || certification.organization?.id || certification.organization,
      certificateName: certification.name || certification.certificateName,
      description: certification.description || '',
      difficultyLevel: certification.difficultyLevel || 'INTERMEDIATE',
      category: certification.category || 'OTHER',
      verificationType: certification.verificationType || 'HYBRID_AI',
      templateStatus: certification.templateStatus || 'NOT_TRAINED',
      skills: (certification.skills || []).join(', ')
    });
  };

  const editOrganization = (organization) => {
    setEditingOrg(organization);
    setOrgForm({
      name: organization.name || '',
      description: organization.description || '',
      category: organization.category || 'OTHER',
      website: organization.website || '',
      brandColor: organization.brandColor || '#38D5FF'
    });
  };

  const deleteCertification = async (certification) => {
    await api.delete(`/catalog/mentor/certifications/${certification._id || certification.id}`);
    setMessage('Certification archived.');
    await catalog.reload();
    await loadOrganizations();
  };

  const deleteOrganization = async (organization) => {
    await api.delete(`/catalog/mentor/organizations/${organization._id || organization.id}`);
    setMessage('Organization archived with its certifications.');
    await catalog.reload();
    await loadOrganizations();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-cyber-green">Mentor catalog management</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">Certification intelligence registry</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            Manage the certification catalog that students must select from before certificates are analyzed against template profiles.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:w-[420px]">
          {[
            ['Organizations', organizations.length],
            ['Certifications', catalog.pagination.total],
            ['Templates', organizations.reduce((sum, org) => sum + (org.trainedTemplates || 0), 0)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-900/10 bg-white/60 p-3 text-center dark:border-white/10 dark:bg-white/[0.05]">
              <p className="text-lg font-black text-slate-950 dark:text-white">{value}</p>
              <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {message && <GlassPanel className="p-4 text-sm font-semibold text-cyan-700 dark:text-cyan-300">{message}</GlassPanel>}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <GlassPanel className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500/10 text-cyber-cyan">
                  <Building2 size={19} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-white">{editingOrg ? 'Edit organization' : 'Create organization'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Issuer metadata and catalog grouping.</p>
                </div>
              </div>
              {editingOrg && (
                <button className="focus-ring rounded-xl p-2 text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10" onClick={() => { setEditingOrg(null); setOrgForm(emptyOrg); }} aria-label="Cancel organization edit">
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            <form className="mt-5 space-y-3" onSubmit={submitOrganization}>
              <input className="field" placeholder="Organization name" value={orgForm.name} onChange={(event) => setOrgForm({ ...orgForm, name: event.target.value })} required />
              <textarea className="field min-h-24 resize-none" placeholder="Description" value={orgForm.description} onChange={(event) => setOrgForm({ ...orgForm, description: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field" value={orgForm.category} onChange={(event) => setOrgForm({ ...orgForm, category: event.target.value })}>
                  {categories.map((category) => (
                    <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
                <input className="field" type="color" title="Brand color" value={orgForm.brandColor} onChange={(event) => setOrgForm({ ...orgForm, brandColor: event.target.value })} />
              </div>
              <input className="field" placeholder="Website" value={orgForm.website} onChange={(event) => setOrgForm({ ...orgForm, website: event.target.value })} />
              <Button className="w-full" type="submit" disabled={saving}>
                <Save size={16} />
                {editingOrg ? 'Save organization' : 'Create organization'}
              </Button>
            </form>
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-cyber-green">
                <BadgeCheck size={19} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950 dark:text-white">{editingCert ? 'Edit certification' : 'Create certification'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Student-selectable certificate type.</p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={submitCertification}>
              <select className="field" value={certForm.organizationId} onChange={(event) => setCertForm({ ...certForm, organizationId: event.target.value })} required>
                <option value="">Select organization</option>
                {organizationOptions.map((organization) => (
                  <option key={organization._id || organization.id} value={organization._id || organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <input className="field" placeholder="Certificate name" value={certForm.certificateName} onChange={(event) => setCertForm({ ...certForm, certificateName: event.target.value })} required />
              <textarea className="field min-h-24 resize-none" placeholder="Description" value={certForm.description} onChange={(event) => setCertForm({ ...certForm, description: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="field" value={certForm.category} onChange={(event) => setCertForm({ ...certForm, category: event.target.value })}>
                  {categories.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}
                </select>
                <select className="field" value={certForm.difficultyLevel} onChange={(event) => setCertForm({ ...certForm, difficultyLevel: event.target.value })}>
                  {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{DIFFICULTY_LABELS[difficulty]}</option>)}
                </select>
              </div>
              <select className="field" value={certForm.verificationType} onChange={(event) => setCertForm({ ...certForm, verificationType: event.target.value })}>
                {verificationTypes.map((type) => <option key={type} value={type}>{VERIFICATION_LABELS[type]}</option>)}
              </select>
              <input className="field" placeholder="Skills, comma separated" value={certForm.skills} onChange={(event) => setCertForm({ ...certForm, skills: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="w-full" type="submit" disabled={saving}>
                  <Save size={16} />
                  {editingCert ? 'Save certification' : 'Create certification'}
                </Button>
                {editingCert && (
                  <Button variant="secondary" className="w-full" onClick={() => { setEditingCert(null); setCertForm(emptyCert); }}>
                    Cancel edit
                  </Button>
                )}
              </div>
            </form>
          </GlassPanel>
        </div>

        <div className="space-y-6">
          <GlassPanel className="p-4">
            <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/70 px-4 dark:border-white/10 dark:bg-white/[0.06]">
              <Search size={17} className="text-cyber-cyan" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                placeholder="Search managed certifications..."
                value={catalog.search}
                onChange={(event) => catalog.setSearch(event.target.value)}
              />
            </div>
          </GlassPanel>

          <div className="grid gap-3 md:grid-cols-2">
            {organizations.map((organization) => (
              <motion.div key={organization._id || organization.id} whileHover={{ y: -2 }} className="rounded-2xl border border-slate-900/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl text-white" style={{ background: organization.brandColor || '#38D5FF' }}>
                      <Building2 size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-950 dark:text-white">{organization.name}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{organization.certificationCount || 0} certifications · {organization.trainedTemplates || 0} templates</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="focus-ring rounded-xl p-2 text-slate-500 hover:bg-slate-900/5 dark:hover:bg-white/10" onClick={() => editOrganization(organization)} aria-label="Edit organization">
                      <Edit3 size={15} />
                    </button>
                    <button className="focus-ring rounded-xl p-2 text-rose-500 hover:bg-rose-500/10" onClick={() => deleteOrganization(organization)} aria-label="Archive organization">
                      <Archive size={15} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4">
            {catalog.loading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-44" />)}
            <AnimatePresence>
              {!catalog.loading &&
                catalog.items.map((certification) => (
                  <motion.div
                    key={certification._id || certification.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border border-slate-900/10 bg-white/68 p-5 shadow-panel dark:border-white/10 dark:bg-white/[0.055]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-950 dark:text-white">{certification.name}</p>
                          <StatusBadge status={certification.templateStatus} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {certification.organization?.name} · {pretty(certification.category, CATEGORY_LABELS)} · {pretty(certification.difficultyLevel, DIFFICULTY_LABELS)}
                        </p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{certification.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setDetails(certification)}>
                          <ShieldCheck size={16} />
                          Inspect
                        </Button>
                        <Button variant="secondary" onClick={() => editCertification(certification)}>
                          <Edit3 size={16} />
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => deleteCertification(certification)}>
                          <Trash2 size={16} />
                          Archive
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <CertificationDetailsModal certification={details} onClose={() => setDetails(null)} onSelect={() => {}} selected={false} showUploadActions={false} />
    </div>
  );
}
