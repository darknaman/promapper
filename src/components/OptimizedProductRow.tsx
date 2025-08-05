import React, { memo, useMemo, useCallback } from 'react';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import CascadingSelect from './CascadingSelect';

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

  const isComplete = useMemo(() => 
    classifications.every(level => product[level]), [classifications, product]);

  return (
    <div className={`flex gap-2 p-1 border-b ${isComplete ? 'bg-green-50' : ''}`}>
      <input 
        className="w-20 text-xs p-1 border rounded bg-background text-foreground min-w-16" 
        value={product.id} 
        onChange={(e) => onProductUpdate(product.id, { ...product, id: e.target.value })}
        title={product.id}
      />
      <input 
        className="w-40 text-xs p-1 border rounded bg-background text-foreground min-w-32" 
        value={product.title} 
        onChange={(e) => onProductUpdate(product.id, { ...product, title: e.target.value })}
        title={product.title}
      />
      <input 
        className="w-24 text-xs p-1 border rounded bg-background text-foreground min-w-20" 
        value={product.brand || ''} 
        onChange={(e) => onProductUpdate(product.id, { ...product, brand: e.target.value })}
        title={product.brand || ''}
      />
      <input 
        className="w-40 text-xs p-1 border rounded bg-background text-foreground min-w-32" 
        value={product.url || ''} 
        onChange={(e) => onProductUpdate(product.id, { ...product, url: e.target.value })}
        title={product.url || ''}
      />
      
      {classifications.map((level) => (
        <div key={level} className="w-28 min-w-24">
          <CascadingSelect
            options={hierarchyHelper.getAvailableOptions(level, currentSelections)}
            value={product[level]}
            onChange={(value) => handleClassificationChange(level, value)}
            placeholder=""
            className="h-8"
          />
        </div>
      ))}
    </div>
  );
});

OptimizedProductRow.displayName = 'OptimizedProductRow';

export default OptimizedProductRow;