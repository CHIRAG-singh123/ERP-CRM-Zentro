import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface OwnerFilterDropdownProps {
  selectedOwners: string[];
  onOwnerChange: (owners: string[]) => void;
}

const OWNER_OPTIONS = ['Chirag Sing', 'John Doe', 'Sarah Smith', 'Mike Johnson', 'Emily Brown'];

export function OwnerFilterDropdown({ selectedOwners, onOwnerChange }: OwnerFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    // Anchor to button bottom-left in viewport coordinates (fixed), and clamp
    // horizontally so it stays within the viewport.
    const menuWidth = 224; // w-56 (56 * 4px)
    const viewportPadding = 12;
    const maxLeft = Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding);
    const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft);

    setDropdownPos({
      top: rect.bottom + 8,
      left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const btn = buttonRef.current;
      const menu = menuRef.current;

      // Close if clicking outside both the button and the menu.
      if (btn && btn.contains(target)) return;
      if (menu && menu.contains(target)) return;
      setIsOpen(false);
    };

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    // Capture phase scroll catches scrolling inside containers too.
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('pointerdown', onPointerDown, true);

    let ro: ResizeObserver | null = null;
    if (buttonRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => updatePosition());
      ro.observe(buttonRef.current);
    }

    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerdown', onPointerDown, true);
      ro?.disconnect();
    };
  }, [isOpen]);

  const handleOwnerChange = (owner: string) => {
    const updated = selectedOwners.includes(owner)
      ? selectedOwners.filter((o) => o !== owner)
      : [...selectedOwners, owner];
    onOwnerChange(updated);
  };

  const displayText = useMemo(() => {
    if (selectedOwners.length === 0) return 'All Owners';
    if (selectedOwners.length === 1) return selectedOwners[0];
    return `${selectedOwners.length} Owners`;
  }, [selectedOwners]);

  return (
    <div>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1C] px-4 py-2.5 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white"
      >
        {displayText}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-56 rounded-lg border border-white/10 bg-[#1A1A1C] shadow-xl animate-fade-in"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
            }}
          >
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-1 p-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-white/5">
                  <input
                    type="checkbox"
                    checked={selectedOwners.length === 0}
                    onChange={() => onOwnerChange([])}
                    className="h-4 w-4 cursor-pointer rounded border border-white/20 bg-white/5 accent-[#A8DADC]"
                  />
                  <span className="text-sm text-white/70">All Owners</span>
                </label>

                <div className="my-2 border-t border-white/10" />

                {OWNER_OPTIONS.map((owner) => (
                  <label
                    key={owner}
                    className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors duration-200 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOwners.includes(owner)}
                      onChange={() => handleOwnerChange(owner)}
                      className="h-4 w-4 cursor-pointer rounded border border-white/20 bg-white/5 accent-[#A8DADC]"
                    />
                    <span className="text-sm text-white/70">{owner}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
