import { useState, useCallback, useEffect } from 'react';
import { CustomColumn, ColumnConfiguration, SortConfig, TableState, DEFAULT_COLUMN_WIDTHS, CORE_COLUMNS } from '../types/columnManagement';

const STORAGE_KEY = 'product-table-config';

export const useColumnManagement = () => {
  const [tableState, setTableState] = useState<TableState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.warn('Failed to parse saved table state:', error);
      }
    }
    
    return {
      columnConfig: {
        coreColumns: CORE_COLUMNS.map(col => col.key),
        customColumns: [],
        freezePosition: 4, // Freeze up to URL column by default
        hiddenColumns: [],
      },
      sortConfigs: [],
      columnWidths: DEFAULT_COLUMN_WIDTHS,
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tableState));
  }, [tableState]);

  const addCustomColumn = useCallback((column: Omit<CustomColumn, 'id' | 'created'>) => {
    const newColumn: CustomColumn = {
      ...column,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created: new Date(),
    };

    setTableState(prev => ({
      ...prev,
      columnConfig: {
        ...prev.columnConfig,
        customColumns: [...prev.columnConfig.customColumns, newColumn],
      },
      columnWidths: {
        ...prev.columnWidths,
        [newColumn.id]: newColumn.width,
      },
    }));

    return newColumn.id;
  }, []);

  const removeCustomColumn = useCallback((columnId: string) => {
    setTableState(prev => ({
      ...prev,
      columnConfig: {
        ...prev.columnConfig,
        customColumns: prev.columnConfig.customColumns.filter(col => col.id !== columnId),
      },
      sortConfigs: prev.sortConfigs.filter(sort => sort.column !== columnId),
      columnWidths: Object.fromEntries(
        Object.entries(prev.columnWidths).filter(([key]) => key !== columnId)
      ),
    }));
  }, []);

  const updateColumnWidth = useCallback((columnKey: string, width: number) => {
    setTableState(prev => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [columnKey]: width,
      },
    }));
  }, []);

  const setFreezePosition = useCallback((position: number) => {
    setTableState(prev => ({
      ...prev,
      columnConfig: {
        ...prev.columnConfig,
        freezePosition: position,
      },
    }));
  }, []);

  const addSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    setTableState(prev => {
      const existingIndex = prev.sortConfigs.findIndex(sort => sort.column === column);
      let newSorts = [...prev.sortConfigs];

      if (existingIndex >= 0) {
        // Update existing sort
        newSorts[existingIndex] = { ...newSorts[existingIndex], direction };
      } else {
        // Add new sort with highest priority
        const maxPriority = Math.max(0, ...newSorts.map(s => s.priority));
        newSorts.push({ column, direction, priority: maxPriority + 1 });
      }

      return {
        ...prev,
        sortConfigs: newSorts,
      };
    });
  }, []);

  const removeSort = useCallback((column: string) => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: prev.sortConfigs.filter(sort => sort.column !== column),
    }));
  }, []);

  const clearAllSorts = useCallback(() => {
    setTableState(prev => ({
      ...prev,
      sortConfigs: [],
    }));
  }, []);

  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setTableState(prev => {
      const isHidden = prev.columnConfig.hiddenColumns.includes(columnKey);
      return {
        ...prev,
        columnConfig: {
          ...prev.columnConfig,
          hiddenColumns: isHidden
            ? prev.columnConfig.hiddenColumns.filter(col => col !== columnKey)
            : [...prev.columnConfig.hiddenColumns, columnKey],
        },
      };
    });
  }, []);

  const getAllColumns = useCallback(() => {
    const coreColumns = CORE_COLUMNS.filter(col => 
      !tableState.columnConfig.hiddenColumns.includes(col.key)
    );
    const customColumns = tableState.columnConfig.customColumns.filter(col =>
      !tableState.columnConfig.hiddenColumns.includes(col.id)
    ).map(col => ({
      key: col.id,
      title: col.name,
      dataType: col.dataType,
      validationRules: col.validationRules,
      sortable: col.sortable,
    }));

    return [...coreColumns, ...customColumns];
  }, [tableState.columnConfig]);

  const getColumnWidth = useCallback((columnKey: string) => {
    return tableState.columnWidths[columnKey] || 150;
  }, [tableState.columnWidths]);

  const getFrozenColumns = useCallback(() => {
    const allColumns = getAllColumns();
    return allColumns.slice(0, tableState.columnConfig.freezePosition + 1);
  }, [getAllColumns, tableState.columnConfig.freezePosition]);

  const getScrollableColumns = useCallback(() => {
    const allColumns = getAllColumns();
    return allColumns.slice(tableState.columnConfig.freezePosition + 1);
  }, [getAllColumns, tableState.columnConfig.freezePosition]);

  return {
    tableState,
    addCustomColumn,
    removeCustomColumn,
    updateColumnWidth,
    setFreezePosition,
    addSort,
    removeSort,
    clearAllSorts,
    toggleColumnVisibility,
    getAllColumns,
    getColumnWidth,
    getFrozenColumns,
    getScrollableColumns,
  };
};