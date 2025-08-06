import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { RotateCcw, Eye, EyeOff, Download, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { RowData, ProductHierarchyMappingTableProps } from '../types/productTable';
import BatchEditForm from './BatchEditForm';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import AddColumnModal from './AddColumnModal';
import { useCustomColumns } from '../hooks/useCustomColumns';
import { SortableHeader, SortDirection } from './SortableHeader';
import TooltipCell from './TooltipCell';
import HierarchyAutocompleteCell from './HierarchyAutocompleteCell';
import { useDebounce, useDebouncedCallback, useThrottledCallback } from '../hooks/useDebounce';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

// Memoized table header component for better performance
const TableHeader = memo<{
  columns: Array<{ key: string; label: string; width: number; isCustom: boolean; dataType?: string }>;
  sortConfig: { key: string; direction: SortDirection } | null;
  onSort: (key: string, direction: SortDirection) => void;
  isAllSelected: boolean;
  onSelectAll: (selected: boolean) => void;
  onRemoveColumn: (columnId: string) => void;
}>(({ columns, sortConfig, onSort, isAllSelected, onSelectAll, onRemoveColumn }) => {
  return (
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
                onCheckedChange={onSelectAll}
                aria-label="Select all rows"
                className="h-4 w-4"
              />
            ) : column.key === 'clear' ? (
              <span className="text-xs text-muted-foreground">Clear</span>
            ) : column.isCustom ? (
              <div className="flex items-center justify-between gap-1 min-w-0">
                <SortableHeader
                  label={column.label}
                  sortKey={column.key}
                  currentSort={sortConfig}
                  onSort={onSort}
                  width={column.width - 30}
                  className="flex-1 min-w-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/10 flex-shrink-0"
                  onClick={() => onRemoveColumn(column.key)}
                  aria-label={`Delete ${column.label} column`}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ) : (
              <SortableHeader
                label={column.label}
                sortKey={column.key}
                currentSort={sortConfig}
                onSort={onSort}
                width={column.width}
              />
            )}
          </th>
        ))}
      </tr>
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

// Memoized table row component for performance
const TableRow = memo<{
  row: RowData;
  columns: Array<{ key: string; label: string; width: number; isCustom: boolean; dataType?: string }>;
  isSelected: boolean;
  onSelect: (rowId: string, selected: boolean) => void;
  onRowUpdate: (row: RowData) => void;
  onUpdateField: (rowId: string, field: string, value: any) => void;
  onClearMapping: (rowId: string) => void;
  hierarchyHelper: OptimizedHierarchyHelper;
  hierarchyOptions: { [level: string]: Array<{ value: string; label: string }> };
  getValue: (productId: string, columnId: string) => string;
  setValue: (productId: string, columnId: string, value: string) => void;
}>(({ 
  row, 
  columns, 
  isSelected, 
  onSelect, 
  onRowUpdate, 
  onUpdateField, 
  onClearMapping, 
  hierarchyHelper, 
  hierarchyOptions, 
  getValue, 
  setValue 
}) => {
  const handleSelect = useCallback((checked: boolean) => {
    onSelect(row.id, checked);
  }, [onSelect, row.id]);

  return (
    <tr key={row.id} className="border-b border-border hover:bg-muted/50 transition-colors">
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
              checked={isSelected}
              onCheckedChange={handleSelect}
              aria-label={`Select row ${row.id}`}
              className="h-4 w-4"
            />
          )}

          {(column.key === 'name' || column.key === 'sku' || column.key === 'brand') && (
            <TooltipCell
              value={row[column.key as keyof RowData] as string || ''}
              onChange={(value) => onUpdateField(row.id, column.key, value)}
            />
          )}

          {column.key === 'url' && (
            <div className="flex items-center gap-1 h-8">
              <TooltipCell
                value={row.url || ''}
                onChange={(value) => onUpdateField(row.id, 'url', value)}
                className="flex-1"
              />
              {row.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(row.url, '_blank', 'noopener,noreferrer')}
                  className="h-6 w-6 p-0 hover:bg-primary/10 transition-colors ml-1"
                  title="Open URL in new tab"
                >
                  <svg 
                    className="h-3 w-3 text-primary" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                    />
                  </svg>
                </Button>
              )}
            </div>
          )}

          {(column.key === 'level1' || column.key === 'level2' || column.key === 'level3' || 
            column.key === 'level4' || column.key === 'level5' || column.key === 'level6') && (
            <HierarchyAutocompleteCell
              row={row}
              column={column}
              hierarchyHelper={hierarchyHelper}
              onRowUpdate={onRowUpdate}
              hierarchyOptions={hierarchyOptions}
            />
          )}

          {column.isCustom && (
            <TooltipCell
              value={getValue(row.id, column.key)}
              onChange={(value) => setValue(row.id, column.key, value)}
            />
          )}

          {column.key === 'clear' && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClearMapping(row.id)}
                className="h-8 w-8 p-0 hover:bg-destructive/10 transition-colors"
                aria-label={`Clear mapping for row ${row.id}`}
              >
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </td>
      ))}
    </tr>
  );
});

