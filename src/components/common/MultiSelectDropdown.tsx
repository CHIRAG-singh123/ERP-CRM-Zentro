import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search, Check } from 'lucide-react';

export interface MultiSelectOption {
  _id: string;
  name: string;
  email: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
}

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select options',
  label,
  error,
  disabled = false,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(
    (option) =>
      option.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Normalize value array to strings for consistent comparison
  const normalizedValue = value.map(id => String(id));

  // Get selected options - normalize IDs for comparison
  const selectedOptions = options.filter((option) => normalizedValue.includes(String(option._id)));

  // Calculate dropdown position
  const updatePosition = () => {
    if (inputRef.current && containerRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap (mt-2)
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // Update position when dropdown opens or window resizes
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking inside dropdown or container
      if (
        containerRef.current &&
        containerRef.current.contains(event.target as Node)
      ) {
        return;
      }
      if (
        dropdownRef.current &&
        dropdownRef.current.contains(event.target as Node)
      ) {
        return;
      }
      // Close dropdown if clicking outside
      setIsOpen(false);
      setSearchQuery('');
    };

    if (isOpen) {
      // Use a small delay to allow click events to propagate first
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Handle option toggle
  const toggleOption = (optionId: string) => {
    if (disabled) return;

    // Normalize IDs to strings for consistent comparison
    const normalizedOptionId = String(optionId);
    const normalizedCurrentValue = value.map(id => String(id));
    
    const newValue = normalizedCurrentValue.includes(normalizedOptionId)
      ? value.filter((id) => String(id) !== normalizedOptionId)
      : [...value, normalizedOptionId];
    onChange(newValue);
  };

  // Handle remove chip
  const removeOption = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    // Normalize IDs to strings for consistent comparison
    const normalizedOptionId = String(optionId);
    onChange(value.filter((id) => String(id) !== normalizedOptionId));
  };

  // Handle input click to toggle dropdown
  const handleInputClick = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Track hover state with ref to avoid stale closures
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoveringRef = useRef(false);

  // Handle hover to open dropdown
  const handleMouseEnter = () => {
    if (disabled) return;
    isHoveringRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    }
  };

  // Handle mouse leave with delay to allow moving to dropdown
  const handleContainerMouseLeave = () => {
    isHoveringRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Only close on mouse leave if not hovering over dropdown
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }, 300);
  };

  const handleDropdownMouseEnter = () => {
    isHoveringRef.current = true;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handleDropdownMouseLeave = () => {
    isHoveringRef.current = false;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Only close if mouse has left both container and dropdown
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }, 300);
  };

  const dropdownContent = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] rounded-lg border border-white/10 bg-[#1A1A1C] shadow-2xl max-h-64 overflow-hidden flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
      onMouseEnter={handleDropdownMouseEnter}
      onMouseLeave={handleDropdownMouseLeave}
    >
      {/* Search Input in Dropdown */}
      <div className="p-2 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-md border border-white/10 bg-[#1A1A1C]/70 pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-[#A8DADC] focus:ring-1 focus:ring-[#A8DADC]/20"
            autoFocus
          />
        </div>
      </div>

      {/* Options List */}
      <div className="overflow-y-auto max-h-48">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-white/50">
            No users found
          </div>
        ) : (
          <div className="py-1">
            {filteredOptions.map((option) => {
              // Normalize IDs to strings for consistent comparison
              const normalizedOptionId = String(option._id);
              const isSelected = normalizedValue.includes(normalizedOptionId);
              return (
                <button
                  key={option._id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(option._id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      isSelected
                        ? 'border-[#A8DADC] bg-[#A8DADC]'
                        : 'border-white/20 bg-transparent'
                    } transition-colors`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-[#1A1A1C]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {option.name}
                    </div>
                    <div className="text-xs text-white/50 truncate">{option.email}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="relative"
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        {label && (
          <label className="block text-sm font-medium text-white/70 mb-1">{label}</label>
        )}

        {/* Selected Chips */}
        {selectedOptions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <div
                key={option._id}
                className="flex items-center gap-1 rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs text-white"
              >
                <span className="max-w-[150px] truncate">{option.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(option._id, e)}
                    className="text-white/60 hover:text-white transition-colors"
                    aria-label={`Remove ${option.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={handleInputClick}
            onFocus={() => !disabled && setIsOpen(true)}
            placeholder={selectedOptions.length === 0 ? placeholder : ''}
            disabled={disabled}
            readOnly={!isOpen}
            className={`w-full rounded-lg border ${
              error ? 'border-red-500' : 'border-white/10'
            } bg-[#1A1A1C]/70 px-3 py-2 pr-10 text-white outline-none transition-all duration-200 ${
              disabled
                ? 'cursor-not-allowed opacity-50'
                : 'cursor-pointer focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20'
            }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown
              className={`h-4 w-4 text-white/50 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      {/* Render dropdown in portal */}
      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
}

