'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Combobox({ options, value, onChange, placeholder = 'Выберите...', className }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)} onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full bg-mnr-bg border border-mnr-border px-4 py-3 text-mnr-text font-mono text-base text-left flex items-center justify-between focus:outline-none focus:border-mnr-accent"
      >
        <span className={cn(!selectedOption && 'text-mnr-muted')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-mnr-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-mnr-surface border border-mnr-border max-h-60 overflow-y-auto shadow-lg nodrag">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-3 text-left flex items-center justify-between hover:bg-mnr-accent/10 transition-colors',
                option.value === value && 'bg-mnr-accent/10'
              )}
            >
              <span className="text-mnr-text font-mono">{option.label}</span>
              {option.value === value && <Check className="w-4 h-4 text-mnr-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
