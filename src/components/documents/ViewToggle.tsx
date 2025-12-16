import { Grid3x3, List } from 'lucide-react';
import { useState, useEffect } from 'react';

type ViewMode = 'grid' | 'list';

const STORAGE_KEY = 'documents-view-mode';

interface ViewToggleProps {
  onViewChange?: (view: ViewMode) => void;
}

export function ViewToggle({ onViewChange }: ViewToggleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'grid' || stored === 'list' ? stored : 'grid') as ViewMode;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
    onViewChange?.(viewMode);
  }, [viewMode, onViewChange]);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 p-1">
      <button
        onClick={() => setViewMode('grid')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
          viewMode === 'grid'
            ? 'bg-[#B39CD0] text-[#1A1A1C] shadow-lg'
            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
        }`}
        aria-label="Grid view"
      >
        <Grid3x3 className="h-4 w-4" />
        <span className="hidden sm:inline">Grid</span>
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ${
          viewMode === 'list'
            ? 'bg-[#B39CD0] text-[#1A1A1C] shadow-lg'
            : 'text-white/60 hover:bg-white/5 hover:text-white/80'
        }`}
        aria-label="List view"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </button>
    </div>
  );
}

