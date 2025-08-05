export interface BatchEditFormData {
  category?: string;
  subcategory?: string;
  bigC?: string;
  smallC?: string;
  segment?: string;
  subSegment?: string;
}

export interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  resizable: boolean;
  editable: boolean;
  frozen: boolean;
}

export interface ProductTableLayout {
  frozenColumns: string[];
  scrollableColumns: string[];
  columnWidths: Record<string, number>;
  minColumnWidths: Record<string, number>;
  totalFrozenWidth: number;
  totalScrollableWidth: number;
}

export interface BatchEditState {
  selectedProducts: Set<string>;
  isEditing: boolean;
  formData: BatchEditFormData;
  isLoading: boolean;
  error?: string;
}