export default function RunLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]" role="status" aria-live="polite">
      <div className="h-[1px] w-full bg-[var(--accent-graphic)]/60 animate-pulse" />
      <div className="h-14 border-b border-[var(--border-hair)] px-6 flex items-center justify-between">
        <div className="h-3 w-48 bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-3 w-64 bg-[var(--bg-elevated)] animate-pulse hidden md:block" />
        <div className="h-7 w-24 bg-[var(--bg-elevated)] animate-pulse" />
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-7 p-10 flex justify-center">
          <div className="w-full max-w-[680px] h-[520px] bg-[var(--bg-surface)] border border-[var(--border-hair)] animate-pulse" />
        </div>
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border-l border-[var(--border-hair)] p-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-[var(--bg-canvas)] border border-[var(--border-hair)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
