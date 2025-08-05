import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Product } from '../types/mapping';
import { ColumnConfig, ProductTableLayout } from '../types/batchEdit';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import CascadingSelect from './CascadingSelect';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Trash2 } from 'lucide-react';

interface FrozenTableProps {
  products: Product[];
  hierarchyHelper: OptimizedHierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  selectedProducts: Set<string>;
  onProductSelect: (productId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  layout: ProductTableLayout;
  onColumnResize: (column: string, width: number) => void;
}

const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 52;

const FrozenTable: React.FC<FrozenTableProps> = ({
  products,
  hierarchyHelper,
  onProductUpdate,
  selectedProducts,
  onProductSelect,
  onSelectAll,
  layout,
  onColumnResize
}) => {
  const gridRef = useRef<any>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const frozenRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeColumn, setResizeColumn] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{rowId: string, columnKey: string} | null>(null);

  const frozenColumns = useMemo(() => {
    return layout.frozenColumns.map(key => ({
      key,
      label: key === 'id' ? 'ID' : key.charAt(0).toUpperCase() + key.slice(1),
      width: layout.columnWidths[key],
      minWidth: layout.minColumnWidths[key],
      resizable: true,
      editable: true,
      frozen: true
    }));
  }, [layout]);

  const scrollableColumns = useMemo(() => {
    return layout.scrollableColumns.map(key => ({
      key,
      label: key === 'bigC' ? 'Big C' : 
             key === 'smallC' ? 'Small C' : 
             key === 'subSegment' ? 'Sub-segment' :
             key.charAt(0).toUpperCase() + key.slice(1),
      width: layout.columnWidths[key],
      minWidth: layout.minColumnWidths[key],
      resizable: true,
      editable: false,
      frozen: false
    }));
  }, [layout]);

  const allColumns = [...frozenColumns, ...scrollableColumns];
  
  // Memoize checkbox states to prevent infinite re-renders
  const isAllSelected = useMemo(() => {
    return selectedProducts.size === products.length && products.length > 0;
  }, [selectedProducts.size, products.length]);
  
  const isIndeterminate = useMemo(() => {
    return selectedProducts.size > 0 && selectedProducts.size < products.length;
  }, [selectedProducts.size, products.length]);

  const getColumnWidth = useCallback((columnIndex: number) => {
    if (columnIndex >= allColumns.length) {
      return 60; // Clear button column width
    }
    return allColumns[columnIndex]?.width || 100;
  }, [allColumns]);

  const getRowHeight = useCallback(() => ROW_HEIGHT, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    setIsResizing(true);
    setResizeColumn(columnKey);

    const startX = e.clientX;
    const startWidth = layout.columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(
        layout.minColumnWidths[columnKey],
        startWidth + deltaX
      );
      onColumnResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [layout, onColumnResize]);

