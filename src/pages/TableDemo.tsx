import React, { useState } from 'react';
import ProductHierarchyMappingTable from '../components/ProductHierarchyMappingTable';
import { RowData } from '../types/productTable';

const sampleData: RowData[] = [
  {
    id: 'prod-001',
    name: 'Wireless Headphones',
    sku: 'WH-001',
    brand: 'TechBrand',
    hierarchy: {
      level1: 'electronics',
      level2: 'audio',
      level3: 'headphones'
    }
  },
  {
    id: 'prod-002',
    name: 'Gaming Mouse',
    sku: 'GM-002',
    brand: 'GameTech',
    hierarchy: {
      level1: 'electronics',
      level2: 'computer',
    }
  },
  {
    id: 'prod-003',
    name: 'Coffee Maker',
    sku: 'CM-003',
    brand: 'KitchenPro',
    hierarchy: {}
  },
  {
    id: 'prod-004',
    name: 'Running Shoes',
    sku: 'RS-004',
    brand: 'SportWear',
    hierarchy: {
      level1: 'apparel'
    }
  },
  {
    id: 'prod-005',
    name: 'Smartphone',
    sku: 'SP-005',
    brand: 'MobileTech',
    hierarchy: {
      level1: 'electronics',
      level2: 'mobile',
      level3: 'smartphones'
    }
  }
];

const hierarchyOptions = {
  level1: [
    { value: 'electronics', label: 'Electronics' },
    { value: 'apparel', label: 'Apparel' },
    { value: 'home', label: 'Home & Garden' },
    { value: 'sports', label: 'Sports & Outdoors' }
  ],
  level2: [
    { value: 'audio', label: 'Audio' },
    { value: 'computer', label: 'Computer' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'garden', label: 'Garden' }
  ],
  level3: [
    { value: 'headphones', label: 'Headphones' },
    { value: 'speakers', label: 'Speakers' },
    { value: 'keyboards', label: 'Keyboards' },
    { value: 'mice', label: 'Mice' },
    { value: 'smartphones', label: 'Smartphones' },
    { value: 'tablets', label: 'Tablets' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'pants', label: 'Pants' },
    { value: 'sneakers', label: 'Sneakers' },
    { value: 'boots', label: 'Boots' }
  ]
};

const TableDemo: React.FC = () => {
  const [rows, setRows] = useState<RowData[]>(sampleData);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const handleRowsChange = (updatedRows: RowData[]) => {
    setRows(updatedRows);
    console.log('Rows updated:', updatedRows);
  };

  const handleDeleteRow = (rowId: string) => {
    setRows(prevRows => prevRows.filter(row => row.id !== rowId));
    setSelectedRowIds(prevSelected => prevSelected.filter(id => id !== rowId));
    console.log('Row deleted:', rowId);
  };

  const handleSelectRows = (rowIds: string[]) => {
    setSelectedRowIds(rowIds);
    console.log('Rows selected:', rowIds);
  };

  const validateProductField = (rowId: string, columnId: string, value: string): string | null => {
    if (columnId === 'sku' && value.length < 3) {
      return 'SKU must be at least 3 characters';
    }
    if (columnId === 'name' && value.length < 2) {
      return 'Name must be at least 2 characters';
    }
    return null;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Product Hierarchy Mapping Table Demo</h1>
        <p className="text-muted-foreground">
          Demo of the new stable table component with all required functionality
        </p>
      </div>

      <div className="mb-4 p-4 bg-card rounded-lg border">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Double-click product fields (Name, SKU, Brand) to edit</li>
          <li>• Click hierarchy dropdowns to select categories</li>
          <li>• Use checkboxes to select rows for batch operations</li>
          <li>• Click trash icon to delete individual rows</li>
          <li>• Use batch edit toolbar when rows are selected</li>
        </ul>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <ProductHierarchyMappingTable
          rows={rows}
          hierarchyOptions={hierarchyOptions}
          onRowsChange={handleRowsChange}
          onDeleteRow={handleDeleteRow}
          onSelectRows={handleSelectRows}
          validateProductField={validateProductField}
        />
      </div>

      <div className="mt-6 p-4 bg-card rounded-lg border">
        <h3 className="font-semibold mb-2">Debug Information:</h3>
        <div className="text-sm text-muted-foreground">
          <p>Total rows: {rows.length}</p>
          <p>Selected rows: {selectedRowIds.length} ({selectedRowIds.join(', ')})</p>
        </div>
      </div>
    </div>
  );
};

export default TableDemo;