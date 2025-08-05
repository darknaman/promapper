export interface RowData {
  id: string;
  name: string;
  sku: string;
  brand: string;
  hierarchy?: {
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
  };
}

export interface Option {
  value: string;
  label: string;
}

export interface ProductHierarchyMappingTableProps {
  rows: RowData[];
  hierarchyOptions: { [level: string]: Option[] };
  onRowsChange: (updatedRows: RowData[]) => void;
  onDeleteRow: (rowId: string) => void;
  onSelectRows: (rowIds: string[]) => void;
  validateProductField?: (rowId: string, columnId: string, value: string) => string | null;
}

export interface BatchEditToolbarProps {
  selectedRowCount: number;
  hierarchyOptions: { [level: string]: Option[] };
  onSetHierarchy: (level: string, value: string) => void;
  onClearMapping: () => void;
  onClose: () => void;
}