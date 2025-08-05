import React, { useState, useMemo, useCallback } from 'react';
import { Product } from '../types/mapping';
import { BatchEditFormData, ProductTableLayout } from '../types/batchEdit';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import FrozenTable from './FrozenTable';
import BatchEditForm from './BatchEditForm';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { useToast } from './ui/use-toast';
import { Search, Download, Filter, Edit3, CheckSquare, X } from 'lucide-react';

interface VirtualizedMappingTableProps {
  products: Product[];
  hierarchyHelper: OptimizedHierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  onExport: () => void;
}

const ROW_HEIGHT = 48; // Reduced for better performance

const VirtualizedMappingTable: React.FC<VirtualizedMappingTableProps> = ({
  products,
  hierarchyHelper,
  onProductUpdate,
  onExport
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  
  const [layout, setLayout] = useState<ProductTableLayout>({
    frozenColumns: ['id', 'title', 'brand', 'url'],
    scrollableColumns: ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'],
    columnWidths: {
      id: 80,
      title: 160,
      brand: 120,
      url: 160,
      category: 112,
      subcategory: 112,
      bigC: 96,
      smallC: 96,
      segment: 96,
      subSegment: 112,
    },
    minColumnWidths: {
      id: 40,
      title: 100,
      brand: 100,
      url: 120,
      category: 80,
      subcategory: 80,
      bigC: 60,
      smallC: 60,
      segment: 60,
      subSegment: 80,
    },
    totalFrozenWidth: 520, // id + title + brand + url
    totalScrollableWidth: 624 // category + subcategory + bigC + smallC + segment + subSegment
  });

  // Debounce search to prevent UI freezing
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredProducts = useMemo(() => {
    // Early return for empty search
    if (!debouncedSearchTerm && !showOnlyIncomplete) return products;
    
    const searchLower = debouncedSearchTerm.toLowerCase();
    const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    const result: Product[] = [];
    
    // Process in chunks to prevent UI blocking
    const chunkSize = Math.min(1000, products.length);
    
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      
      for (const product of chunk) {
        // Fast search check
        const matchesSearch = !debouncedSearchTerm || 
          product.title.toLowerCase().includes(searchLower) ||
          (product.brand && product.brand.toLowerCase().includes(searchLower)) ||
          product.id.toLowerCase().includes(searchLower);

        if (!matchesSearch) continue;

        // Fast incomplete check
        if (showOnlyIncomplete) {
          let isIncomplete = false;
          for (const level of levels) {
            if (!product[level as keyof Product]) {
              isIncomplete = true;
              break;
            }
          }
          if (!isIncomplete) continue;
        }

        result.push(product);
      }
    }
    
    return result;
  }, [products, debouncedSearchTerm, showOnlyIncomplete]);

  const completedCount = useMemo(() => {
    return products.filter(product => {
      const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
      return levels.every(level => product[level as keyof Product]);
    }).length;
  }, [products]);

  const completionPercentage = products.length > 0 ? Math.round((completedCount / products.length) * 100) : 0;

  const handleColumnResize = useCallback((column: string, width: number) => {
    setLayout(prev => {
      const newColumnWidths = {
        ...prev.columnWidths,
        [column]: Math.max(width, prev.minColumnWidths[column] || 60)
      };
      
      // Recalculate total frozen width if frozen column was resized
      const totalFrozenWidth = prev.frozenColumns.reduce((sum, col) => 
        sum + newColumnWidths[col], 0
      );
      
      // Recalculate total scrollable width
      const totalScrollableWidth = prev.scrollableColumns.reduce((sum, col) => 
        sum + newColumnWidths[col], 0
      );
      
      return {
        ...prev,
        columnWidths: newColumnWidths,
        totalFrozenWidth,
        totalScrollableWidth
      };
    });
  }, []);

  // Product selection handlers
  const handleProductSelect = useCallback((productId: string, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }, [filteredProducts]);

  const handleBatchUpdate = useCallback(async (updates: BatchEditFormData) => {
    const selectedProductList = filteredProducts.filter(p => selectedProducts.has(p.id));
    
    // Apply updates to each selected product
    for (const product of selectedProductList) {
      const updatedProduct = { ...product, ...updates };
      onProductUpdate(product.id, updatedProduct);
    }
    
    // Clear selection and show success message
    setSelectedProducts(new Set());
    toast({
      title: "Batch Update Complete",
      description: `Updated ${selectedProductList.length} products successfully.`,
    });
  }, [filteredProducts, selectedProducts, onProductUpdate, toast]);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const selectedProductList = useMemo(() => 
    filteredProducts.filter(p => selectedProducts.has(p.id)), 
    [filteredProducts, selectedProducts]
  );

  if (products.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Products to Map</h3>
            <p className="text-muted-foreground">Upload a products CSV file to start mapping classifications.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and progress */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Product Classification</h2>
            <p className="text-muted-foreground">
              {completedCount} of {products.length} products mapped
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="incomplete-filter"
                checked={showOnlyIncomplete}
                onCheckedChange={setShowOnlyIncomplete}
              />
              <label htmlFor="incomplete-filter" className="text-sm font-medium">
                Show incomplete only
              </label>
            </div>
            
            {selectedProducts.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {selectedProducts.size} selected
                </Badge>
                <Button
                  onClick={() => setShowBatchEdit(true)}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Batch Edit
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            )}
            
            <Button onClick={onExport} variant="outline" className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by title, brand, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Progress</span>
            <Badge variant="outline">{completionPercentage}% complete</Badge>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </div>

      {/* Advanced table with freeze panes */}
      {filteredProducts.length > 0 ? (
        <FrozenTable
          products={filteredProducts}
          hierarchyHelper={hierarchyHelper}
          onProductUpdate={onProductUpdate}
          selectedProducts={selectedProducts}
          onProductSelect={handleProductSelect}
          onSelectAll={handleSelectAll}
          layout={layout}
          onColumnResize={handleColumnResize}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No products found matching your search criteria.</p>
        </Card>
      )}

      {/* Batch Edit Form */}
      <BatchEditForm
        selectedProducts={selectedProductList}
        hierarchyHelper={hierarchyHelper}
        onBatchUpdate={handleBatchUpdate}
        onClose={() => setShowBatchEdit(false)}
        isOpen={showBatchEdit}
      />
    </div>
  );
};

export default VirtualizedMappingTable;