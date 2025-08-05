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
    <div className={`grid grid-cols-10 gap-1 p-1 border-b ${isComplete ? 'bg-green-50' : ''}`}>
      <div className="text-xs truncate p-1" title={product.id}>{product.id}</div>
      <div className="col-span-2 text-xs truncate p-1" title={product.title}>{product.title}</div>
      <div className="text-xs truncate p-1" title={product.brand || ''}>{product.brand}</div>
      <div className="col-span-2 text-xs truncate p-1" title={product.url || ''}>{product.url}</div>
      
      {classifications.map((level) => (
        <div key={level} className="min-w-0">
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