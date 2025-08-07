import React, { memo, useCallback, useMemo } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { RotateCcw } from 'lucide-react';
import { RowData } from '../../types/productTable';
import { ColumnConfig } from '../../hooks/useColumnManagement';
import OptimizedTableCell from './OptimizedTableCell';
import OptimizedDropdownCell from './OptimizedDropdownCell';
import { cn } from '../../lib/utils';

interface VirtualizedTableRowProps {
  row: RowData;
  columns: ColumnConfig[];
  frozenColumnCount: number;
  isSelected: boolean;
  onRowSelect: (rowId: string, selected: boolean) => void;
  onRowUpdate: (row: RowData) => void;
  onClearRow: (rowId: string) => void;
  hierarchyOptions: { [key: string]: Array<{ value: string; label: string }> };
  customGetValue?: (rowId: string, columnId: string) => string;
  customSetValue?: (rowId: string, columnId: string, value: string) => void;
  style?: React.CSSProperties;
  index: number;
}

const VirtualizedTableRow: React.FC<VirtualizedTableRowProps> = memo(({
  row,
  columns,
  frozenColumnCount,
  isSelected,
  onRowSelect,
  onRowUpdate,
  onClearRow,
  hierarchyOptions,
  customGetValue,
  customSetValue,
  style,
  index
}) => {
  // Memoized columns split
  const { frozenColumns, scrollableColumns } = useMemo(() => ({
    frozenColumns: columns.slice(0, frozenColumnCount),
    scrollableColumns: columns.slice(frozenColumnCount)
  }), [columns, frozenColumnCount]);

  // Memoized total frozen width
  const frozenWidth = useMemo(() => 
    frozenColumns.reduce((sum, col) => sum + col.width, 0),
    [frozenColumns]
  );

  const handleSelect = useCallback((checked: boolean) => {
    onRowSelect(row.id, checked);
  }, [row.id, onRowSelect]);

  const handleCellChange = useCallback((columnKey: string, value: string) => {
    if (customSetValue) {
      customSetValue(row.id, columnKey, value);
    } else {
      const updatedRow = { ...row };
      
      if (columnKey.startsWith('level')) {
        if (!updatedRow.hierarchy) updatedRow.hierarchy = {};
        updatedRow.hierarchy[columnKey] = value;
      } else {
        (updatedRow as any)[columnKey] = value;
      }
      
      onRowUpdate(updatedRow);
    }
  }, [row, onRowUpdate, customSetValue]);

  const handleClear = useCallback(() => {
    onClearRow(row.id);
  }, [row.id, onClearRow]);

  const getCellValue = useCallback((column: ColumnConfig): string => {
    if (customGetValue) {
      return customGetValue(row.id, column.key);
    }
    
    if (column.key.startsWith('level')) {
      return row.hierarchy?.[column.key] || '';
    }
    
    return (row as any)[column.key] || '';
  }, [row, customGetValue]);

  const renderCell = useCallback((column: ColumnConfig) => {
    const value = getCellValue(column);
    
    switch (column.key) {
      case 'checkbox':
        return (
          <div className="flex items-center justify-center h-8 px-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleSelect}
              aria-label={`Select row ${index + 1}`}
            />
          </div>
        );
        
      case 'clear':
        return (
          <div className="flex items-center justify-center h-8 px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-destructive/10"
              title="Clear all mappings"
            >
              <RotateCcw className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        );
        
      default:
        // Handle hierarchy columns with dropdowns
        if (column.key.startsWith('level') && hierarchyOptions[column.key]) {
          return (
            <OptimizedDropdownCell
              value={value}
              options={hierarchyOptions[column.key]}
              onChange={(newValue) => handleCellChange(column.key, newValue)}
              placeholder={`Select ${column.label}`}
              width={column.width}
            />
          );
        }
        
        // Handle URL columns
        if (column.key === 'url') {
          return (
            <OptimizedTableCell
              value={value}
              onChange={(newValue) => handleCellChange(column.key, newValue)}
              width={column.width}
              type="url"
              placeholder="Enter URL..."
            />
          );
        }
        
        // Regular text cells
        return (
          <OptimizedTableCell
            value={value}
            onChange={(newValue) => handleCellChange(column.key, newValue)}
            width={column.width}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
          />
        );
    }
  }, [getCellValue, isSelected, handleSelect, handleClear, handleCellChange, hierarchyOptions, index]);

  // Check if row is complete for highlighting
  const isComplete = useMemo(() => {
    const hierarchyLevels = ['level1', 'level2', 'level3', 'level4', 'level5', 'level6'];
    return hierarchyLevels.every(level => row.hierarchy?.[level]);
  }, [row.hierarchy]);

  return (
    <div
      className={cn(
        "flex border-b border-border/50 transition-colors duration-150",
        isComplete && "bg-green-50/50 dark:bg-green-900/10",
        isSelected && "bg-blue-50/50 dark:bg-blue-900/10",
        "hover:bg-muted/30"
      )}
      style={style}
    >
      {/* Frozen columns */}
      {frozenColumnCount > 0 && (
        <div 
          className="flex bg-background border-r border-border/50 sticky left-0 z-10"
          style={{ width: frozenWidth }}
        >
          {frozenColumns.map((column) => (
            <div
              key={column.key}
              style={{ width: column.width }}
              className="flex-shrink-0"
            >
              {renderCell(column)}
            </div>
          ))}
        </div>
      )}
      
      {/* Scrollable columns */}
      <div className="flex flex-1">
        {scrollableColumns.map((column) => (
          <div
            key={column.key}
            style={{ width: column.width }}
            className="flex-shrink-0"
          >
            {renderCell(column)}
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export default VirtualizedTableRow;