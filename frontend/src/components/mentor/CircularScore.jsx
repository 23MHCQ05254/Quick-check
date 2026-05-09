import { motion } from 'framer-motion';

export function CircularScore({ value = 0, label, tone = 'cyan', size = 132 }) {
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const colors = {
    cyan: '#38D5FF',
    green: '#37E6A0',
    amber: '#F6C667',
    rose: '#FF6B8A'
  };

  return (
    <div className="grid place-items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={colors[tone]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-black text-slate-950 dark:text-white">{value}%</p>
            <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