TableRow.displayName = 'TableRow';

const ProductHierarchyMappingTable: React.FC<ProductHierarchyMappingTableProps> = memo(({
  rows,
  hierarchyOptions,
  onRowsChange,
  onDeleteRow,
  onSelectRows,
  validateProductField,
  hierarchyHelper: externalHierarchyHelper
}) => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  
  // Performance monitoring
  const { startRender, endRender, measureUpdate } = usePerformanceMonitor('ProductHierarchyMappingTable', {
    enableFpsMonitoring: process.env.NODE_ENV === 'development',
    enableMemoryMonitoring: process.env.NODE_ENV === 'development'
  });

  // Custom columns hook
  const { customColumns, addColumn, removeColumn, updateColumnWidth, getValue, setValue } = useCustomColumns();

  // Use external hierarchy helper if provided, otherwise create from options
  const hierarchyHelper = useMemo(() => {
    if (externalHierarchyHelper) {
      console.log('Using external hierarchy helper with uploaded data');
      return externalHierarchyHelper;
    }
    
    // Fallback: Extract hierarchy rules from the hierarchyOptions prop
    const rules = [];
    
    // Get all possible combinations from the options
    const categories = hierarchyOptions.level1 || [];
    const subcategories = hierarchyOptions.level2 || [];
    const bigCs = hierarchyOptions.level3 || [];
    const smallCs = hierarchyOptions.level4 || [];
    const segments = hierarchyOptions.level5 || [];
    const subSegments = hierarchyOptions.level6 || [];
    
    // Create rules for all valid combinations
    for (const cat of categories) {
      for (const subcat of subcategories) {
        for (const bigC of bigCs) {
          for (const smallC of smallCs) {
            for (const segment of segments) {
              for (const subSegment of subSegments) {
                rules.push({
                  category: cat.value,
                  subcategory: subcat.value,
                  bigC: bigC.value,
                  smallC: smallC.value,
                  segment: segment.value,
                  subSegment: subSegment.value
                });
              }
            }
          }
        }
      }
    }
    
    console.log('Creating fallback hierarchy helper with', rules.length, 'rules from options');
    return new OptimizedHierarchyHelper(rules);
  }, [externalHierarchyHelper, hierarchyOptions]);

  // Combine base columns with custom columns
  const columns = useMemo(() => {
    const baseColumns = [
      { key: 'checkbox', label: '', width: 50, isCustom: false },
      { key: 'name', label: 'Product Name', width: 200, isCustom: false },
      { key: 'sku', label: 'SKU/ID', width: 120, isCustom: false },
      { key: 'brand', label: 'Brand', width: 120, isCustom: false },
      { key: 'url', label: 'URL', width: 150, isCustom: false },
      { key: 'level1', label: 'Category', width: 140, isCustom: false },
      { key: 'level2', label: 'Subcategory', width: 140, isCustom: false },
      { key: 'level3', label: 'Big C', width: 120, isCustom: false },
      { key: 'level4', label: 'Small C', width: 120, isCustom: false },
      { key: 'level5', label: 'Segment', width: 120, isCustom: false },
      { key: 'level6', label: 'Sub-segment', width: 130, isCustom: false },
      { key: 'clear', label: '', width: 60, isCustom: false },
    ];
    
    // Add custom columns before the clear column
    const customCols = customColumns.map(col => ({
      key: col.id,
      label: col.name,
      width: col.width,
      isCustom: true,
      dataType: col.dataType
    }));
    
    // Insert custom columns before the clear column
    const result = [...baseColumns.slice(0, -1), ...customCols, baseColumns[baseColumns.length - 1]];
    return result;
  }, [customColumns]);

  // Filter rows based on show incomplete
  const filteredRows = useMemo(() => {
    if (!showIncomplete) return rows;
    return rows.filter(row => {
      const hierarchy = row.hierarchy || {};
      return !hierarchy.level1 || !hierarchy.level2 || !hierarchy.level3 || 
             !hierarchy.level4 || !hierarchy.level5 || !hierarchy.level6;
    });
  }, [rows, showIncomplete]);

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Search functionality with debounced query
  const searchFilteredRows = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return filteredRows;
    return filteredRows.filter(row => 
      row.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      row.sku?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      row.brand?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [filteredRows, debouncedSearchQuery]);

  // Sorting functionality with performance optimization
  const sortedRows = useMemo(() => {
    if (!sortConfig) return searchFilteredRows;

    return [...searchFilteredRows].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get values based on column key
      if (sortConfig.key === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
      } else if (sortConfig.key === 'sku') {
        aValue = a.sku || '';
        bValue = b.sku || '';
      } else if (sortConfig.key === 'brand') {
        aValue = a.brand || '';
        bValue = b.brand || '';
      } else if (sortConfig.key === 'url') {
        aValue = a.url || '';
        bValue = b.url || '';
      } else if (sortConfig.key.startsWith('level')) {
        aValue = a.hierarchy?.[sortConfig.key] || '';
        bValue = b.hierarchy?.[sortConfig.key] || '';
      } else if (customColumns.find(col => col.id === sortConfig.key)) {
        // Handle custom columns
        const column = customColumns.find(col => col.id === sortConfig.key);
        aValue = getValue(a.id, sortConfig.key);
        bValue = getValue(b.id, sortConfig.key);
        
        // Convert to number if column is numeric
        if (column?.dataType === 'number') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
      } else {
        return 0;
      }

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String comparison (case-insensitive)
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [searchFilteredRows, sortConfig, customColumns, getValue]);

  // Performance-optimized handlers
  const handleSort = useCallback((key: string, direction: SortDirection) => {
    measureUpdate(() => {
      console.log('Sorting by:', key, 'direction:', direction);
      setSortConfig(direction ? { key, direction } : null);
    }, 'sort');
  }, [measureUpdate]);

  const debouncedSearchHandler = useDebouncedCallback((query: string) => {
    setSearchQuery(query);
  }, 200);

  const isAllSelected = selectedRows.size === sortedRows.length && sortedRows.length > 0;

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
      const row = sortedRows.find(r => r.id === rowId);
      if (!row) return null;
      
      return {
        id: row.id,
        title: row.name,
        brand: row.brand,
        url: row.url || '',
        category: row.hierarchy?.level1,
        subcategory: row.hierarchy?.level2,
        bigC: row.hierarchy?.level3,
        smallC: row.hierarchy?.level4,
        segment: row.hierarchy?.level5,
        subSegment: row.hierarchy?.level6
      };
    }).filter(Boolean) as Product[];
  }, [selectedRows, sortedRows]);

  const handleSelectAll = useCallback((checked: boolean) => {
    measureUpdate(() => {
      if (checked) {
        // Select only the currently filtered/sorted rows
        const allFilteredIds = new Set(sortedRows.map(row => row.id));
        setSelectedRows(allFilteredIds);
        onSelectRows?.(Array.from(allFilteredIds));
        console.log('Selected all filtered rows:', allFilteredIds.size, 'total filtered rows:', sortedRows.length);
      } else {
        setSelectedRows(new Set());
        onSelectRows?.([]);
        console.log('Deselected all rows');
      }
    }, 'selectAll');
  }, [sortedRows, onSelectRows, measureUpdate]);

  const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
    const newSelection = new Set(selectedRows);
    if (selected) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    setSelectedRows(newSelection);
    onSelectRows?.(Array.from(newSelection));
  }, [selectedRows, onSelectRows]);

  const handleRowUpdate = useCallback((updatedRow: RowData) => {
    measureUpdate(() => {
      const updatedRows = rows.map(row => row.id === updatedRow.id ? updatedRow : row);
      onRowsChange(updatedRows);
    }, 'rowUpdate');
  }, [rows, onRowsChange, measureUpdate]);

  const handleBatchUpdate = useCallback(async (updates: any) => {
    measureUpdate(() => {
      const updatedRows = rows.map(row => {
        // Only update rows that are both selected AND in the current sorted results
        if (selectedRows.has(row.id) && sortedRows.some(sortedRow => sortedRow.id === row.id)) {
          const newHierarchy = {
            ...row.hierarchy,
            level1: updates.category || row.hierarchy?.level1,
            level2: updates.subcategory || row.hierarchy?.level2,
            level3: updates.bigC || row.hierarchy?.level3,
            level4: updates.smallC || row.hierarchy?.level4,
            level5: updates.segment || row.hierarchy?.level5,
            level6: updates.subSegment || row.hierarchy?.level6
          };

          // Apply auto-completion to batch updated rows
          if (hierarchyHelper && Object.values(updates).some(v => v)) {
            try {
              const currentSelections = {
                category: newHierarchy.level1,
                subcategory: newHierarchy.level2,
                bigC: newHierarchy.level3,
                smallC: newHierarchy.level4,
                segment: newHierarchy.level5,
                subSegment: newHierarchy.level6
              };

              const autoCompleted = hierarchyHelper.autoCompleteSelections(currentSelections);
              newHierarchy.level1 = autoCompleted.category || newHierarchy.level1;
              newHierarchy.level2 = autoCompleted.subcategory || newHierarchy.level2;
              newHierarchy.level3 = autoCompleted.bigC || newHierarchy.level3;
              newHierarchy.level4 = autoCompleted.smallC || newHierarchy.level4;
              newHierarchy.level5 = autoCompleted.segment || newHierarchy.level5;
              newHierarchy.level6 = autoCompleted.subSegment || newHierarchy.level6;
            } catch (error) {
              console.error('Error in batch auto-completion:', error);
            }
          }

          return { ...row, hierarchy: newHierarchy };
        }
        return row;
      });
      onRowsChange(updatedRows);
      setSelectedRows(new Set());
      onSelectRows?.([]);
    }, 'batchUpdate');
  }, [rows, selectedRows, sortedRows, hierarchyHelper, onRowsChange, onSelectRows, measureUpdate]);

  const clearRowMapping = useCallback((rowId: string) => {
    measureUpdate(() => {
      const updatedRows = rows.map(row => {
        if (row.id === rowId) {
          return { ...row, hierarchy: {} };
        }
        return row;
      });
      onRowsChange(updatedRows);
    }, 'clearMapping');
  }, [rows, onRowsChange, measureUpdate]);

  const updateField = useCallback((rowId: string, field: string, value: any) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    const updatedRow = { ...row };
    if (field.startsWith('hierarchy.')) {
      const hierarchyField = field.split('.')[1];
      updatedRow.hierarchy = { ...updatedRow.hierarchy, [hierarchyField]: value };
      
      // Auto-complete functionality with bidirectional hierarchy filling
      if (value && hierarchyHelper) {
        try {
          // Map the hierarchy fields to classification levels
          const levelMapping: Record<string, keyof typeof updatedRow.hierarchy> = {
            category: 'level1',
            subcategory: 'level2',
            bigC: 'level3',
            smallC: 'level4',
            segment: 'level5',
            subSegment: 'level6'
          };

          const reverseMapping: Record<string, string> = {
            level1: 'category',
            level2: 'subcategory',
            level3: 'bigC',
            level4: 'smallC',
            level5: 'segment',
            level6: 'subSegment'
          };

          const currentSelections = {
            category: updatedRow.hierarchy?.level1,
            subcategory: updatedRow.hierarchy?.level2,
            bigC: updatedRow.hierarchy?.level3,
            smallC: updatedRow.hierarchy?.level4,
            segment: updatedRow.hierarchy?.level5,
            subSegment: updatedRow.hierarchy?.level6
          };

          // Set the new value
          const changedLevel = reverseMapping[hierarchyField];
          if (changedLevel) {
            currentSelections[changedLevel as keyof typeof currentSelections] = value;

            // Clear invalid selections and auto-complete
            const clearedSelections = hierarchyHelper.clearInvalidSelections(
              currentSelections, 
              changedLevel as any
            );
            const autoCompleted = hierarchyHelper.autoCompleteSelections(clearedSelections);

            // Apply all auto-completed values
            updatedRow.hierarchy = {
              level1: autoCompleted.category || updatedRow.hierarchy?.level1,
              level2: autoCompleted.subcategory || updatedRow.hierarchy?.level2,
              level3: autoCompleted.bigC || updatedRow.hierarchy?.level3,
              level4: autoCompleted.smallC || updatedRow.hierarchy?.level4,
              level5: autoCompleted.segment || updatedRow.hierarchy?.level5,
              level6: autoCompleted.subSegment || updatedRow.hierarchy?.level6
            };
          }
        } catch (error) {
          console.error('Error in hierarchy auto-completion:', error);
          // Fall back to just setting the selected value
          updatedRow.hierarchy = { ...updatedRow.hierarchy, [hierarchyField]: value };
        }
      }
    } else {
      updatedRow[field as keyof RowData] = value;
    }
    handleRowUpdate(updatedRow);
  }, [rows, handleRowUpdate, hierarchyHelper]);

  // CSV Export functionality
  const exportToCSV = useCallback(() => {
    measureUpdate(() => {
      const headers = [
        'ID', 'Product Name', 'SKU', 'Brand', 'URL',
        'Category', 'Subcategory', 'Big C', 'Small C', 'Segment', 'Sub-segment'
      ];
      
      // Add custom column headers
      const customHeaders = customColumns.map(col => col.name);
      const allHeaders = [...headers, ...customHeaders];
      
      const csvData = rows.map(row => {
        const baseData = [
          row.id,
          row.name || '',
          row.sku || '',
          row.brand || '',
          row.url || '',
          row.hierarchy?.level1 || '',
          row.hierarchy?.level2 || '',
          row.hierarchy?.level3 || '',
          row.hierarchy?.level4 || '',
          row.hierarchy?.level5 || '',
          row.hierarchy?.level6 || ''
        ];
        
        // Add custom column values
        const customData = customColumns.map(col => getValue(row.id, col.id) || '');
        
        return [...baseData, ...customData];
      });

      const csvContent = [allHeaders, ...csvData]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `product-hierarchy-mapping-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'export');
  }, [rows, customColumns, getValue, measureUpdate]);

  // Use effect to call parent selection handler with throttling
  useEffect(() => {
    const throttledUpdate = setTimeout(() => {
      onSelectRows?.(Array.from(selectedRows));
    }, 100);
    
    return () => clearTimeout(throttledUpdate);
  }, [selectedRows, onSelectRows]);

  // Performance monitoring for renders
  useEffect(() => {
    startRender();
    return () => endRender();
  });

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
            <AddColumnModal onAddColumn={addColumn} />
            
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="flex items-center gap-2 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIncomplete(!showIncomplete)}
              className="flex items-center gap-2 transition-colors"
            >
              {showIncomplete ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showIncomplete ? 'Show All' : 'Show Incomplete'}
            </Button>
            
            {selectedRows.size > 0 && (
              <Button
                size="sm"
                onClick={() => setIsBatchEditOpen(true)}
                className="bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Batch Edit ({selectedRows.size})
              </Button>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, SKU, or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 transition-colors"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 transition-colors"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          {searchQuery && (
            <Badge variant="secondary">
              {sortedRows.length} of {filteredRows.length} rows
            </Badge>
          )}
        </div>
      </div>

      <div className="border rounded-lg overflow-auto bg-card max-h-[600px]">
        <table className="w-full">
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            isAllSelected={isAllSelected}
            onSelectAll={handleSelectAll}
            onRemoveColumn={removeColumn}
          />
          <tbody>
            {sortedRows.map((row) => (
              <TableRow
                key={row.id}
                row={row}
                columns={columns}
                isSelected={selectedRows.has(row.id)}
                onSelect={handleRowSelect}
                onRowUpdate={handleRowUpdate}
                onUpdateField={updateField}
                onClearMapping={clearRowMapping}
                hierarchyHelper={hierarchyHelper}
                hierarchyOptions={hierarchyOptions}
                getValue={getValue}
                setValue={setValue}
              />
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
});

ProductHierarchyMappingTable.displayName = 'ProductHierarchyMappingTable';

export default ProductHierarchyMappingTable;