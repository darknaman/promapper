import React, { memo, useMemo, useCallback } from 'react';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { HierarchyHelper } from '../utils/hierarchyHelper';
import CascadingSelect from './CascadingSelect';
import { Input } from './ui/input';

interface ProductRowProps {
  product: Product;
  hierarchyHelper: HierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  isEven: boolean;
}

const ProductRow: React.FC<ProductRowProps> = memo(({
  product,
  hierarchyHelper,
  onProductUpdate,
  isEven
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
  }), [product.category, product.subcategory, product.bigC, product.smallC, product.segment, product.subSegment]);

  const handleProductFieldChange = useCallback((field: keyof Product, value: string) => {
    const updatedProduct = { ...product, [field]: value };
    onProductUpdate(product.id, updatedProduct);
  }, [product, onProductUpdate]);

  const handleClassificationChange = useCallback((level: ClassificationLevel, value: string | null) => {
    let updatedProduct = { ...product, [level]: value || undefined };
    
    // Clear invalid selections and auto-complete
    const newSelections = {
      category: updatedProduct.category,
      subcategory: updatedProduct.subcategory,
      bigC: updatedProduct.bigC,
      smallC: updatedProduct.smallC,
      segment: updatedProduct.segment,
      subSegment: updatedProduct.subSegment
    };

    // Clear invalid selections
    const clearedSelections = hierarchyHelper.clearInvalidSelections(newSelections, level);
    
    // Auto-complete when possible
    const autoCompletedSelections = hierarchyHelper.autoCompleteSelections(clearedSelections);

    updatedProduct = {
      ...updatedProduct,
      category: autoCompletedSelections.category,
      subcategory: autoCompletedSelections.subcategory,
      bigC: autoCompletedSelections.bigC,
      smallC: autoCompletedSelections.smallC,
      segment: autoCompletedSelections.segment,
      subSegment: autoCompletedSelections.subSegment
    };

    onProductUpdate(product.id, updatedProduct);
  }, [product, hierarchyHelper, onProductUpdate]);

  const getOptionsForLevel = useCallback((level: ClassificationLevel) => {
    return hierarchyHelper.getAvailableOptions(level, currentSelections);
  }, [hierarchyHelper, currentSelections]);

  const isComplete = useMemo(() => 
    classifications.every(level => product[level]), 
    [classifications, product.category, product.subcategory, product.bigC, product.smallC, product.segment, product.subSegment]
  );

  return (
    <tr className={`
      border-b transition-colors duration-200
      ${isEven ? 'bg-mapping-row' : 'bg-mapping-row-hover'}
      hover:bg-mapping-row-hover
      ${isComplete ? 'border-l-4 border-l-success' : ''}
    `}>
      <td className="px-3 py-3">
        <Input
          value={product.id}
          onChange={(e) => handleProductFieldChange('id', e.target.value)}
          className="min-w-[120px] h-8 text-sm"
          placeholder="Product ID"
        />
      </td>
      
      <td className="px-3 py-3">
        <Input
          value={product.title}
          onChange={(e) => handleProductFieldChange('title', e.target.value)}
          className="min-w-[200px] h-8 text-sm"
          placeholder="Product Title"
        />
      </td>
      
      <td className="px-3 py-3">
        <Input
          value={product.brand || ''}
          onChange={(e) => handleProductFieldChange('brand', e.target.value)}
          className="min-w-[120px] h-8 text-sm"
          placeholder="Brand"
        />
      </td>
      
      <td className="px-3 py-3">
        <Input
          value={product.url || ''}
          onChange={(e) => handleProductFieldChange('url', e.target.value)}
          className="min-w-[200px] h-8 text-sm"
          placeholder="Product URL"
        />
      </td>
      
      {classifications.map((level) => (
        <td key={level} className="px-2 py-3">
          <CascadingSelect
            options={getOptionsForLevel(level)}
            value={product[level]}
            onChange={(value) => handleClassificationChange(level, value)}
            placeholder={`Select ${level}`}
            className="min-w-[150px]"
          />
        </td>
      ))}
    </tr>
  );
});

ProductRow.displayName = 'ProductRow';

export default ProductRow;