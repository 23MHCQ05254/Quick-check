import { motion } from 'framer-motion';
import { Building2, CheckCircle2 } from 'lucide-react';

export function OrganizationExplorer({ organizations = [], activeOrganization, onSelect }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">Organization explorer</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Browse issuer ecosystems and trained template coverage.</p>
        </div>
        {activeOrganization && (
          <button className="text-sm font-bold text-cyber-cyan" onClick={() => onSelect('')}>
            Clear
          </button>
        )}
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
        {organizations.map((organization, index) => {
          const value = organization._id || organization.id || organization.slug;
          const active = activeOrganization === value || activeOrganization === organization.slug;
          return (
            <motion.button
              key={value}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
              whileHover={{ y: -3 }}
              onClick={() => onSelect(value)}
              className={`focus-ring min-w-[230px] rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-cyber-cyan/60 bg-cyan-500/10 shadow-glow'
                  : 'border-slate-900/10 bg-white/60 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: organization.brandColor || '#38D5FF' }}>
                  <Building2 size={19} />
                </div>
                {active && <CheckCircle2 className="text-cyber-green" size={18} />}
              </div>
              <p className="mt-4 font-black text-slate-950 dark:text-white">{organization.name}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{organization.description || 'Enterprise certification issuer'}</p>
              <div className="mt-4 flex items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{organization.certificationCount || 0} certs</span>
                <span>{organization.trainedTemplates || 0} templates</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

