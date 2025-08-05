import React, { useState, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Product } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import OptimizedProductRow from './OptimizedProductRow';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Search, Download, Filter } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const product = filteredProducts[index];
    return (
      <div style={style}>
        <OptimizedProductRow
          product={product}
          hierarchyHelper={hierarchyHelper}
          onProductUpdate={onProductUpdate}
        />
      </div>
    );
  }, [filteredProducts, hierarchyHelper, onProductUpdate]);

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

      {/* Virtualized table */}
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/30 p-4">
          <div className="grid grid-cols-10 gap-4 text-sm font-medium text-foreground">
            <div>ID</div>
            <div className="col-span-2">Title</div>
            <div>Brand</div>
            <div className="col-span-2">URL</div>
            <div>Category</div>
            <div>Subcategory</div>
            <div>Big C</div>
            <div>Small C</div>
            <div>Segment</div>
            <div>Sub-segment</div>
          </div>
        </div>
        
        {filteredProducts.length > 0 ? (
          <List
            height={Math.min(600, filteredProducts.length * ROW_HEIGHT)}
            itemCount={filteredProducts.length}
            itemSize={ROW_HEIGHT}
            width="100%"
          >
            {Row}
          </List>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No products found matching your search criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VirtualizedMappingTable;