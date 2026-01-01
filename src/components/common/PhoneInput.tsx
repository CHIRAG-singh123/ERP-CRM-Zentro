import { useState, useRef, useEffect } from 'react';
import { COUNTRY_CODES } from '../../data/countryCodes';

interface PhoneInputProps {
  value: {
    countryCode: string;
    number: string;
  };
  onChange: (phone: { countryCode: string; number: string }) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function PhoneInput({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  error,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRY_CODES.find((cc) => cc.code === value.countryCode) || COUNTRY_CODES[0];

  const filteredCountries = COUNTRY_CODES.filter(
    (cc) =>
      cc.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.includes(searchTerm)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCountrySelect = (countryCode: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange({
      countryCode,
      number: value.number,
    });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/[^\d\s-()]/g, '');
    onChange({
      countryCode: value.countryCode,
      number,
    });
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        {/* Country Code Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                setIsOpen(!isOpen);
              }
            }}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
            } ${error ? 'border-red-500/50' : ''}`}
          >
            <span className="text-sm">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.code}</span>
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {isOpen && !disabled && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 rounded-lg border border-white/10 bg-[#1A1A1C] shadow-xl max-h-64 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b border-white/10">
                  <input
                    type="text"
                    placeholder="Search country..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#B39CD0] focus:outline-none"
                    autoFocus
                  />
                </div>
                {/* List */}
                <div className="overflow-y-auto max-h-48">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={(e) => handleCountrySelect(country.code, e)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                        country.code === value.countryCode ? 'bg-[#B39CD0]/20' : ''
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <div className="flex-1">
                        <div className="text-sm text-white">{country.country}</div>
                        <div className="text-xs text-white/60">{country.code}</div>
                      </div>
                      {country.code === value.countryCode && (
                        <svg className="h-4 w-4 text-[#B39CD0]" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={value.number}
          onChange={handleNumberChange}
          required={required}
          disabled={disabled}
          placeholder="Enter phone number"
          className={`flex-1 rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white placeholder-white/40 outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${error ? 'border-red-500/50' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
