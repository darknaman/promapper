import React, { useState, useMemo, useCallback } from 'react';
import { Resizable } from 'react-resizable';
import { Product } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import ProductRow from './ProductRow';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Download, Search, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import 'react-resizable/css/styles.css';

interface ResizableTableProps {
  products: Product[];
  hierarchyHelper: OptimizedHierarchyHelper;
  onProductUpdate: (productId: string, updatedProduct: Product) => void;
  onExport: () => void;
}

interface ColumnDef {
  key: string;
  title: string;
  width: number;
  minWidth: number;
}

const ResizableTable: React.FC<ResizableTableProps> = ({
  products,
  hierarchyHelper,
  onProductUpdate,
  onExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'id', title: 'Product ID', width: 120, minWidth: 100 },
    { key: 'title', title: 'Product Title', width: 200, minWidth: 150 },
    { key: 'brand', title: 'Brand', width: 120, minWidth: 100 },
    { key: 'url', title: 'URL', width: 200, minWidth: 150 },
    { key: 'category', title: 'Category', width: 150, minWidth: 120 },
    { key: 'subcategory', title: 'Subcategory', width: 150, minWidth: 120 },
    { key: 'bigC', title: 'Big C', width: 150, minWidth: 120 },
    { key: 'smallC', title: 'Small C', width: 150, minWidth: 120 },
    { key: 'segment', title: 'Segment', width: 150, minWidth: 120 },
    { key: 'subSegment', title: 'Sub-segment', width: 150, minWidth: 120 }
  ]);

  const handleResize = useCallback((index: number, { size }: { size: { width: number } }) => {
    setColumns(prev => prev.map((col, i) => 
      i === index ? { ...col, width: Math.max(size.width, col.minWidth) } : col
    ));
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showOnlyIncomplete) {
      filtered = filtered.filter(product => {
        const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
        return !levels.every(level => product[level as keyof Product]);
      });
    }

    return filtered;
  }, [products, searchTerm, showOnlyIncomplete]);

  const completedCount = products.filter(product => {
    const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    return levels.every(level => product[level as keyof Product]);
  }).length;

  const completionPercentage = products.length > 0 
    ? Math.round((completedCount / products.length) * 100) 
    : 0;

  if (products.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Products to Map</h3>
            <p className="text-muted-foreground">
              Upload a products CSV file to start mapping classifications.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Product Classification Mapping</h2>
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">
                  {completedCount} of {products.length} products mapped ({completionPercentage}%)
                </span>
              </div>
              {filteredProducts.length !== products.length && (
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Showing {filteredProducts.length} products
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
              className={showOnlyIncomplete ? 'bg-accent' : ''}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {showOnlyIncomplete ? 'Show All' : 'Incomplete Only'}
            </Button>
            
            <Button
              onClick={onExport}
              disabled={completedCount === 0}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Mapping Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Resizable table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: columns.reduce((sum, col) => sum + col.width, 0) }}>
            <thead className="bg-data-grid-header border-b">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.key}
                    className="px-3 py-3 text-left text-xs font-medium text-foreground uppercase tracking-wider border-r border-border/20 last:border-r-0"
                    style={{ width: column.width }}
                  >
                    <Resizable
                      width={column.width}
                      height={0}
                      onResize={(e, data) => handleResize(index, data)}
                      resizeHandles={['e']}
                      draggableOpts={{ enableUserSelectHack: false }}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.title}</span>
                        <div className="w-2 h-4 cursor-col-resize opacity-50 hover:opacity-100 transition-opacity" />
                      </div>
                    </Resizable>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  hierarchyHelper={hierarchyHelper}
                  onProductUpdate={onProductUpdate}
                  isEven={index % 2 === 0}
                  columnWidths={columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width }), {})}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center">
            <div className="space-y-4">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Products Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ResizableTable;