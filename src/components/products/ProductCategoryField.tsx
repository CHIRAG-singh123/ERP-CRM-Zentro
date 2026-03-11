import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_PRODUCT_CATEGORIES,
  getCustomCategories,
  addCustomCategory,
  removeCustomCategory,
} from '../../constants/productCategories';

interface ProductCategoryFieldProps {
  value: string;
  onChange: (category: string) => void;
  disabled?: boolean;
  className?: string;
  selectClassName?: string;
}

export function ProductCategoryField({
  value,
  onChange,
  disabled = false,
  className = '',
  selectClassName = '',
}: ProductCategoryFieldProps) {
  const [customCategories, setCustomCategories] = useState<string[]>(() => getCustomCategories());
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setCustomCategories(getCustomCategories());
  }, []);

  const isCustomCategory = value && customCategories.includes(value);

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setShowAddInput(false);
      setNewCategoryName('');
      return;
    }
    const updated = addCustomCategory(trimmed);
    setCustomCategories(updated);
    onChange(trimmed);
    setNewCategoryName('');
    setShowAddInput(false);
  };

  const handleDeleteCategory = () => {
    if (!value || !isCustomCategory) return;
    const updated = removeCustomCategory(value);
    setCustomCategories(updated);
    onChange('');
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-white/70 mb-1">Category</label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={
            selectClassName ||
            'flex-1 min-w-[180px] rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none focus:ring-2 focus:ring-[#B39CD0]/20'
          }
        >
          <option value="" className="bg-[#1A1A1C] text-white">
            Select category
          </option>
          {DEFAULT_PRODUCT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-[#1A1A1C] text-white">
              {cat}
            </option>
          ))}
          {customCategories.length > 0 && (
            <>
              <option disabled className="bg-[#1A1A1C] text-white/50">
                — Custom —
              </option>
              {customCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#1A1A1C] text-white">
                  {cat}
                </option>
              ))}
            </>
          )}
        </select>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddInput((v) => !v)}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-2 py-1.5 text-xs font-medium text-white/80 transition hover:border-[#B39CD0]/50 hover:text-white hover:bg-white/5"
            title="Add category"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={handleDeleteCategory}
            disabled={disabled || !isCustomCategory}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-2 py-1.5 text-xs font-medium text-white/80 transition hover:border-red-400/50 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 disabled:pointer-events-none"
            title="Delete category"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
      {showAddInput && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCategory();
              if (e.key === 'Escape') {
                setShowAddInput(false);
                setNewCategoryName('');
              }
            }}
            placeholder="New category name"
            className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-1.5 text-sm text-white placeholder:text-white/40 focus:border-[#B39CD0] focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddCategory}
            className="rounded-lg bg-[#B39CD0] px-3 py-1.5 text-xs font-medium text-[#1A1A1C] hover:bg-[#C3ADD9]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddInput(false);
              setNewCategoryName('');
            }}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/20"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
