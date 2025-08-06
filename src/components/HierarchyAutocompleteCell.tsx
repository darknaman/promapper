import React, { memo, useState, useMemo, useCallback } from 'react';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { RowData } from '../types/productTable';
import { ClassificationLevel, FilterState } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';

interface HierarchyAutocompleteCellProps {
  row: RowData;
  column: { key: string; label: string };
  hierarchyHelper: OptimizedHierarchyHelper;
  onRowUpdate: (row: RowData) => void;
  hierarchyOptions: { [level: string]: Array<{ value: string; label: string }> };
}

const HierarchyAutocompleteCell: React.FC<HierarchyAutocompleteCellProps> = memo(({ 
  row, 
  column, 
  hierarchyHelper, 
  onRowUpdate, 
  hierarchyOptions 
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Map column keys to hierarchy levels
  const columnToLevel: Record<string, ClassificationLevel> = useMemo(() => ({
    level1: 'category',
    level2: 'subcategory', 
    level3: 'bigC',
    level4: 'smallC',
    level5: 'segment',
    level6: 'subSegment'
  }), []);

  const level = columnToLevel[column.key];
  
  // Create current selections from row data
  const currentSelections: FilterState = useMemo(() => ({
    category: row.hierarchy?.level1,
    subcategory: row.hierarchy?.level2,
    bigC: row.hierarchy?.level3,
    smallC: row.hierarchy?.level4,
    segment: row.hierarchy?.level5,
    subSegment: row.hierarchy?.level6
  }), [row.hierarchy]);

  // Get filtered options based on current selections using hierarchy helper
  const availableOptions = useMemo(() => {
    try {
      const options = hierarchyHelper.getAvailableOptions(level, currentSelections);
      console.log(`Available options for ${column.key} (${level}):`, options.length, 'options');
      return options;
    } catch (error) {
      console.warn('Error getting available options:', error);
      const fallbackOptions = hierarchyOptions[column.key] || [];
      console.log(`Using fallback options for ${column.key}:`, fallbackOptions.length, 'options');
      return fallbackOptions;
    }
  }, [hierarchyHelper, level, currentSelections, hierarchyOptions, column.key]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return availableOptions;
    return availableOptions.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableOptions, searchQuery]);

  const selectedOption = availableOptions.find(opt => opt.value === (row.hierarchy?.[column.key] || ''));

  const handleSelectionChange = useCallback((value: string) => {
    console.log('Hierarchy selection changed:', { level, value, column: column.key });
    const newSelections = { ...currentSelections, [level]: value };
    
    // Auto-complete other fields using hierarchy helper
    const autoCompletedSelections = hierarchyHelper.autoCompleteSelections(newSelections);
    console.log('Auto-completed selections:', autoCompletedSelections);
    
    // Update the row with auto-completed data
    const updatedRow = {
      ...row,
      hierarchy: {
        ...row.hierarchy,
        level1: autoCompletedSelections.category,
        level2: autoCompletedSelections.subcategory,
        level3: autoCompletedSelections.bigC,
        level4: autoCompletedSelections.smallC,
        level5: autoCompletedSelections.segment,
        level6: autoCompletedSelections.subSegment
      }
    };
    
    console.log('Updated row hierarchy:', updatedRow.hierarchy);
    onRowUpdate(updatedRow);
    setOpen(false);
    setSearchQuery('');
  }, [row, level, currentSelections, hierarchyHelper, onRowUpdate]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearchQuery('');
    }
  }, []);

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-8">
            <Popover open={open} onOpenChange={handleOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-8 text-xs border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <span className="truncate max-w-[100px]">
                    {selectedOption?.label || `Select ${column.label}`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 bg-popover border border-border z-[9999]" side="bottom" align="start" sideOffset={4}>
                <Command>
                  <CommandInput 
                    placeholder={`Search ${column.label.toLowerCase()}...`}
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    className="text-xs"
                  />
                  <CommandList>
                    <CommandEmpty className="text-xs">No options found.</CommandEmpty>
                    <CommandGroup>
                      {filteredOptions.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.value}
                          onSelect={() => handleSelectionChange(option.value)}
                          className="text-xs"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-3 w-3",
                              (row.hierarchy?.[column.key] || '') === option.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </TooltipTrigger>
        {selectedOption?.label && selectedOption.label.length > 15 && (
          <TooltipContent side="top" className="max-w-md break-words z-[9999]">
            <p>{selectedOption.label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});

HierarchyAutocompleteCell.displayName = 'HierarchyAutocompleteCell';

export default HierarchyAutocompleteCell;