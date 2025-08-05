import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { RowData, ProductHierarchyMappingTableProps, BatchEditToolbarProps } from '../types/productTable';

const COLUMN_WIDTHS = {
  checkbox: 50,
  name: 200,
  sku: 150,
  brand: 150,
  level1: 180,
  level2: 180,
  level3: 180,
  delete: 60
};

const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 50;

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
        <option value="level1">Level 1</option>
        <option value="level2">Level 2</option>
        <option value="level3">Level 3</option>
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
          className="w-full justify-between h-8 text-xs"
        >
          {selectedOption?.label || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" side="bottom" align="start">
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

const Cell: React.FC<{
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: any;
}> = ({ columnIndex, rowIndex, style, data }) => {
  const { 
    rows, 
    selectedRows, 
    onRowSelect, 
    onRowUpdate, 
    onDeleteRow, 
    hierarchyOptions,
    columns 
  } = data;
  
  const row = rows[rowIndex];
  const column = columns[columnIndex];
  
  if (!row || !column) return null;

  const cellStyle: React.CSSProperties = {
    ...style,
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    borderBottom: '1px solid hsl(var(--border))',
    borderRight: '1px solid hsl(var(--border))',
    backgroundColor: column.key === 'delete' ? 'hsl(var(--background))' : 'hsl(var(--card))',
    position: (column.key === 'delete' ? 'sticky' : 'relative') as 'sticky' | 'relative',
    right: column.key === 'delete' ? 0 : 'auto',
    zIndex: column.key === 'delete' ? 3 : 1,
  };

  const handleUpdate = (field: string, value: any) => {
    const updatedRow = { ...row };
    if (field.startsWith('hierarchy.')) {
      const hierarchyField = field.split('.')[1];
      updatedRow.hierarchy = { ...updatedRow.hierarchy, [hierarchyField]: value };
    } else {
      updatedRow[field] = value;
    }
    onRowUpdate(updatedRow);
  };

  switch (column.key) {
    case 'checkbox':
      return (
        <div style={cellStyle}>
          <Checkbox
            checked={selectedRows.has(row.id)}
            onCheckedChange={(checked) => onRowSelect(row.id, !!checked)}
            aria-label={`Select row ${row.id}`}
          />
        </div>
      );

    case 'name':
    case 'sku':
    case 'brand':
      return (
        <div style={cellStyle}>
          <EditableCell
            value={row[column.key] || ''}
            onChange={(value) => handleUpdate(column.key, value)}
          />
        </div>
      );

    case 'level1':
    case 'level2':
    case 'level3':
      return (
        <div style={cellStyle}>
          <AutocompleteCell
            value={row.hierarchy?.[column.key] || ''}
            options={hierarchyOptions[column.key] || []}
            onChange={(value) => handleUpdate(`hierarchy.${column.key}`, value)}
            placeholder={`Select ${column.key}`}
          />
        </div>
      );

    case 'delete':
      return (
        <div style={cellStyle} className="justify-center">
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
      );

    default:
      return <div style={cellStyle} />;
  }
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
  const gridRef = useRef<any>(null);

  const columns = [
    { key: 'checkbox', label: '', width: COLUMN_WIDTHS.checkbox },
    { key: 'name', label: 'Name', width: COLUMN_WIDTHS.name },
    { key: 'sku', label: 'SKU', width: COLUMN_WIDTHS.sku },
    { key: 'brand', label: 'Brand', width: COLUMN_WIDTHS.brand },
    { key: 'level1', label: 'Level 1', width: COLUMN_WIDTHS.level1 },
    { key: 'level2', label: 'Level 2', width: COLUMN_WIDTHS.level2 },
    { key: 'level3', label: 'Level 3', width: COLUMN_WIDTHS.level3 },
    { key: 'delete', label: '', width: COLUMN_WIDTHS.delete },
  ];

  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  const isAllSelected = selectedRows.size === rows.length && rows.length > 0;
  const isIndeterminate = selectedRows.size > 0 && selectedRows.size < rows.length;

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

  const getColumnWidth = useCallback((index: number) => {
    return columns[index]?.width || 100;
  }, []);

  const getRowHeight = useCallback(() => ROW_HEIGHT, []);

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

      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div 
          className="flex bg-muted/30 border-b sticky top-0 z-10"
          style={{ height: HEADER_HEIGHT, width: totalWidth }}
        >
          {columns.map((column, index) => (
            <div
              key={column.key}
              className="flex items-center px-2 text-sm font-medium border-r"
              style={{ 
                width: column.width,
                position: column.key === 'delete' ? 'sticky' : 'relative',
                right: column.key === 'delete' ? 0 : 'auto',
                backgroundColor: column.key === 'delete' ? 'hsl(var(--muted/30))' : 'inherit',
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
                <span>{column.label}</span>
              )}
            </div>
          ))}
        </div>

        {/* Grid */}
        <Grid
          ref={gridRef}
          columnCount={columns.length}
          rowCount={rows.length}
          columnWidth={getColumnWidth}
          rowHeight={getRowHeight}
          height={Math.min(600, rows.length * ROW_HEIGHT)}
          width={totalWidth}
          itemData={{
            rows,
            selectedRows,
            onRowSelect: handleRowSelect,
            onRowUpdate: handleRowUpdate,
            onDeleteRow,
            hierarchyOptions,
            columns
          }}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};

export default ProductHierarchyMappingTable;