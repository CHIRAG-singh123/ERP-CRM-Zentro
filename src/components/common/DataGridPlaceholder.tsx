interface DataGridPlaceholderProps {
  columns: string[];
  rows?: number;
}

export function DataGridPlaceholder({ columns, rows = 5 }: DataGridPlaceholderProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 animate-fade-in">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] bg-white/5 px-6 py-3 text-left text-xs uppercase tracking-[0.3em] text-white/40">
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      <div className="divide-y divide-white/5 bg-[#1A1A1C]/70">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="stagger-item grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] items-center px-6 py-4 text-sm text-white/70"
            style={{ animationDelay: `${rowIndex * 50}ms` }}
          >
            {columns.map((column) => (
              <span key={column} className="truncate text-white/30">
                <span className="skeleton-loading inline-block h-4 w-24 rounded"></span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 px-6 pb-4 text-sm text-white/50">
        <div className="loading-spinner h-4 w-4"></div>
        <span className="loading-pulse">Loading...</span>
      </div>
    </div>
  );
}

