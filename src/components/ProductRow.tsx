import React from 'react';
import { Product, ClassificationLevel, FilterState } from '../types/mapping';
import { HierarchyHelper } from '../utils/hierarchyHelper';
import CascadingSelect from './CascadingSelect';

interface ProductRowProps {
  product: Product;
  hierarchyHelper: HierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  isEven: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  hierarchyHelper,
  onProductUpdate,
  isEven
}) => {
  const classifications: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];

  const getCurrentSelections = (): FilterState => ({
    category: product.category,
    subcategory: product.subcategory,
    bigC: product.bigC,
    smallC: product.smallC,
    segment: product.segment,
    subSegment: product.subSegment
  });

  const handleClassificationChange = (level: ClassificationLevel, value: string | null) => {
    let updatedProduct = { ...product, [level]: value || undefined };
    
    // Clear invalid selections and auto-complete
    const currentSelections = {
      category: updatedProduct.category,
      subcategory: updatedProduct.subcategory,
      bigC: updatedProduct.bigC,
      smallC: updatedProduct.smallC,
      segment: updatedProduct.segment,
      subSegment: updatedProduct.subSegment
    };

    // Clear invalid selections
    const clearedSelections = hierarchyHelper.clearInvalidSelections(currentSelections, level);
    
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
  };

  const getOptionsForLevel = (level: ClassificationLevel) => {
    return hierarchyHelper.getAvailableOptions(level, getCurrentSelections());
  };

  const isComplete = classifications.every(level => product[level]);

  return (
    <tr className={`
      border-b transition-colors duration-200
      ${isEven ? 'bg-mapping-row' : 'bg-mapping-row-hover'}
      hover:bg-mapping-row-hover
      ${isComplete ? 'border-l-4 border-l-success' : ''}
    `}>
      <td className="px-4 py-3 text-sm font-medium text-foreground max-w-xs">
        <div className="truncate" title={product.title}>
          {product.title}
        </div>
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
};

export default ProductRow;