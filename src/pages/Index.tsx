import React, { useState, useMemo } from 'react';
import { Product, HierarchyRule } from '../types/mapping';
import { HierarchyHelper } from '../utils/hierarchyHelper';
import FileUpload from '../components/FileUpload';
import MappingTable from '../components/MappingTable';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Shuffle, Database, Download, RotateCcw } from 'lucide-react';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);
  const [productsFileName, setProductsFileName] = useState<string>('');
  const [hierarchyFileName, setHierarchyFileName] = useState<string>('');
  const { toast } = useToast();

  const hierarchyHelper = useMemo(() => {
    return new HierarchyHelper(hierarchyRules);
  }, [hierarchyRules]);

  const handleProductsUpload = (data: any[], fileName: string) => {
    try {
      const processedProducts: Product[] = data.map((row, index) => ({
        id: row.id || row.ID || `product-${index}`,
        title: row.title || row.Title || '',
        brand: row.brand || row.Brand || '',
        url: row.url || row.URL || '',
        category: undefined,
        subcategory: undefined,
        bigC: undefined,
        smallC: undefined,
        segment: undefined,
        subSegment: undefined
      }));

      setProducts(processedProducts);
      setProductsFileName(fileName);
      
      toast({
        title: "Products loaded successfully",
        description: `Loaded ${processedProducts.length} products from ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Error processing products",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleHierarchyUpload = (data: any[], fileName: string) => {
    try {
      const processedRules: HierarchyRule[] = data.map(row => ({
        category: row.category || '',
        subcategory: row.subcategory || '',
        bigC: row.bigC || '',
        smallC: row.smallC || '',
        segment: row.segment || '',
        subSegment: row.subSegment || ''
      }));

      setHierarchyRules(processedRules);
      setHierarchyFileName(fileName);
      
      toast({
        title: "Hierarchy rules loaded successfully",
        description: `Loaded ${processedRules.length} classification rules from ${fileName}`,
      });
    } catch (error) {
      toast({
        title: "Error processing hierarchy rules",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    }
  };

  const handleProductUpdate = (productId: string, updatedProduct: Product) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId ? updatedProduct : product
      )
    );
  };

  const handleExport = () => {
    if (products.length === 0) return;

    const csvHeaders = [
      'Product ID',
      'Product Title',
      'Brand',
      'URL',
      'Category',
      'Subcategory',
      'Big C',
      'Small C',
      'Segment',
      'Sub-segment'
    ];

    const csvRows = products.map(product => [
      product.id,
      product.title,
      product.brand || '',
      product.url || '',
      product.category || '',
      product.subcategory || '',
      product.bigC || '',
      product.smallC || '',
      product.segment || '',
      product.subSegment || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `mapped-products-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: "Your mapped products have been downloaded.",
    });
  };

  const generateSampleData = () => {
    // Generate sample hierarchy rules
    const sampleHierarchy: HierarchyRule[] = [
      {
        category: 'Electronics',
        subcategory: 'Mobile Phones',
        bigC: 'Smartphones',
        smallC: 'Premium',
        segment: 'Apple',
        subSegment: 'Flagship'
      },
      {
        category: 'Electronics',
        subcategory: 'Mobile Phones',
        bigC: 'Smartphones',
        smallC: 'Mid-range',
        segment: 'Samsung',
        subSegment: 'Standard'
      },
      {
        category: 'Electronics',
        subcategory: 'Computers',
        bigC: 'Laptops',
        smallC: 'Premium',
        segment: 'Apple',
        subSegment: 'Ultrabook'
      },
      {
        category: 'Electronics',
        subcategory: 'Computers',
        bigC: 'Laptops',
        smallC: 'Gaming',
        segment: 'Gaming',
        subSegment: 'High-end'
      },
      {
        category: 'Clothing',
        subcategory: 'Footwear',
        bigC: 'Sneakers',
        smallC: 'Athletic',
        segment: 'Nike',
        subSegment: 'Running'
      },
      {
        category: 'Clothing',
        subcategory: 'Footwear',
        bigC: 'Sneakers',
        smallC: 'Casual',
        segment: 'Adidas',
        subSegment: 'Lifestyle'
      }
    ];

    // Generate sample products
    const sampleProducts: Product[] = [
      { id: 'P001', title: 'iPhone 15 Pro Max', brand: 'Apple', url: 'https://apple.com/iphone-15-pro', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
      { id: 'P002', title: 'Samsung Galaxy S24', brand: 'Samsung', url: 'https://samsung.com/galaxy-s24', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
      { id: 'P003', title: 'MacBook Air M3', brand: 'Apple', url: 'https://apple.com/macbook-air', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
      { id: 'P004', title: 'ASUS ROG Gaming Laptop', brand: 'ASUS', url: 'https://asus.com/laptops/gaming', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
      { id: 'P005', title: 'Nike Air Max Running Shoes', brand: 'Nike', url: 'https://nike.com/air-max', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
      { id: 'P006', title: 'Adidas Ultraboost Sneakers', brand: 'Adidas', url: 'https://adidas.com/ultraboost', category: undefined, subcategory: undefined, bigC: undefined, smallC: undefined, segment: undefined, subSegment: undefined },
    ];

    setHierarchyRules(sampleHierarchy);
    setProducts(sampleProducts);
    setHierarchyFileName('sample-hierarchy.csv');
    setProductsFileName('sample-products.csv');

    toast({
      title: "Sample data loaded",
      description: "Try out the cascading dropdowns with sample data!",
    });
  };

  const clearAll = () => {
    setProducts([]);
    setHierarchyRules([]);
    setProductsFileName('');
    setHierarchyFileName('');
    
    toast({
      title: "Data cleared",
      description: "All data has been reset.",
    });
  };

  const completedCount = products.filter(product => {
    const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    return levels.every(level => product[level as keyof Product]);
  }).length;

  return (
    <div className="min-h-screen bg-gradient-data">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Product Classification Mapping Tool
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Map product titles to hierarchical categories using cascading dropdowns. 
            Reduce classification errors with intelligent filtering and validation.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={generateSampleData}
            className="hover:bg-accent"
          >
            <Shuffle className="h-4 w-4 mr-2" />
            Load Sample Data
          </Button>
          
          {(products.length > 0 || hierarchyRules.length > 0) && (
            <Button
              variant="outline"
              onClick={clearAll}
              className="hover:bg-destructive/10 text-destructive border-destructive"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All Data
            </Button>
          )}
        </div>

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FileUpload
            title="Upload Products"
            description="CSV file containing product data (ID, title, brand, URL) to be classified"
            expectedHeaders={['id', 'title']}
            onFileUpload={handleProductsUpload}
            uploadedFileName={productsFileName}
          />
          
          <FileUpload
            title="Upload Hierarchy Rules"
            description="CSV file defining valid category relationships and combinations"
            expectedHeaders={['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment']}
            onFileUpload={handleHierarchyUpload}
            uploadedFileName={hierarchyFileName}
          />
        </div>

        {/* Status Cards */}
        {(products.length > 0 || hierarchyRules.length > 0) && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Products Loaded</p>
                  <p className="text-2xl font-bold text-primary">{products.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Shuffle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Hierarchy Rules</p>
                  <p className="text-2xl font-bold text-accent">{hierarchyRules.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Download className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Mapped Products</p>
                  <p className="text-2xl font-bold text-success">{completedCount}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Status Badges */}
        {(products.length > 0 || hierarchyRules.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {products.length > 0 && (
              <Badge variant="outline" className="bg-primary/5">
                {products.length} products ready for mapping
              </Badge>
            )}
            {hierarchyRules.length > 0 && (
              <Badge variant="outline" className="bg-accent/5">
                {hierarchyRules.length} classification rules loaded
              </Badge>
            )}
            {products.length > 0 && hierarchyRules.length > 0 && (
              <Badge variant="outline" className="bg-success/5">
                Cascading dropdowns active
              </Badge>
            )}
          </div>
        )}

        {/* Mapping Interface */}
        {products.length > 0 && hierarchyRules.length > 0 ? (
          <MappingTable
            products={products}
            hierarchyHelper={hierarchyHelper}
            onProductUpdate={handleProductUpdate}
            onExport={handleExport}
          />
        ) : (
          <Card className="p-12 text-center">
            <div className="space-y-6">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Database className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Ready to Start Mapping
                </h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {products.length === 0 && hierarchyRules.length === 0
                    ? 'Upload both files to begin product classification mapping, or try the sample data.'
                    : products.length === 0
                    ? 'Upload a products CSV file to start mapping.'
                    : 'Upload a hierarchy rules CSV file to enable cascading dropdowns.'
                  }
                </p>
              </div>
              {products.length === 0 && hierarchyRules.length === 0 && (
                <Button
                  onClick={generateSampleData}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Try Sample Data
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;