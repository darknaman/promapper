export interface CustomColumn {
  id: string;
  name: string;
  dataType: 'text' | 'number';
  defaultValue?: string;
  width: number;
}

export interface CustomColumnValue {
  columnId: string;
  rowId: string;
  value: string;
}