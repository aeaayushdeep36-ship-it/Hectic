export default function WorkspaceLoading() {
  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--ink-primary)]" role="status" aria-live="polite">
      <div className="hidden md:block w-[200px] shrink-0 border-r border-[var(--border-hair)] p-5 space-y-4">
        <div className="h-6 w-20 bg-[var(--bg-elevated)] animate-pulse" />
        <div className="h-8 w-full bg-[var(--bg-surface)] border border-[var(--border-hair)] animate-pulse" />
        <div className="space-y-2 pt-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-full bg-[var(--bg-surface)] animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-[1px] w-full bg-[var(--accent-graphic)]/60 animate-pulse" />
        <div className="px-8 py-6 border-b border-[var(--border-hair)] flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-[var(--bg-elevated)] animate-pulse" />
            <div className="h-3 w-40 bg-[var(--bg-surface)] animate-pulse" />
          </div>
          <div className="h-8 w-32 bg-[var(--bg-elevated)] animate-pulse" />
        </div>
        <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 h-64 bg-[var(--bg-surface)] border border-[var(--border-hair)] animate-pulse" />
          <div className="xl:col-span-4 h-64 bg-[var(--bg-surface)] border border-[var(--border-hair)] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
