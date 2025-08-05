import React, { memo, useMemo, useCallback } from 'react';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import CascadingSelect from './CascadingSelect';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface OptimizedProductRowProps {
  product: Product;
  hierarchyHelper: OptimizedHierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  frozenColumns: Array<{
    key: string;
    title: string;
    width: number;
    hasCheckbox?: boolean;
  }>;
  scrollableColumns: Array<{
    key: string;
    title: string;
    width: number;
    hasCheckbox?: boolean;
  }>;
}

const OptimizedProductRow: React.FC<OptimizedProductRowProps> = memo(({
  product,
  hierarchyHelper,
  onProductUpdate,
  frozenColumns,
  scrollableColumns
}) => {
  const classifications: ClassificationLevel[] = useMemo(() => 
    ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'], []);

  const currentSelections = useMemo((): FilterState => ({
    category: product.category,
    subcategory: product.subcategory,
    bigC: product.bigC,
    smallC: product.smallC,
    segment: product.segment,
    subSegment: product.subSegment
  }), [product]);

  const handleClassificationChange = useCallback((level: ClassificationLevel, value: string | null) => {
    const updatedProduct = { ...product, [level]: value || undefined };
    
    // Apply hierarchy logic
    const newSelections = {
      category: updatedProduct.category,
      subcategory: updatedProduct.subcategory,
      bigC: updatedProduct.bigC,
      smallC: updatedProduct.smallC,
      segment: updatedProduct.segment,
      subSegment: updatedProduct.subSegment
    };

    const clearedSelections = hierarchyHelper.clearInvalidSelections(newSelections, level);
    const autoCompletedSelections = hierarchyHelper.autoCompleteSelections(clearedSelections);

    const finalProduct = {
      ...product,
      category: autoCompletedSelections.category,
      subcategory: autoCompletedSelections.subcategory,
      bigC: autoCompletedSelections.bigC,
      smallC: autoCompletedSelections.smallC,
      segment: autoCompletedSelections.segment,
      subSegment: autoCompletedSelections.subSegment
    };

    onProductUpdate(product.id, finalProduct);
  }, [product, hierarchyHelper, onProductUpdate]);

  const clearAllMappings = useCallback(() => {
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
  }, [product, onProductUpdate]);

  const isComplete = useMemo(() => 
    classifications.every(level => product[level]), [classifications, product]);

  const frozenGridCols = useMemo(() => {
    return frozenColumns.map(col => `${col.width}px`).join(' ');
  }, [frozenColumns]);

  const scrollableGridCols = useMemo(() => {
    return scrollableColumns.map(col => `${col.width}px`).join(' ');
  }, [scrollableColumns]);

  const renderFrozenContent = () => (
    <>
      {/* Product ID */}
      <div className="text-xs text-muted-foreground font-mono truncate" title={product.id}>
        {product.id}
      </div>
      
      {/* Product Title */}
      <div className="font-medium truncate" title={product.title}>
        {product.title}
      </div>
      
      {/* Product Brand */}
      <div className="text-muted-foreground truncate" title={product.brand || ''}>
        {product.brand || '-'}
      </div>
      
      {/* Product URL */}
      <div className="text-xs text-muted-foreground truncate" title={product.url || ''}>
        {product.url ? (
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
            {product.url}
          </a>
        ) : (
          '-'
        )}
      </div>
    </>
  );

  const renderScrollableContent = () => (
    <>
      {/* Classification levels */}
      {classifications.map((level) => (
        <div key={level} className="min-w-0">
          <CascadingSelect
            value={currentSelections[level] || ''}
            options={hierarchyHelper.getAvailableOptions(level, currentSelections)}
            onChange={(value) => handleClassificationChange(level, value || '')}
            placeholder={`Select ${level}`}
          />
        </div>
      ))}

      {/* Clear button */}
      <div className="flex justify-center">
        <Button
          size="sm"
          variant="ghost"
          onClick={clearAllMappings}
          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
          title="Clear all mappings"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </>
  );

  return (
    <div className="border-b hover:bg-muted/50 flex">
      {/* Frozen columns */}
      <div className="flex-shrink-0 p-4">
        <div className="grid gap-2 items-center text-sm" style={{ gridTemplateColumns: frozenGridCols }}>
          {renderFrozenContent()}
        </div>
      </div>
      
      {/* Scrollable columns */}
      <div className="flex-1 p-4">
        <div className="grid gap-2 items-center text-sm" style={{ gridTemplateColumns: scrollableGridCols }}>
          {renderScrollableContent()}
        </div>
      </div>
    </div>
  );
});

OptimizedProductRow.displayName = 'OptimizedProductRow';

export default OptimizedProductRow;