import React, { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useDebounce } from '../../hooks/usePerformanceOptimizations';

interface Option {
  value: string;
  label: string;
}

interface OptimizedDropdownCellProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number;
  className?: string;
  searchable?: boolean;
  clearable?: boolean;
  maxDisplayLength?: number;
}

const OptimizedDropdownCell: React.FC<OptimizedDropdownCellProps> = memo(({
  value,
  options,
  onChange,
  placeholder = 'Select option...',
  width,
  className,
  searchable = true,
  clearable = true,
  maxDisplayLength = 20
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Debounce search query for better performance
  const debouncedSearchQuery = useMemo(() => searchQuery, [searchQuery]);

  // Memoized filtered options for performance
  const filteredOptions = useMemo(() => {
    if (!searchQuery || !searchable) return options;
    
    const query = searchQuery.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery, searchable]);

  // Memoized selected option
  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value),
    [options, value]
  );

  // Clear search when closing
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleSelect = useCallback((selectedValue: string) => {
    const newValue = selectedValue === value ? '' : selectedValue;
    onChange(newValue);
    setOpen(false);
  }, [value, onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  }, [onChange]);

  const cellStyle = width ? { 
    width: `${width}px`, 
    minWidth: `${width}px`, 
    maxWidth: `${width}px` 
  } : {};

  const displayText = selectedOption?.label || placeholder;
  const truncatedText = displayText.length > maxDisplayLength 
    ? `${displayText.substring(0, maxDisplayLength)}...` 
    : displayText;

  return (
    <div className={cn("relative", className)} style={cellStyle}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-8 justify-between text-xs font-normal",
              "border-input bg-background hover:bg-accent hover:text-accent-foreground",
              "focus:ring-1 focus:ring-primary"
            )}
            style={cellStyle}
          >
            <span className="truncate text-left flex-1">
              {truncatedText}
            </span>
            <div className="flex items-center gap-1 ml-1">
              {clearable && value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-3 w-3 opacity-50 hover:opacity-100 transition-opacity"
                  aria-label="Clear selection"
                >
                  ×
                </button>
              )}
              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[300px] p-0 bg-popover border border-border shadow-lg z-50" 
          side="bottom" 
          align="start"
          style={{ minWidth: width ? `${Math.max(width, 200)}px` : '200px' }}
        >
          <Command shouldFilter={false}>
            {searchable && (
              <CommandInput 
                placeholder={`Search ${placeholder.toLowerCase()}...`}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="border-none focus:ring-0"
              />
            )}
            <CommandList className="max-h-[200px] overflow-auto">
              <CommandEmpty>
                No options found.
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="text-xs cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

OptimizedDropdownCell.displayName = 'OptimizedDropdownCell';

export default OptimizedDropdownCell;