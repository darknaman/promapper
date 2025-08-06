export interface CustomColumn {
  id: string;
  name: string;
  dataType: 'text' | 'number' | 'date' | 'dropdown';
  defaultValue?: string;
  validationRules?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    options?: string[]; // for dropdown type
  };
  width: number;
  sortable: boolean;
  created: Date;
}

export interface ColumnConfiguration {
  coreColumns: string[];
  customColumns: CustomColumn[];
  freezePosition: number; // Index of the last frozen column
  hiddenColumns: string[];
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  priority: number;
}

export interface TableState {
  columnConfig: ColumnConfiguration;
  sortConfigs: SortConfig[];
  columnWidths: { [key: string]: number };
}

export const DEFAULT_COLUMN_WIDTHS = {
  checkbox: 50,
  name: 300,
  sku: 150,
  brand: 150,
  url: 250,
  category: 180,
  subcategory: 180,
  bigC: 150,
  smallC: 150,
  segment: 150,
  subSegment: 150,
};

export const CORE_COLUMNS = [
  { key: 'checkbox', title: '', hasCheckbox: true },
  { key: 'name', title: 'Product Name' },
  { key: 'sku', title: 'SKU' },
  { key: 'brand', title: 'Brand' },
  { key: 'url', title: 'URL' },
  { key: 'category', title: 'Category' },
  { key: 'subcategory', title: 'Subcategory' },
  { key: 'bigC', title: 'Big C' },
  { key: 'smallC', title: 'Small C' },
  { key: 'segment', title: 'Segment' },
  { key: 'subSegment', title: 'Sub Segment' },
];