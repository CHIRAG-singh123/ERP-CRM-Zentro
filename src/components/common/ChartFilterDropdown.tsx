import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

export interface ChartFilterValues {
  startDate?: string;
  endDate?: string;
  ownerId?: string;
}

interface ChartFilterDropdownProps {
  onFilterChange: (filters: ChartFilterValues) => void;
  activeFilters?: ChartFilterValues;
}

type DatePreset = 'last7' | 'last30' | 'last90' | 'thisMonth' | 'all';

export function ChartFilterDropdown({ 
  onFilterChange, 
  activeFilters = {}
}: ChartFilterDropdownProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);
  const [startDate, setStartDate] = useState(activeFilters.startDate || '');
  const [endDate, setEndDate] = useState(activeFilters.endDate || '');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFilters]);

  const getDateRangeForPreset = (preset: DatePreset): { start: string; end: string } | null => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    let end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (preset) {
      case 'last7':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        break;
      case 'last30':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      case 'last90':
        start = new Date(today);
        start.setDate(start.getDate() - 90);
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
        return null;
      default:
        return null;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const handlePresetClick = (preset: DatePreset) => {
    setActivePreset(preset);
    const range = getDateRangeForPreset(preset);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
      onFilterChange({ startDate: range.start, endDate: range.end });
    } else {
      // "All Time" preset
      setStartDate('');
      setEndDate('');
      onFilterChange({});
    }
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setActivePreset(null);
    onFilterChange({});
  };

  const hasActiveFilters = startDate || endDate || activePreset;

  const presets: { value: DatePreset; label: string }[] = [
    { value: 'last7', label: 'Last 7 days' },
    { value: 'last30', label: 'Last 30 days' },
    { value: 'last90', label: 'Last 90 days' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ];

  return (
    <div className="absolute top-0 right-0 z-10" ref={filterRef}>
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-[#1A1A1C] border border-white/10 text-white/70 hover:border-[#A8DADC] hover:text-white transition-all"
            title="Clear filters"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all ${
            showFilters || hasActiveFilters
              ? 'bg-[#A8DADC] text-[#1A1A1C] font-medium'
              : 'bg-[#1A1A1C] border border-white/10 text-white/70 hover:border-[#A8DADC] hover:text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          {activePreset ? presets.find(p => p.value === activePreset)?.label : 'Filter'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg border border-white/20 bg-[#1F1F21] shadow-2xl p-4 animate-fade-in">
          <div className="space-y-3">
            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-medium text-white/70 mb-2">Quick Presets</label>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetClick(preset.value)}
                    className={`px-2 py-1 text-xs rounded-md transition-all ${
                      activePreset === preset.value
                        ? 'bg-[#A8DADC] text-[#1A1A1C] font-medium'
                        : 'bg-[#1A1A1C] text-white/70 border border-white/10 hover:border-[#A8DADC] hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-white/70">Custom Range</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset(null);
                  onFilterChange({ startDate: e.target.value, endDate });
                }}
                className="w-full rounded-md border border-white/10 bg-[#1A1A1C] px-2 py-1.5 text-xs text-white focus:border-[#A8DADC] focus:outline-none"
                placeholder="Start date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset(null);
                  onFilterChange({ startDate, endDate: e.target.value });
                }}
                className="w-full rounded-md border border-white/10 bg-[#1A1A1C] px-2 py-1.5 text-xs text-white focus:border-[#A8DADC] focus:outline-none"
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

