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

  const getColumnWidth = useCallback((columnIndex: number) => {
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

  const HeaderCell = useCallback(({ column, isLast }: { column: ColumnConfig; isLast: boolean }) => (
    <div 
      className="flex items-center justify-between h-full px-2 text-sm font-medium relative group border-r"
      style={{ width: column.width }}
    >
      <div className="flex items-center gap-2">
        {column.key === 'id' && (
          <Checkbox
            checked={selectedProducts.size === products.length && products.length > 0}
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
  ), [selectedProducts.size, products.length, onSelectAll, handleResizeStart]);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const product = products[rowIndex];
    const column = allColumns[columnIndex];
    
    if (!product || !column) return null;

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
      return (
        <div style={cellStyle} className="flex items-center gap-2 px-2">
          <Checkbox
            checked={selectedProducts.has(product.id)}
            onCheckedChange={(checked) => onProductSelect(product.id, !!checked)}
            className="h-4 w-4"
          />
          <input 
            className="text-xs p-1 border rounded bg-background text-foreground flex-1 min-w-0" 
            value={product.id} 
            onChange={(e) => onProductUpdate(product.id, { ...product, id: e.target.value })}
            title={product.id}
          />
        </div>
      );
    }

    // Editable text fields for frozen columns
    if (isFrozen && column.editable) {
      const value = product[column.key as keyof Product] || '';
      return (
        <div style={cellStyle} className="flex items-center px-2">
          <input 
            className="text-xs p-1 border rounded bg-background text-foreground w-full min-w-0" 
            value={value as string} 
            onChange={(e) => onProductUpdate(product.id, { ...product, [column.key]: e.target.value })}
            title={value as string}
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
          <CascadingSelect
            options={hierarchyHelper.getAvailableOptions(column.key as any, currentSelections)}
            value={product[column.key as keyof Product] as string}
            onChange={handleClassificationChange}
            placeholder=""
            className="h-8 text-xs"
          />
        </div>
      );
    }

    // Clear button column
    if (column.key === 'clear') {
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
        <div style={cellStyle} className="flex items-center justify-center px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllMappings}
            className="h-6 w-6 p-0 hover:bg-destructive/10"
            title="Clear all mappings"
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      );
    }

    return <div style={cellStyle} />;
  }, [products, allColumns, selectedProducts, onProductSelect, onProductUpdate, hierarchyHelper]);

  const handleScroll = useCallback(({ scrollLeft }: any) => {
    if (headerRef.current) {
      const frozenWidth = layout.totalFrozenWidth;
      headerRef.current.scrollLeft = scrollLeft;
      
      // Only scroll the scrollable portion
      if (scrollableRef.current) {
        scrollableRef.current.scrollLeft = Math.max(0, scrollLeft - frozenWidth);
      }
    }
  }, [layout.totalFrozenWidth]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header */}
      <div 
        ref={headerRef}
        className="flex border-b bg-muted/30 sticky top-0 z-20"
        style={{ height: HEADER_HEIGHT }}
      >
        {/* Frozen header */}
        <div 
          ref={frozenRef}
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
        <div ref={scrollableRef} className="flex overflow-hidden">
          {scrollableColumns.map((column, index) => (
            <HeaderCell 
              key={column.key} 
              column={column} 
              isLast={index === scrollableColumns.length - 1}
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

      {/* Grid */}
      <div className="relative">
        <Grid
          ref={gridRef}
          columnCount={allColumns.length + 1} // +1 for clear column
          rowCount={products.length}
          columnWidth={getColumnWidth}
          rowHeight={getRowHeight}
          height={Math.min(600, products.length * ROW_HEIGHT)}
          width={window.innerWidth || 1200}
          onScroll={handleScroll}
          style={{ overflowX: 'auto' }}
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
};

export default FrozenTable;