import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Eye, EyeOff, Download, Search, X, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RowData, ProductHierarchyMappingTableProps } from '../../types/productTable';
import OptimizedBatchEditForm from './OptimizedBatchEditForm';
import { Product, ClassificationLevel, FilterState } from '../../types/mapping';
import { OptimizedHierarchyHelper } from '../../utils/optimizedHierarchyHelper';
import AddColumnModal from '../AddColumnModal';
import { useOptimizedCustomColumns } from '../../hooks/useOptimizedCustomColumns';
import { SortableHeader, SortDirection } from '../SortableHeader';
import { useColumnManagement, ColumnConfig } from '../../hooks/useColumnManagement';
import ResizableColumnHeader from '../ResizableColumnHeader';
import VirtualizedTableRow from './VirtualizedTableRow';
import {
  useDebounce,
  useThrottle,
  useMemoizedFilter,
  useVirtualScrolling,
  useEventHandlerCache,
  useMemoryCleanup,
  useIntersectionObserver,
  useBatchedUpdates
} from '../../hooks/usePerformanceOptimizations';

const ITEM_HEIGHT = 40; // Height of each table row
const BUFFER_SIZE = 10; // Number of items to render outside viewport

const OptimizedProductHierarchyMappingTable: React.FC<ProductHierarchyMappingTableProps> = memo(({
  rows,
  hierarchyOptions,
  onRowsChange,
  onDeleteRow,
  onSelectRows,
  validateProductField,
  hierarchyHelper: externalHierarchyHelper,
  customColumns: propCustomColumns,
  onAddColumn: propAddColumn,
  onRemoveColumn: propRemoveColumn,
  onUpdateColumnWidth: propUpdateColumnWidth,
  getValue: propGetValue,
  setValue: propSetValue
}) => {
  // State management
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Refs for performance
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver>();

  // Performance hooks
  const { batchUpdate } = useBatchedUpdates();
  const { getHandler } = useEventHandlerCache();
  const { observe, unobserve } = useIntersectionObserver();

  // Custom columns management
  const internalCustomColumns = useOptimizedCustomColumns();
  const customColumns = propCustomColumns || internalCustomColumns.customColumns;
  const addColumn = propAddColumn || internalCustomColumns.addColumn;
  const removeColumn = propRemoveColumn || internalCustomColumns.removeColumn;
  const updateColumnWidth = propUpdateColumnWidth || internalCustomColumns.updateColumnWidth;
  const getValue = propGetValue || internalCustomColumns.getValue;
  const setValue = propSetValue || internalCustomColumns.setValue;

  // Debounced search for better performance
  const debouncedSearchQuery = useDebounce((query: string) => {
    setSearchQuery(query);
  }, 300);

  // Throttled scroll handler
  const throttledScrollHandler = useThrottle((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, 16); // ~60fps

  // Memoized base column definitions
  const baseColumnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'checkbox', label: '', width: 50, minWidth: 50, maxWidth: 50, isCustom: false },
    { key: 'name', label: 'Product Name', width: 200, minWidth: 100, maxWidth: 400, isCustom: false },
    { key: 'sku', label: 'SKU/ID', width: 120, minWidth: 80, maxWidth: 200, isCustom: false },
    { key: 'brand', label: 'Brand', width: 120, minWidth: 80, maxWidth: 200, isCustom: false },
    { key: 'url', label: 'URL', width: 150, minWidth: 100, maxWidth: 300, isCustom: false },
    { key: 'level1', label: 'Category', width: 140, minWidth: 100, maxWidth: 250, isCustom: false },
    { key: 'level2', label: 'Subcategory', width: 140, minWidth: 100, maxWidth: 250, isCustom: false },
    { key: 'level3', label: 'Big C', width: 120, minWidth: 100, maxWidth: 200, isCustom: false },
    { key: 'level4', label: 'Small C', width: 120, minWidth: 100, maxWidth: 200, isCustom: false },
    { key: 'level5', label: 'Segment', width: 120, minWidth: 100, maxWidth: 200, isCustom: false },
    { key: 'level6', label: 'Sub-segment', width: 130, minWidth: 100, maxWidth: 200, isCustom: false },
    { key: 'clear', label: '', width: 60, minWidth: 60, maxWidth: 60, isCustom: false }
  ], []);

  // Memoized all column configurations
  const allColumnConfigs = useMemo(() => {
    const customColumnConfigs: ColumnConfig[] = customColumns.map(col => ({
      key: col.id,
      label: col.name,
      width: col.width,
      minWidth: 50,
      maxWidth: 400,
      isCustom: true
    }));
    
    const result = [...baseColumnConfigs];
    const clearIndex = result.findIndex(col => col.key === 'clear');
    result.splice(clearIndex, 0, ...customColumnConfigs);
    return result;
  }, [baseColumnConfigs, customColumns]);

  // Column management hook
  const {
    columns: managedColumns,
    frozenColumns,
    scrollableColumns,
    frozenColumnCount,
    updateColumnWidth: updateManagedColumnWidth,
    freezeColumnsUpTo,
    unfreezeAllColumns,
    addColumn: addManagedColumn,
    removeColumn: removeManagedColumn
  } = useColumnManagement(allColumnConfigs);

  // Memoized hierarchy helper
  const hierarchyHelper = useMemo(() => {
    if (externalHierarchyHelper) {
      return externalHierarchyHelper;
    }
    
    // Fallback: Create basic hierarchy helper from options
    const rules = [];
    const categories = hierarchyOptions.level1 || [];
    const subcategories = hierarchyOptions.level2 || [];
    
    // Create simplified rules for better performance
    for (const cat of categories.slice(0, 100)) { // Limit for performance
      for (const subcat of subcategories.slice(0, 100)) {
        rules.push({
          category: cat.value,
          subcategory: subcat.value,
          bigC: '',
          smallC: '',
          segment: '',
          subSegment: ''
        });
      }
    }
    
    return new OptimizedHierarchyHelper(rules);
  }, [externalHierarchyHelper, hierarchyOptions]);

  // Memoized filtered and sorted rows
  const processedRows = useMemoizedFilter(
    rows,
    searchQuery,
    ['name', 'sku', 'brand'],
    showIncomplete ? (row) => {
      const hierarchy = row.hierarchy || {};
      return !hierarchy.level1 || !hierarchy.level2 || !hierarchy.level3 || 
             !hierarchy.level4 || !hierarchy.level5 || !hierarchy.level6;
    } : undefined
  );

  // Memoized sorted rows
  const sortedRows = useMemo(() => {
    if (!sortConfig) return processedRows;
    
    return [...processedRows].sort((a, b) => {
      const aValue = (a as any)[sortConfig.key] || '';
      const bValue = (b as any)[sortConfig.key] || '';
      
      const comparison = aValue.toString().localeCompare(bValue.toString());
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [processedRows, sortConfig]);

  // Virtual scrolling calculations
  const { getVisibleRange } = useVirtualScrolling(
    sortedRows.length,
    ITEM_HEIGHT,
    containerHeight,
    BUFFER_SIZE
  );

  // Memoized visible rows
  const { startIndex, endIndex } = useMemo(() => 
    getVisibleRange(scrollTop), 
    [getVisibleRange, scrollTop]
  );

  const visibleRows = useMemo(() => 
    sortedRows.slice(startIndex, endIndex),
    [sortedRows, startIndex, endIndex]
  );

  // Container resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      resizeObserverRef.current?.disconnect();
    };
  }, []);

  // Optimized event handlers
  const handleRowSelect = useCallback((rowId: string, selected: boolean) => {
    batchUpdate(() => {
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(rowId);
        } else {
          newSet.delete(rowId);
        }
        return newSet;
      });
    });
  }, [batchUpdate]);

  const handleSelectAll = useCallback((checked: boolean) => {
    batchUpdate(() => {
      if (checked) {
        setSelectedRows(new Set(sortedRows.map(row => row.id)));
        onSelectRows(sortedRows.map(row => row.id));
      } else {
        setSelectedRows(new Set());
        onSelectRows([]);
      }
    });
  }, [sortedRows, onSelectRows, batchUpdate]);

  const handleRowUpdate = useCallback((updatedRow: RowData) => {
    const updatedRows = rows.map(row => row.id === updatedRow.id ? updatedRow : row);
    onRowsChange(updatedRows);
  }, [rows, onRowsChange]);

  const handleColumnResize = useCallback((columnKey: string, newWidth: number) => {
    updateManagedColumnWidth(columnKey, newWidth);
    const customColumn = customColumns.find(col => col.id === columnKey);
    if (customColumn) {
      updateColumnWidth(columnKey, newWidth);
    }
  }, [updateManagedColumnWidth, customColumns, updateColumnWidth]);

  const handleRemoveColumn = useCallback((columnKey: string) => {
    removeManagedColumn(columnKey);
    removeColumn(columnKey);
  }, [removeManagedColumn, removeColumn]);

  const handleClearRow = useCallback((rowId: string) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          hierarchy: {}
        };
      }
      return row;
    });
    onRowsChange(updatedRows);
  }, [rows, onRowsChange]);

  const handleBatchEdit = useCallback(async (updates: any) => {
    const selectedProductRows = sortedRows.filter(row => selectedRows.has(row.id));
    
    const updatedRows = rows.map(row => {
      if (selectedRows.has(row.id)) {
        return {
          ...row,
          hierarchy: {
            ...row.hierarchy,
            ...Object.fromEntries(
              Object.entries(updates).map(([key, value]) => [
                key === 'category' ? 'level1' :
                key === 'subcategory' ? 'level2' :
                key === 'bigC' ? 'level3' :
                key === 'smallC' ? 'level4' :
                key === 'segment' ? 'level5' :
                key === 'subSegment' ? 'level6' : key,
                value
              ])
            )
          }
        };
      }
      return row;
    });
    
    onRowsChange(updatedRows);
    setSelectedRows(new Set());
    setIsBatchEditOpen(false);
  }, [sortedRows, selectedRows, rows, onRowsChange]);

  const handleSort = useCallback((key: string, direction: SortDirection) => {
    setSortConfig({ key, direction });
  }, []);

  // Memory cleanup
  useMemoryCleanup(() => {
    resizeObserverRef.current?.disconnect();
    setSelectedRows(new Set());
  }, []);

  // Memoized frozen width calculation
  const frozenWidth = useMemo(() => 
    frozenColumns.reduce((sum, col) => sum + col.width, 0),
    [frozenColumns]
  );

  // Memoized summary statistics
  const summaryStats = useMemo(() => {
    const total = sortedRows.length;
    const completed = sortedRows.filter(row => {
      const hierarchy = row.hierarchy || {};
      return hierarchy.level1 && hierarchy.level2 && hierarchy.level3 && 
             hierarchy.level4 && hierarchy.level5 && hierarchy.level6;
    }).length;
    const selected = selectedRows.size;
    
    return { total, completed, selected, completionRate: total > 0 ? (completed / total) * 100 : 0 };
  }, [sortedRows, selectedRows]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-8 h-9"
              onChange={(e) => debouncedSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Show Incomplete Toggle */}
          <Button
            variant={showIncomplete ? "default" : "outline"}
            size="sm"
            onClick={() => setShowIncomplete(!showIncomplete)}
            className="flex items-center gap-2"
          >
            {showIncomplete ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            Incomplete Only
          </Button>
          
          {/* Add Column */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddColumnModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Column
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline">
              {summaryStats.total} Total
            </Badge>
            <Badge variant={summaryStats.completed > 0 ? "default" : "secondary"}>
              {summaryStats.completed} Complete ({summaryStats.completionRate.toFixed(1)}%)
            </Badge>
            {summaryStats.selected > 0 && (
              <Badge variant="secondary">
                {summaryStats.selected} Selected
              </Badge>
            )}
          </div>

          {/* Batch Actions */}
          {selectedRows.size > 0 && (
            <Button
              size="sm"
              onClick={() => setIsBatchEditOpen(true)}
              className="flex items-center gap-2"
            >
              Edit {selectedRows.size} Selected
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Table Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex">
            {/* Frozen Headers */}
            {frozenColumnCount > 0 && (
              <div 
                className="flex bg-muted/30 border-r border-border sticky left-0 z-20"
                style={{ width: frozenWidth }}
              >
                {frozenColumns.map((column, index) => (
                    <ResizableColumnHeader
                      key={column.key}
                      column={column}
                      columnIndex={index}
                      totalColumns={managedColumns.length}
                      frozenColumnCount={frozenColumnCount}
                      onColumnResize={handleColumnResize}
                      onFreezeColumnsUpTo={freezeColumnsUpTo}
                      onUnfreezeAll={unfreezeAllColumns}
                      onRemoveColumn={column.isCustom ? handleRemoveColumn : undefined}
                  >
                    {column.key === 'checkbox' ? (
                      <Checkbox
                        checked={selectedRows.size > 0 && selectedRows.size === sortedRows.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    ) : (
                      <SortableHeader
                        label={column.label}
                        sortKey={column.key}
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                    )}
                  </ResizableColumnHeader>
                ))}
              </div>
            )}
            
            {/* Scrollable Headers */}
            <div className="flex flex-1">
              {scrollableColumns.map((column, index) => (
                <ResizableColumnHeader
                  key={column.key}
                  column={column}
                  columnIndex={frozenColumnCount + index}
                  totalColumns={managedColumns.length}
                  frozenColumnCount={frozenColumnCount}
                  onColumnResize={handleColumnResize}
                  onFreezeColumnsUpTo={freezeColumnsUpTo}
                  onUnfreezeAll={unfreezeAllColumns}
                  onRemoveColumn={column.isCustom ? handleRemoveColumn : undefined}
                >
                  {column.key === 'clear' ? (
                    <span className="text-xs text-muted-foreground">Clear</span>
                  ) : (
                    <SortableHeader
                      label={column.label}
                      sortKey={column.key}
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                  )}
                </ResizableColumnHeader>
              ))}
            </div>
          </div>
        </div>

        {/* Virtual Scrolled Table Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{ height: `${containerHeight}px` }}
          onScroll={throttledScrollHandler}
        >
          <div style={{ height: `${sortedRows.length * ITEM_HEIGHT}px`, position: 'relative' }}>
            <div style={{ transform: `translateY(${startIndex * ITEM_HEIGHT}px)` }}>
              {visibleRows.map((row, index) => (
                <VirtualizedTableRow
                  key={row.id}
                  row={row}
                  columns={managedColumns}
                  frozenColumnCount={frozenColumnCount}
                  isSelected={selectedRows.has(row.id)}
                  onRowSelect={handleRowSelect}
                  onRowUpdate={handleRowUpdate}
                  onClearRow={handleClearRow}
                  hierarchyOptions={hierarchyOptions}
                  customGetValue={getValue}
                  customSetValue={setValue}
                  index={startIndex + index}
                  style={{ height: ITEM_HEIGHT }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <OptimizedBatchEditForm
        selectedProducts={sortedRows.filter(row => selectedRows.has(row.id)).map(row => ({ ...row, title: row.name || '', id: row.id })) as Product[]}
        hierarchyHelper={hierarchyHelper}
        onBatchUpdate={handleBatchEdit}
        onClose={() => setIsBatchEditOpen(false)}
        isOpen={isBatchEditOpen}
      />

      <AddColumnModal
        open={isAddColumnModalOpen}
        onClose={() => setIsAddColumnModalOpen(false)}
        onAddColumn={addColumn}
      />
    </div>
  );
});

OptimizedProductHierarchyMappingTable.displayName = 'OptimizedProductHierarchyMappingTable';

export default OptimizedProductHierarchyMappingTable;