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
}

const OptimizedProductRow: React.FC<OptimizedProductRowProps> = memo(({
  product,
  hierarchyHelper,
  onProductUpdate
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

  return (
    <div className={`grid gap-2 p-1 border-b ${isComplete ? 'bg-green-50' : ''}`} style={{ gridTemplateColumns: 'var(--col-widths, 80px 160px 96px 160px 112px 112px 96px 96px 96px 112px 40px)' }}>
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground" 
        value={product.id} 
        onChange={(e) => onProductUpdate(product.id, { ...product, id: e.target.value })}
        title={product.id}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground" 
        value={product.title} 
        onChange={(e) => onProductUpdate(product.id, { ...product, title: e.target.value })}
        title={product.title}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground" 
        value={product.brand || ''} 
        onChange={(e) => onProductUpdate(product.id, { ...product, brand: e.target.value })}
        title={product.brand || ''}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground" 
        value={product.url || ''} 
        onChange={(e) => onProductUpdate(product.id, { ...product, url: e.target.value })}
        title={product.url || ''}
      />
      
      {classifications.map((level) => (
        <div key={level}>
          <CascadingSelect
            options={hierarchyHelper.getAvailableOptions(level, currentSelections)}
            value={product[level]}
            onChange={(value) => handleClassificationChange(level, value)}
            placeholder=""
            className="h-8"
          />
        </div>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllMappings}
        className="h-8 w-8 p-0 hover:bg-destructive/10"
        title="Clear all mappings"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
});

OptimizedProductRow.displayName = 'OptimizedProductRow';

export default OptimizedProductRow;