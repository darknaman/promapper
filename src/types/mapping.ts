export interface Product {
  id: string;
  title: string;
  category?: string;
  subcategory?: string;
  bigC?: string;
  smallC?: string;
  segment?: string;
  subSegment?: string;
}

export interface HierarchyRule {
  category: string;
  subcategory: string;
  bigC: string;
  smallC: string;
  segment: string;
  subSegment: string;
}

export interface DropdownOption {
  label: string;
  value: string;
}

export interface FilterState {
  category?: string;
  subcategory?: string;
  bigC?: string;
  smallC?: string;
  segment?: string;
  subSegment?: string;
}

export type ClassificationLevel = 'category' | 'subcategory' | 'bigC' | 'smallC' | 'segment' | 'subSegment';