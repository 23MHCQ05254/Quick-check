import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('quickcheck.theme') !== 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('quickcheck.theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setDark((value) => !value)}
      className="focus-ring grid h-11 w-11 place-items-center rounded-2xl border border-slate-300/40 bg-white/70 text-slate-700 transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