  const HeaderCell = React.memo(({ column, isLast }: { column: ColumnConfig; isLast: boolean }) => (
    <div 
      className="flex items-center justify-between h-full px-2 text-sm font-medium relative group border-r"
      style={{ width: column.width }}
    >
      <div className="flex items-center gap-2">
        {column.key === 'id' && (
          <Checkbox
            checked={isAllSelected}
            ref={undefined}
            onCheckedChange={onSelectAll}
            className="h-4 w-4"
          />
        )}
        <span className="truncate">{column.label}</span>
      </div>
      
      {!isLast && column.resizable && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
          onMouseDown={(e) => handleResizeStart(e, column.key)}
          title="Resize column"
        />
      )}
    </div>
  ));

  const Cell = React.memo(({ columnIndex, rowIndex, style }: any) => {
    const product = products[rowIndex];
    const column = allColumns[columnIndex];
    
    if (!product) return null;
    
    // Handle clear button column (last column)
    if (columnIndex >= allColumns.length) {
      const cellStyle = {
        ...style,
        borderRight: '1px solid hsl(var(--border))',
        borderBottom: '1px solid hsl(var(--border))',
        backgroundColor: 'hsl(var(--card))',
      };
      
      const clearAllMappings = () => {
        const clearedProduct = {
          ...product,
          category: undefined,
          subcategory: undefined,
          bigC: undefined,
          smallC: undefined,
          segment: undefined,
          subSegment: undefined
        };
        onProductUpdate(product.id, clearedProduct);
      };

      return (
        <div style={cellStyle} className="flex items-center justify-center px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllMappings}
            className="h-8 w-8 p-0 hover:bg-destructive/10 rounded-md"
            title="Clear all mappings"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      );
    }
    
    if (!column) return null;

    const isFrozen = column.frozen;
    const cellStyle = {
      ...style,
      borderRight: '1px solid hsl(var(--border))',
      borderBottom: '1px solid hsl(var(--border))',
      backgroundColor: isFrozen ? 'hsl(var(--background))' : 'hsl(var(--card))',
      zIndex: isFrozen ? 10 : 1,
    };

    // Selection checkbox for ID column
    if (column.key === 'id') {
      const isEditing = editingCell?.rowId === product.id && editingCell?.columnKey === column.key;
      
      return (
        <div style={cellStyle} className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedProducts.has(product.id)}
            ref={undefined}
            onCheckedChange={(checked) => onProductSelect(product.id, !!checked)}
            className="h-4 w-4 shrink-0"
          />
          <input 
            className="text-xs p-1 border rounded bg-background text-foreground flex-1 min-w-0 focus:ring-2 focus:ring-primary/50 focus:border-primary" 
            value={product.id} 
            onChange={(e) => onProductUpdate(product.id, { ...product, id: e.target.value })}
            onFocus={() => setEditingCell({rowId: product.id, columnKey: column.key})}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                setEditingCell(null);
                e.currentTarget.blur();
              }
            }}
            title={product.id}
            autoFocus={isEditing}
          />
        </div>
      );
    }

    // Editable text fields for frozen columns
    if (isFrozen && column.editable) {
      const value = product[column.key as keyof Product] || '';
      const isEditing = editingCell?.rowId === product.id && editingCell?.columnKey === column.key;
      
      return (
        <div style={cellStyle} className="flex items-center px-2">
          <input 
            className="text-xs p-1 border rounded bg-background text-foreground w-full min-w-0 focus:ring-2 focus:ring-primary/50 focus:border-primary" 
            value={value as string} 
            onChange={(e) => onProductUpdate(product.id, { ...product, [column.key]: e.target.value })}
            onFocus={() => setEditingCell({rowId: product.id, columnKey: column.key})}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                setEditingCell(null);
                e.currentTarget.blur();
              }
            }}
            title={value as string}
            autoFocus={isEditing}
          />
        </div>
      );
    }

    // Classification dropdowns for scrollable columns
    if (!isFrozen) {
      const currentSelections = {
        category: product.category,
        subcategory: product.subcategory,
        bigC: product.bigC,
        smallC: product.smallC,
        segment: product.segment,
        subSegment: product.subSegment
      };

      const handleClassificationChange = (value: string | null) => {
        const updatedProduct = { ...product, [column.key]: value || undefined };
        
        const newSelections = {
          category: updatedProduct.category,
          subcategory: updatedProduct.subcategory,
          bigC: updatedProduct.bigC,
          smallC: updatedProduct.smallC,
          segment: updatedProduct.segment,
          subSegment: updatedProduct.subSegment
        };

        const clearedSelections = hierarchyHelper.clearInvalidSelections(newSelections, column.key as any);
        const autoCompletedSelections = hierarchyHelper.autoCompleteSelections(clearedSelections);

        const finalProduct = {
          ...product,
          ...autoCompletedSelections
        };

        onProductUpdate(product.id, finalProduct);
      };

      return (
        <div style={cellStyle} className="flex items-center px-1">
          <div className="w-full">
            <CascadingSelect
              options={hierarchyHelper.getAvailableOptions(column.key as any, currentSelections)}
              value={product[column.key as keyof Product] as string}
              onChange={handleClassificationChange}
              placeholder=""
              className="h-8 text-xs w-full"
            />
          </div>
        </div>
      );
    }

    return <div style={cellStyle} />;
  });

  const handleScroll = useCallback(({ scrollLeft }: any) => {
    if (headerRef.current && scrollableRef.current) {
      // Sync scrollable header with grid scroll
      scrollableRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-muted/30 border-b">
        <div 
          className="flex"
          style={{ 
            height: HEADER_HEIGHT,
            width: `${layout.totalFrozenWidth + scrollableColumns.reduce((sum, col) => sum + col.width, 0) + 60}px`
          }}
        >
          {/* Frozen header */}
          <div 
            className="flex sticky left-0 z-30 bg-muted/30 border-r-2 border-border shadow-sm"
            style={{ width: layout.totalFrozenWidth }}
          >
            {frozenColumns.map((column, index) => (
              <HeaderCell 
                key={column.key} 
                column={column} 
                isLast={index === frozenColumns.length - 1}
              />
            ))}
          </div>
          
          {/* Scrollable header */}
          <div 
            ref={scrollableRef} 
            className="flex overflow-hidden"
            style={{ width: `${scrollableColumns.reduce((sum, col) => sum + col.width, 0) + 60}px` }}
          >
            {scrollableColumns.map((column, index) => (
              <HeaderCell 
                key={column.key} 
                column={column} 
                isLast={false}
              />
            ))}
            {/* Clear column */}
            <HeaderCell 
              column={{ 
                key: 'clear', 
                label: 'Clear', 
                width: 60, 
                minWidth: 60, 
                resizable: false, 
                editable: false, 
                frozen: false 
              }} 
              isLast={true}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative overflow-auto">
        <Grid
          ref={gridRef}
          columnCount={allColumns.length + 1} // +1 for clear column
          rowCount={products.length}
          columnWidth={getColumnWidth}
          rowHeight={getRowHeight}
          height={Math.min(600, products.length * ROW_HEIGHT)}
          width={layout.totalFrozenWidth + scrollableColumns.reduce((sum, col) => sum + col.width, 0) + 60}
          onScroll={handleScroll}
          style={{ 
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};

export default FrozenTable;