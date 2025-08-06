import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Product, HierarchyRule } from '../types/mapping';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import FileUpload from '../components/FileUpload';
import ProductHierarchyMappingTable from '../components/ProductHierarchyMappingTable';
import { RowData } from '../types/productTable';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { Shuffle, Database, Download, RotateCcw, FileDown, Save, RefreshCw } from 'lucide-react';
import { saveMappingData, loadMappingData, clearMappingData, hasSavedData, getLastSavedTime, AutoSaveManager } from '../utils/mappingPersistence';
import { useCustomColumns } from '../hooks/useCustomColumns';
import { CSVColumnPreviewDialog } from '../components/CSVColumnPreviewDialog';
import logo from '../assets/logo.svg';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [hierarchyRules, setHierarchyRules] = useState<HierarchyRule[]>([]);
  const [productsFileName, setProductsFileName] = useState<string>('');
  const [hierarchyFileName, setHierarchyFileName] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();
  const { customColumns, addColumn, setValue } = useCustomColumns();
  const autoSaveManagerRef = useRef<AutoSaveManager | null>(null);
  
  const [csvPreviewDialog, setCsvPreviewDialog] = useState<{
    isOpen: boolean;
    detectedColumns: Array<{
      name: string;
      dataType: 'text' | 'number';
      sampleValues: string[];
    }>;
    csvData: any[];
    fileName: string;
  }>({
    isOpen: false,
    detectedColumns: [],
    csvData: [],
    fileName: ''
  });

  // Initialize auto-save manager (silent auto-save)
  useEffect(() => {
    autoSaveManagerRef.current = new AutoSaveManager((products, hierarchyRules, productsFileName, hierarchyFileName) => {
      saveMappingData(products, hierarchyRules, productsFileName, hierarchyFileName);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      // No toast for auto-save to avoid spam
    }, false); // Silent auto-save

    return () => {
      autoSaveManagerRef.current?.destroy();
    };
  }, []);

  // Load saved data on component mount
  useEffect(() => {
    const savedData = loadMappingData();
    if (savedData && (savedData.products.length > 0 || savedData.hierarchyRules.length > 0)) {
      setProducts(savedData.products);
      setHierarchyRules(savedData.hierarchyRules);
      setProductsFileName(savedData.productsFileName || '');
      setHierarchyFileName(savedData.hierarchyFileName || '');
      setLastSaved(new Date(savedData.lastSaved));
      
      toast({
        title: "Data restored",
        description: `Loaded ${savedData.products.length} products and ${savedData.hierarchyRules.length} hierarchy rules from previous session.`,
      });
    }
  }, [toast]);

  // Auto-save when data changes
  useEffect(() => {
    if (products.length > 0 || hierarchyRules.length > 0) {
      setHasUnsavedChanges(true);
      autoSaveManagerRef.current?.scheduleSave(products, hierarchyRules, productsFileName, hierarchyFileName);
    }
  }, [products, hierarchyRules, productsFileName, hierarchyFileName]);

  const hierarchyHelper = useMemo(() => {
    const helper = new OptimizedHierarchyHelper(hierarchyRules);
    // Clear cache when rules change for optimal performance
    helper.clearCache();
    return helper;
  }, [hierarchyRules]);

  const detectDataType = (values: any[]): 'text' | 'number' => {
    const sampleValues = values.slice(0, 10).filter(val => val != null && val !== '');
    if (sampleValues.length === 0) return 'text';
    
    const numericCount = sampleValues.filter(val => {
      const num = Number(val);
      return !isNaN(num) && isFinite(num);
    }).length;
    
    return numericCount / sampleValues.length >= 0.7 ? 'number' : 'text';
  };

  const handleProductsUpload = useCallback(async (data: any[], fileName: string) => {
    try {
      console.log('Processing products:', data.length, 'rows');
      
      if (data.length === 0) {
        toast({
          title: "No data found",
          description: "The CSV file appears to be empty.",
          variant: "destructive",
        });
        return;
      }

      // Define core columns that shouldn't be treated as custom columns
      const coreColumns = new Set([
        'id', 'ID', 'title', 'Title', 'name', 'Name', 'brand', 'Brand', 
        'url', 'URL', 'category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'
      ]);

      // Detect new columns
      const csvHeaders = Object.keys(data[0]);
      const existingCustomHeaders = customColumns.map(col => col.name);
      const newHeaders = csvHeaders.filter(header => 
        !coreColumns.has(header) && !existingCustomHeaders.includes(header)
      );
      
      if (newHeaders.length > 0) {
        // Analyze new columns
        const detectedColumns = newHeaders.map(header => {
          const allValues = data.map(row => row[header]).filter(val => val != null);
          const sampleValues = [...new Set(allValues.slice(0, 10))].map(String);
          const dataType = detectDataType(allValues);
          
          return {
            name: header,
            dataType,
            sampleValues
          };
        });

        // Show preview dialog
        setCsvPreviewDialog({
          isOpen: true,
          detectedColumns,
          csvData: data,
          fileName
        });
        
        return; // Wait for user confirmation
      }

      // Process products if no new columns
      await processProductsData(data, fileName);
      
    } catch (error) {
      console.error('Error processing products:', error);
      toast({
        title: "Error processing products",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    }
  }, [toast, customColumns]);

  const processProductsData = useCallback(async (data: any[], fileName: string, selectedNewColumns?: string[]) => {
    try {
      // Define core columns
      const coreColumns = new Set([
        'id', 'ID', 'title', 'Title', 'name', 'Name', 'brand', 'Brand', 
        'url', 'URL', 'category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'
      ]);

      // Add selected new columns first and track their IDs
      const newColumnIds: Record<string, string> = {};
      if (selectedNewColumns && selectedNewColumns.length > 0) {
        console.log('Adding new columns:', selectedNewColumns);
        
        for (const header of selectedNewColumns) {
          const allValues = data.map(row => row[header]).filter(val => val != null);
          const dataType = detectDataType(allValues);
          
          console.log(`Creating column "${header}" with type ${dataType}, sample values:`, allValues.slice(0, 3));
          
          const newColumn = {
            name: header,
            dataType,
            defaultValue: '',
            width: 120
          };
          
          // Add column and get the actual ID
          const columnId = addColumn(newColumn);
          newColumnIds[header] = columnId;
          
          console.log(`Created column "${header}" with ID: ${columnId}`);
        }
        
        // Wait longer for columns to be created and UI to update
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Process products
      const processedProducts: Product[] = [];
      const chunkSize = 100;
      
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        
        const chunkProducts = chunk.map((row, index) => ({
          id: row.id || row.ID || row.productId || row.sku || `product-${i + index + 1}`,
          title: row.title || row.Title || row.name || row.Name || row.productName || '',
          brand: row.brand || row.Brand || '',
          url: row.url || row.URL || row.link || ''
        }));
        
        processedProducts.push(...chunkProducts);
        
        // Yield control
        if (i % (chunkSize * 2) === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      setProducts(processedProducts);
      setProductsFileName(fileName);

      // Map custom column values after products are set
      if (selectedNewColumns && selectedNewColumns.length > 0) {
        console.log('Mapping values for new columns:', selectedNewColumns);
        console.log('Column ID mapping:', newColumnIds);
        console.log('ProcessedProducts length:', processedProducts.length);
        console.log('CSV data length:', data.length);
        
        // Use requestAnimationFrame to ensure DOM updates are complete
        requestAnimationFrame(() => {
          setTimeout(() => {
            console.log('Starting value mapping for custom columns');
            data.forEach((row, index) => {
              const productId = processedProducts[index]?.id;
              if (!productId) {
                console.warn(`No product ID found for row ${index}`);
                return;
              }

              selectedNewColumns.forEach(header => {
                const value = row[header];
                if (value != null && value !== '') {
                  const columnId = newColumnIds[header];
                  if (columnId) {
                    console.log(`Setting value "${value}" for product ${productId}, column ${header} (${columnId})`);
                    setValue(productId, columnId, String(value));
                  } else {
                    console.warn(`Column ID not found for header: ${header}`);
                  }
                }
              });
            });
            console.log('Finished mapping custom column values');
          }, 100);
        });
      }
      
      toast({
        title: "Products loaded successfully",
        description: `Loaded ${processedProducts.length} products from ${fileName}`,
      });

    } catch (error) {
      console.error('Error processing products data:', error);
      toast({
        title: "Error processing products",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    }
  }, [addColumn, setValue, toast]);

  const handleCSVPreviewConfirm = useCallback((selectedColumns: string[]) => {
    processProductsData(csvPreviewDialog.csvData, csvPreviewDialog.fileName, selectedColumns);
    setCsvPreviewDialog({
      isOpen: false,
      detectedColumns: [],
      csvData: [],
      fileName: ''
    });
  }, [csvPreviewDialog, processProductsData]);

  const handleCSVPreviewClose = useCallback(() => {
    // Process without new columns
    processProductsData(csvPreviewDialog.csvData, csvPreviewDialog.fileName, []);
    setCsvPreviewDialog({
      isOpen: false,
      detectedColumns: [],
      csvData: [],
      fileName: ''
    });
  }, [csvPreviewDialog, processProductsData]);

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

  const handleProductUpdate = useCallback((productId: string, updatedProduct: Product) => {
    setProducts(prev => 
      prev.map(product => 
        product.id === productId ? updatedProduct : product
      )
    );
  }, []);

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

  const downloadProductTemplate = () => {
    const templateHeaders = ['id', 'title', 'brand', 'url'];
    const templateData = [
      ['P001', 'Sample Product 1', 'Sample Brand', 'https://example.com/product1'],
      ['P002', 'Sample Product 2', 'Another Brand', 'https://example.com/product2']
    ];

    const csvContent = [
      templateHeaders.join(','),
      ...templateData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'product-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template downloaded",
      description: "Product template CSV has been downloaded.",
    });
  };

  const downloadHierarchyTemplate = () => {
    const templateHeaders = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    const templateData = [
      ['Electronics', 'Mobile Phones', 'Smartphones', 'Premium', 'Apple', 'Flagship'],
      ['Electronics', 'Computers', 'Laptops', 'Gaming', 'Gaming', 'High-end'],
      ['Clothing', 'Footwear', 'Sneakers', 'Athletic', 'Nike', 'Running']
    ];

    const csvContent = [
      templateHeaders.join(','),
      ...templateData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'hierarchy-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template downloaded",
      description: "Hierarchy template CSV has been downloaded.",
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

  const manualSave = () => {
    saveMappingData(products, hierarchyRules, productsFileName, hierarchyFileName);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    
    toast({
      title: "Data saved",
      description: "Your mappings have been manually saved.",
    });
  };

  const clearAll = () => {
    setProducts([]);
    setHierarchyRules([]);
    setProductsFileName('');
    setHierarchyFileName('');
    setLastSaved(null);
    setHasUnsavedChanges(false);
    clearMappingData();
    
    toast({
      title: "Data cleared",
      description: "All data has been reset.",
    });
  };

  const completedCount = useMemo(() => {
    return products.filter(product => {
      const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
      return levels.every(level => product[level as keyof Product]);
    }).length;
  }, [products]);

  // Convert Product[] to RowData[] for new table
  const tableRows = useMemo((): RowData[] => {
    return products.map(product => ({
      id: product.id,
      name: product.title,
      sku: product.id, // Use ID as SKU for now
      brand: product.brand || '',
      url: product.url || '',
      hierarchy: {
        level1: product.category,
        level2: product.subcategory,
        level3: product.bigC,
        level4: product.smallC,
        level5: product.segment,
        level6: product.subSegment
      }
    }));
  }, [products]);

  // Convert hierarchy rules to options for new table
  const hierarchyOptions = useMemo(() => {
    const level1Options = Array.from(new Set(hierarchyRules.map(rule => rule.category).filter(Boolean)))
      .map(category => ({ value: category, label: category }));
    
    const level2Options = Array.from(new Set(hierarchyRules.map(rule => rule.subcategory).filter(Boolean)))
      .map(subcategory => ({ value: subcategory, label: subcategory }));
    
    const level3Options = Array.from(new Set(hierarchyRules.map(rule => rule.bigC).filter(Boolean)))
      .map(bigC => ({ value: bigC, label: bigC }));

    const level4Options = Array.from(new Set(hierarchyRules.map(rule => rule.smallC).filter(Boolean)))
      .map(smallC => ({ value: smallC, label: smallC }));

    const level5Options = Array.from(new Set(hierarchyRules.map(rule => rule.segment).filter(Boolean)))
      .map(segment => ({ value: segment, label: segment }));

    const level6Options = Array.from(new Set(hierarchyRules.map(rule => rule.subSegment).filter(Boolean)))
      .map(subSegment => ({ value: subSegment, label: subSegment }));

    return {
      level1: level1Options,
      level2: level2Options,
      level3: level3Options,
      level4: level4Options,
      level5: level5Options,
      level6: level6Options
    };
  }, [hierarchyRules]);

  const handleRowsChange = useCallback((updatedRows: RowData[]) => {
    const updatedProducts = updatedRows.map(row => {
      const originalProduct = products.find(p => p.id === row.id);
      return {
        ...originalProduct!,
        id: row.id,
        title: row.name,
        brand: row.brand,
        url: row.url || originalProduct?.url || '',
        category: row.hierarchy?.level1,
        subcategory: row.hierarchy?.level2,
        bigC: row.hierarchy?.level3,
        smallC: row.hierarchy?.level4,
        segment: row.hierarchy?.level5,
        subSegment: row.hierarchy?.level6
      };
    });
    setProducts(updatedProducts);
  }, [products]);

  const handleDeleteRow = useCallback((rowId: string) => {
    setProducts(prev => prev.filter(product => product.id !== rowId));
  }, []);

  const handleSelectRows = useCallback((rowIds: string[]) => {
    // Handle row selection if needed
    console.log('Selected rows:', rowIds);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-data">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center">
              <img src={logo} alt="1Digital Stack Logo" className="h-10 w-auto mr-4" />
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Product Classification Mapping Tool
              </h1>
            </div>
            <div className="w-20 flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a href="/demo">View Demo</a>
              </Button>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center">
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
            <>
              <Button
                variant="outline"
                onClick={manualSave}
                className="hover:bg-success/10 text-success border-success"
                disabled={!hasUnsavedChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </Button>
              
              <Button
                variant="outline"
                onClick={clearAll}
                className="hover:bg-destructive/10 text-destructive border-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>
            </>
          )}
          
          {hasSavedData() && (
            <Button
              variant="outline"
              onClick={() => {
                const savedData = loadMappingData();
                if (savedData) {
                  setProducts(savedData.products);
                  setHierarchyRules(savedData.hierarchyRules);
                  setProductsFileName(savedData.productsFileName || '');
                  setHierarchyFileName(savedData.hierarchyFileName || '');
                  setLastSaved(new Date(savedData.lastSaved));
                  setHasUnsavedChanges(false);
                  toast({
                    title: "Data restored",
                    description: "Previous session data has been restored.",
                  });
                }
              }}
              className="hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore Saved Data
            </Button>
          )}
        </div>

        {/* Save Status */}
        {lastSaved && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleString()}
              {hasUnsavedChanges && <span className="text-orange-500 ml-2">• Unsaved changes</span>}
            </p>
          </div>
        )}

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <FileUpload
              title="Upload Products"
              description="CSV file containing product data (ID, title, brand, URL) to be classified"
              expectedHeaders={['id', 'title']}
              onFileUpload={handleProductsUpload}
              uploadedFileName={productsFileName}
              fileType="products"
            />
            <Button
              variant="outline"
              onClick={downloadProductTemplate}
              className="w-full hover:bg-accent"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download Product Template
            </Button>
          </div>
          
          <div className="space-y-4">
            <FileUpload
              title="Upload Hierarchy Rules"
              description="CSV file defining valid category relationships and combinations"
              expectedHeaders={['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment']}
              onFileUpload={handleHierarchyUpload}
              uploadedFileName={hierarchyFileName}
              fileType="hierarchy"
            />
            <Button
              variant="outline"
              onClick={downloadHierarchyTemplate}
              className="w-full hover:bg-accent"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download Hierarchy Template
            </Button>
          </div>
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
          <ProductHierarchyMappingTable
            rows={tableRows}
            hierarchyOptions={hierarchyOptions}
            onRowsChange={handleRowsChange}
            onDeleteRow={handleDeleteRow}
            onSelectRows={handleSelectRows}
            hierarchyHelper={hierarchyHelper}
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

        {/* CSV Column Preview Dialog */}
        <CSVColumnPreviewDialog
          isOpen={csvPreviewDialog.isOpen}
          onClose={handleCSVPreviewClose}
          onConfirm={handleCSVPreviewConfirm}
          detectedColumns={csvPreviewDialog.detectedColumns}
        />
      </div>
    </div>
  );
};

export default Index;