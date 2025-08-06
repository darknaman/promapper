import React, { memo, useMemo, useCallback, useState } from 'react';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import CascadingSelect from './CascadingSelect';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface OptimizedProductRowProps {
  product: Product;
  hierarchyHelper: OptimizedHierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  columnWidths: {
    id: number;
    title: number;
    brand: number;
    url: number;
    category: number;
    subcategory: number;
    bigC: number;
    smallC: number;
    segment: number;
    subSegment: number;
    clear: number;
  };
}

const OptimizedProductRow: React.FC<OptimizedProductRowProps> = memo(({
  product,
  hierarchyHelper,
  onProductUpdate,
  columnWidths
}) => {
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  
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

  const handleInputChange = useCallback((field: keyof Product, value: string) => {
    onProductUpdate(product.id, { ...product, [field]: value });
  }, [product.id, onProductUpdate]);

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

  const gridTemplateColumns = useMemo(() => {
    return `${columnWidths.id}px ${columnWidths.title}px ${columnWidths.brand}px ${columnWidths.url}px ${columnWidths.category}px ${columnWidths.subcategory}px ${columnWidths.bigC}px ${columnWidths.smallC}px ${columnWidths.segment}px ${columnWidths.subSegment}px ${columnWidths.clear}px`;
  }, [columnWidths]);

  return (
    <div className={`grid gap-2 p-1 border-b ${isComplete ? 'bg-green-50/30' : ''}`} style={{ gridTemplateColumns }}>
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground transition-colors" 
        value={product.id} 
        onChange={(e) => handleInputChange('id', e.target.value)}
        title={product.id}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground transition-colors" 
        value={product.title} 
        onChange={(e) => handleInputChange('title', e.target.value)}
        title={product.title}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground transition-colors" 
        value={product.brand || ''} 
        onChange={(e) => handleInputChange('brand', e.target.value)}
        title={product.brand || ''}
      />
      <input 
        className="text-xs p-1 border rounded bg-background text-foreground transition-colors" 
        value={product.url || ''} 
        onChange={(e) => handleInputChange('url', e.target.value)}
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
        className="h-8 w-8 p-0 hover:bg-destructive/10 transition-colors"
        title="Clear all mappings"
      >
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
});

OptimizedProductRow.displayName = 'OptimizedProductRow';

export default OptimizedProductRow;