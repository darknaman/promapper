import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { RowData, ProductHierarchyMappingTableProps, BatchEditToolbarProps } from '../types/productTable';

const BatchEditToolbar: React.FC<BatchEditToolbarProps> = ({
  selectedRowCount,
  hierarchyOptions,
  onSetHierarchy,
  onClearMapping,
  onClose
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedValue, setSelectedValue] = useState<string>('');

  const handleSetHierarchy = () => {
    if (selectedLevel && selectedValue) {
      onSetHierarchy(selectedLevel, selectedValue);
      setSelectedLevel('');
      setSelectedValue('');
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg mb-4">
      <span className="text-sm font-medium">{selectedRowCount} rows selected</span>
      
      <select 
        value={selectedLevel} 
        onChange={(e) => setSelectedLevel(e.target.value)}
        className="px-3 py-1 border rounded text-sm"
      >
        <option value="">Select Level</option>
        <option value="level1">Category</option>
        <option value="level2">Subcategory</option>
        <option value="level3">Big C</option>
      </select>

      <select 
        value={selectedValue} 
        onChange={(e) => setSelectedValue(e.target.value)}
        className="px-3 py-1 border rounded text-sm"
        disabled={!selectedLevel}
      >
        <option value="">Select Value</option>
        {selectedLevel && hierarchyOptions[selectedLevel]?.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <Button size="sm" onClick={handleSetHierarchy} disabled={!selectedLevel || !selectedValue}>
        Set Hierarchy
      </Button>
      
      <Button size="sm" variant="outline" onClick={onClearMapping}>
        Clear Mapping
      </Button>
      
      <Button size="sm" variant="ghost" onClick={onClose}>
        Close
      </Button>
    </div>
  );
};

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

  const columns = [
    { key: 'checkbox', label: '', width: 50 },
    { key: 'name', label: 'Product Name', width: 200 },
    { key: 'sku', label: 'SKU/ID', width: 120 },
    { key: 'brand', label: 'Brand', width: 150 },
    { key: 'level1', label: 'Category', width: 180 },
    { key: 'level2', label: 'Subcategory', width: 180 },
    { key: 'level3', label: 'Big C', width: 180 },
    { key: 'delete', label: '', width: 60 },
  ];

  const isAllSelected = selectedRows.size === rows.length && rows.length > 0;

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

  const handleBatchSetHierarchy = useCallback((level: string, value: string) => {
    const updatedRows = rows.map(row => {
      if (selectedRows.has(row.id)) {
        return {
          ...row,
          hierarchy: { ...row.hierarchy, [level]: value }
        };
      }
      return row;
    });
    onRowsChange(updatedRows);
  }, [rows, selectedRows, onRowsChange]);

  const handleBatchClearMapping = useCallback(() => {
    const updatedRows = rows.map(row => {
      if (selectedRows.has(row.id)) {
        return { ...row, hierarchy: {} };
      }
      return row;
    });
    onRowsChange(updatedRows);
  }, [rows, selectedRows, onRowsChange]);

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
      {selectedRows.size > 0 && (
        <BatchEditToolbar
          selectedRowCount={selectedRows.size}
          hierarchyOptions={hierarchyOptions}
          onSetHierarchy={handleBatchSetHierarchy}
          onClearMapping={handleBatchClearMapping}
          onClose={() => {
            setSelectedRows(new Set());
            onSelectRows([]);
          }}
        />
      )}

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
                    position: column.key === 'delete' ? 'sticky' : 'relative',
                    right: column.key === 'delete' ? 0 : 'auto',
                    backgroundColor: column.key === 'delete' ? 'hsl(var(--muted))' : 'inherit',
                    zIndex: column.key === 'delete' ? 11 : 10,
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
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border hover:bg-muted/50">
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.key}`}
                    className="p-2 border-r border-border"
                    style={{ 
                      width: column.width,
                      minWidth: column.width,
                      position: column.key === 'delete' ? 'sticky' : 'relative',
                      right: column.key === 'delete' ? 0 : 'auto',
                      backgroundColor: column.key === 'delete' ? 'hsl(var(--background))' : 'inherit',
                      zIndex: column.key === 'delete' ? 3 : 1,
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

                    {(column.key === 'level1' || column.key === 'level2' || column.key === 'level3') && (
                      <AutocompleteCell
                        value={row.hierarchy?.[column.key] || ''}
                        options={hierarchyOptions[column.key] || []}
                        onChange={(value) => updateField(row.id, `hierarchy.${column.key}`, value)}
                        placeholder={`Select ${column.label}`}
                      />
                    )}

                    {column.key === 'delete' && (
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteRow(row.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                          aria-label={`Delete row ${row.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
    </div>
  );
};

export default ProductHierarchyMappingTable;