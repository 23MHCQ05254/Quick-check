export function Button({ children, variant = 'primary', className = '', type = 'button', as: Component = 'button', ...props }) {
  const styles = {
    primary:
      'bg-ink text-white shadow-glow hover:-translate-y-0.5 hover:bg-slate-900 dark:bg-white dark:text-ink dark:hover:bg-slate-100',
    secondary:
      'border border-slate-300/50 bg-white/70 text-slate-800 hover:-translate-y-0.5 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]',
    ghost: 'text-slate-600 hover:bg-slate-900/5 dark:text-slate-300 dark:hover:bg-white/10',
    danger: 'bg-cyber-rose text-white hover:-translate-y-0.5'
  };

  const componentProps = Component === 'button' ? { type } : {};

  return (
    <Component
      {...componentProps}
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
