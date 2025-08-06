import { useMemo } from 'react';
import { RowData } from '../types/productTable';
import { SortConfig, CustomColumn } from '../types/columnManagement';

export const useSorting = (
  data: RowData[],
  sortConfigs: SortConfig[],
  customColumns: CustomColumn[]
) => {
  const sortedData = useMemo(() => {
    if (sortConfigs.length === 0) return data;

    // Sort by priority (highest priority first)
    const sortedConfigs = [...sortConfigs].sort((a, b) => b.priority - a.priority);

    return [...data].sort((a, b) => {
      for (const sortConfig of sortedConfigs) {
        const { column, direction } = sortConfig;
        
        let aValue: any = a[column as keyof RowData];
        let bValue: any = b[column as keyof RowData];

        // Handle custom columns
        if (!aValue && !bValue) {
          // Check if it's a custom column
          const customColumn = customColumns.find(col => col.id === column);
          if (customColumn) {
            // Get values from custom column data (stored in a separate property)
            aValue = (a as any)[column] ?? '';
            bValue = (b as any)[column] ?? '';
          }
        }

        // Handle hierarchy nested values
        if (aValue === undefined && a.hierarchy) {
          const hierarchyKey = column as keyof typeof a.hierarchy;
          aValue = a.hierarchy[hierarchyKey];
        }
        if (bValue === undefined && b.hierarchy) {
          const hierarchyKey = column as keyof typeof b.hierarchy;
          bValue = b.hierarchy[hierarchyKey];
        }

        // Normalize values
        aValue = aValue ?? '';
        bValue = bValue ?? '';

        // Determine data type for proper comparison
        const customColumn = customColumns.find(col => col.id === column);
        const dataType = customColumn?.dataType || 'text';

        let comparison = 0;

        if (dataType === 'number') {
          const aNum = parseFloat(aValue.toString()) || 0;
          const bNum = parseFloat(bValue.toString()) || 0;
          comparison = aNum - bNum;
        } else if (dataType === 'date') {
          const aDate = new Date(aValue.toString()).getTime() || 0;
          const bDate = new Date(bValue.toString()).getTime() || 0;
          comparison = aDate - bDate;
        } else {
          // Text comparison (case-insensitive)
          const aStr = aValue.toString().toLowerCase();
          const bStr = bValue.toString().toLowerCase();
          comparison = aStr.localeCompare(bStr);
        }

        if (comparison !== 0) {
          return direction === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  }, [data, sortConfigs, customColumns]);

  return sortedData;
};