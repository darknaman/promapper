import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { RotateCcw, Check, ChevronsUpDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { RowData, ProductHierarchyMappingTableProps } from '../types/productTable';
import BatchEditForm from './BatchEditForm';
import { Product } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';

const AutocompleteCell: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ value, options, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-8 text-xs border-input bg-background hover:bg-accent hover:text-accent-foreground"
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 bg-popover border border-border z-50" side="bottom" align="start">
        <Command>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value === value ? '' : option.value);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      value === option.value ? "opacity-100" : "opacity-0"
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
  );
};

const EditableCell: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}> = ({ value, onChange, onBlur }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-xs"
      />
    );
  }

  return (
    <div 
      className="h-8 px-2 flex items-center text-xs cursor-pointer hover:bg-muted/50 rounded"
      onDoubleClick={handleDoubleClick}
      title="Double-click to edit"
    >
      {value || 'Click to edit'}
    </div>
  );
};

const ProductHierarchyMappingTable: React.FC<ProductHierarchyMappingTableProps> = ({
  rows,
  hierarchyOptions,
  onRowsChange,
  onDeleteRow,
  onSelectRows,
  validateProductField
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);

  // Create hierarchy helper for batch edit
  const hierarchyHelper = useMemo(() => {
    // Convert hierarchyOptions to rules format for OptimizedHierarchyHelper
    const rules = [];
    const level1Options = hierarchyOptions.level1 || [];
    const level2Options = hierarchyOptions.level2 || [];
    const level3Options = hierarchyOptions.level3 || [];
    const level4Options = hierarchyOptions.level4 || [];
    const level5Options = hierarchyOptions.level5 || [];
    const level6Options = hierarchyOptions.level6 || [];
    
    // Create sample rules combinations
    for (const cat of level1Options) {
      for (const subcat of level2Options) {
        for (const bigC of level3Options) {
          rules.push({
            category: cat.value,
            subcategory: subcat.value,
            bigC: bigC.value,
            smallC: level4Options[0]?.value || '',
            segment: level5Options[0]?.value || '',
            subSegment: level6Options[0]?.value || ''
          });
        }
      }
    }
    
    return new OptimizedHierarchyHelper(rules);
  }, [hierarchyOptions]);

  const columns = [
    { key: 'checkbox', label: '', width: 50 },
    { key: 'name', label: 'Product Name', width: 200 },
    { key: 'sku', label: 'SKU/ID', width: 120 },
    { key: 'brand', label: 'Brand', width: 150 },
    { key: 'level1', label: 'Category', width: 140 },
    { key: 'level2', label: 'Subcategory', width: 140 },
    { key: 'level3', label: 'Big C', width: 120 },
    { key: 'level4', label: 'Small C', width: 120 },
    { key: 'level5', label: 'Segment', width: 120 },
    { key: 'level6', label: 'Sub-segment', width: 130 },
    { key: 'clear', label: '', width: 60 },
  ];

  const isAllSelected = selectedRows.size === rows.length && rows.length > 0;

  // Filter rows based on show incomplete
  const filteredRows = useMemo(() => {
    if (!showIncomplete) return rows;
    return rows.filter(row => {
      const hierarchy = row.hierarchy || {};
      return !hierarchy.level1 || !hierarchy.level2 || !hierarchy.level3 || 
             !hierarchy.level4 || !hierarchy.level5 || !hierarchy.level6;
    });
  }, [rows, showIncomplete]);

  // Calculate completion statistics
  const completionStats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter(row => {
      const hierarchy = row.hierarchy || {};
      return hierarchy.level1 && hierarchy.level2 && hierarchy.level3 && 
             hierarchy.level4 && hierarchy.level5 && hierarchy.level6;
    }).length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [rows]);

  // Convert rows to products for batch edit
  const selectedProducts = useMemo((): Product[] => {
    return Array.from(selectedRows).map(rowId => {
      const row = rows.find(r => r.id === rowId);
      if (!row) return null;
      
      return {
        id: row.id,
        title: row.name,
        brand: row.brand,
        url: '',
        category: row.hierarchy?.level1,
        subcategory: row.hierarchy?.level2,
        bigC: row.hierarchy?.level3,
        smallC: row.hierarchy?.level4,
        segment: row.hierarchy?.level5,
        subSegment: row.hierarchy?.level6
      };
    }).filter(Boolean) as Product[];
  }, [selectedRows, rows]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(rows.map(row => row.id));
      setSelectedRows(allIds);
      onSelectRows(Array.from(allIds));
    } else {
      setSelectedRows(new Set());
      onSelectRows([]);
    }
  }, [rows, onSelectRows]);

  const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    setSelectedRows(newSelection);
    onSelectRows(Array.from(newSelection));
  }, [selectedRows, onSelectRows]);

  const handleRowUpdate = useCallback((updatedRow: RowData) => {
    const updatedRows = rows.map(row => row.id === updatedRow.id ? updatedRow : row);
    onRowsChange(updatedRows);
  }, [rows, onRowsChange]);

  const handleBatchUpdate = useCallback(async (updates: any) => {
    const updatedRows = rows.map(row => {
      if (selectedRows.has(row.id)) {
        return {
          ...row,
          hierarchy: {
            ...row.hierarchy,
            level1: updates.category || row.hierarchy?.level1,
            level2: updates.subcategory || row.hierarchy?.level2,
            level3: updates.bigC || row.hierarchy?.level3,
            level4: updates.smallC || row.hierarchy?.level4,
            level5: updates.segment || row.hierarchy?.level5,
            level6: updates.subSegment || row.hierarchy?.level6
          }
        };
      }
      return row;
    });
    onRowsChange(updatedRows);
    setSelectedRows(new Set());
    onSelectRows([]);
  }, [rows, selectedRows, onRowsChange, onSelectRows]);

  const clearRowMapping = useCallback((rowId: string) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        return { ...row, hierarchy: {} };
      }
      return row;
    });
    onRowsChange(updatedRows);
  }, [rows, onRowsChange]);

  const updateField = useCallback((rowId: string, field: string, value: any) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const updatedRow = { ...row };
    if (field.startsWith('hierarchy.')) {
      const hierarchyField = field.split('.')[1];
      updatedRow.hierarchy = { ...updatedRow.hierarchy, [hierarchyField]: value };
    } else {
      updatedRow[field as keyof RowData] = value;
    }
    handleRowUpdate(updatedRow);
  }, [rows, handleRowUpdate]);

  return (
    <div className="mapping-table-container">
      {/* Progress Bar and Controls */}
      <div className="mb-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progress:</span>
              <div className="w-32">
                <Progress value={completionStats.percentage} className="h-2" />
              </div>
              <span className="text-sm text-muted-foreground">
                {completionStats.completed} / {completionStats.total} ({completionStats.percentage}%)
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIncomplete(!showIncomplete)}
              className="flex items-center gap-2"
            >
              {showIncomplete ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showIncomplete ? 'Show All' : 'Show Incomplete'}
            </Button>
            
            {selectedRows.size > 0 && (
              <Button
                size="sm"
                onClick={() => setIsBatchEditOpen(true)}
                className="bg-gradient-primary hover:opacity-90"
              >
                Batch Edit ({selectedRows.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-card max-h-[600px]">
        <table className="w-full">
          <thead className="bg-muted/30 sticky top-0 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="text-left p-2 text-sm font-medium border-r border-border"
                  style={{ 
                    width: column.width,
                    minWidth: column.width,
                    position: column.key === 'clear' ? 'sticky' : 'relative',
                    right: column.key === 'clear' ? 0 : 'auto',
                    backgroundColor: column.key === 'clear' ? 'hsl(var(--muted))' : 'inherit',
                    zIndex: column.key === 'clear' ? 11 : 10,
                  }}
                >
                  {column.key === 'checkbox' ? (
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    className="p-2 border-r border-border"
                    style={{ 
                      width: column.width,
                      minWidth: column.width,
                      position: column.key === 'clear' ? 'sticky' : 'relative',
                      right: column.key === 'clear' ? 0 : 'auto',
                      backgroundColor: column.key === 'clear' ? 'hsl(var(--background))' : 'inherit',
                      zIndex: column.key === 'clear' ? 3 : 1,
                    }}
                  >
                    {column.key === 'checkbox' && (
                      <Checkbox
                        checked={selectedRows.has(row.id)}
                        onCheckedChange={(checked) => handleRowSelect(row.id, !!checked)}
                        aria-label={`Select row ${row.id}`}
                      />
                    )}

                    {(column.key === 'name' || column.key === 'sku' || column.key === 'brand') && (
                      <EditableCell
                        value={row[column.key as keyof RowData] as string || ''}
                        onChange={(value) => updateField(row.id, column.key, value)}
                      />
                    )}

                    {(column.key === 'level1' || column.key === 'level2' || column.key === 'level3' || 
                      column.key === 'level4' || column.key === 'level5' || column.key === 'level6') && (
                      <AutocompleteCell
                        value={row.hierarchy?.[column.key] || ''}
                        options={hierarchyOptions[column.key] || []}
                        onChange={(value) => updateField(row.id, `hierarchy.${column.key}`, value)}
                        placeholder={`Select ${column.label}`}
                      />
                    )}

                    {column.key === 'clear' && (
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => clearRowMapping(row.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                          aria-label={`Clear mapping for row ${row.id}`}
                        >
                          <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Batch Edit Dialog */}
      <BatchEditForm
        selectedProducts={selectedProducts}
        hierarchyHelper={hierarchyHelper}
        onBatchUpdate={handleBatchUpdate}
        onClose={() => setIsBatchEditOpen(false)}
        isOpen={isBatchEditOpen}
      />
    </div>
  );
};

export default ProductHierarchyMappingTable;