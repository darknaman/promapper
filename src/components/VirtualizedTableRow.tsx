import React, { memo, useMemo, useCallback } from 'react';
import { RowData } from '../types/productTable';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Trash2 } from 'lucide-react';
import TooltipCell from './TooltipCell';
import HierarchyAutocompleteCell from './HierarchyAutocompleteCell';

interface VirtualizedTableRowProps {
  row: RowData;
  isSelected: boolean;
  onSelect: (rowId: string, selected: boolean) => void;
  onRowUpdate: (row: RowData) => void;
  onDeleteRow?: (rowId: string) => void;
  hierarchyHelper: OptimizedHierarchyHelper;
  hierarchyOptions: { [level: string]: Array<{ value: string; label: string }> };
  columns: Array<{ key: string; label: string; width: number; isCustom: boolean; dataType?: string }>;
  getValue: (productId: string, columnId: string) => string;
  setValue: (productId: string, columnId: string, value: string) => void;
  style?: React.CSSProperties;
  className?: string;
}

const VirtualizedTableRow: React.FC<VirtualizedTableRowProps> = memo(({
  row,
  isSelected,
  onSelect,
  onRowUpdate,
  onDeleteRow,
  hierarchyHelper,
  hierarchyOptions,
  columns,
  getValue,
  setValue,
  style,
  className
}) => {
  const handleSelect = useCallback((checked: boolean) => {
    onSelect(row.id, checked);
  }, [onSelect, row.id]);

  const handleRowUpdate = useCallback((field: keyof RowData, value: string) => {
    onRowUpdate({ ...row, [field]: value });
  }, [onRowUpdate, row]);

  const handleCustomColumnChange = useCallback((columnId: string, value: string) => {
    setValue(row.id, columnId, value);
  }, [setValue, row.id]);

  const handleDelete = useCallback(() => {
    onDeleteRow?.(row.id);
  }, [onDeleteRow, row.id]);

  const isComplete = useMemo(() => {
    const hierarchy = row.hierarchy || {};
    return hierarchy.level1 && hierarchy.level2 && hierarchy.level3 && 
           hierarchy.level4 && hierarchy.level5 && hierarchy.level6;
  }, [row.hierarchy]);

  const gridTemplateColumns = useMemo(() => {
    return columns.map(col => `${col.width}px`).join(' ');
  }, [columns]);

  return (
    <div 
      className={`grid gap-1 px-2 py-1 border-b border-border hover:bg-muted/30 transition-colors ${isComplete ? 'bg-success/5' : ''} ${className || ''}`}
      style={{ gridTemplateColumns, ...style }}
    >
      {columns.map((column) => {
        switch (column.key) {
          case 'checkbox':
            return (
              <div key={column.key} className="flex items-center justify-center h-8">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={handleSelect}
                  className="h-4 w-4"
                />
              </div>
            );

          case 'name':
            return (
              <TooltipCell
                key={column.key}
                value={row.name || ''}
                onChange={(value) => handleRowUpdate('name', value)}
              />
            );

          case 'sku':
            return (
              <TooltipCell
                key={column.key}
                value={row.sku || ''}
                onChange={(value) => handleRowUpdate('sku', value)}
              />
            );

          case 'brand':
            return (
              <TooltipCell
                key={column.key}
                value={row.brand || ''}
                onChange={(value) => handleRowUpdate('brand', value)}
              />
            );

          case 'url':
            return (
              <TooltipCell
                key={column.key}
                value={row.url || ''}
                onChange={(value) => handleRowUpdate('url', value)}
              />
            );

          case 'level1':
          case 'level2':
          case 'level3':
          case 'level4':
          case 'level5':
          case 'level6':
            return (
              <HierarchyAutocompleteCell
                key={column.key}
                row={row}
                column={column}
                hierarchyHelper={hierarchyHelper}
                onRowUpdate={onRowUpdate}
                hierarchyOptions={hierarchyOptions}
              />
            );

          case 'clear':
            return (
              <div key={column.key} className="flex items-center justify-center h-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 transition-colors"
                  title="Delete row"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );

          default:
            // Handle custom columns
            if (column.isCustom) {
              const value = getValue(row.id, column.key);
              return (
                <TooltipCell
                  key={column.key}
                  value={value}
                  onChange={(newValue) => handleCustomColumnChange(column.key, newValue)}
                />
              );
            }
            return <div key={column.key} className="h-8" />;
        }
      })}
    </div>
  );
});

VirtualizedTableRow.displayName = 'VirtualizedTableRow';

export default VirtualizedTableRow;