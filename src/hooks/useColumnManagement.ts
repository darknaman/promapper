import { useState, useCallback, useEffect } from 'react';

export interface ColumnConfig {
  key: string;
  label: string;
  width: number;
  minWidth: number;
  maxWidth: number;
  frozen?: boolean;
  isCustom?: boolean;
}

export interface ColumnManagementState {
  columns: ColumnConfig[];
  frozenColumnCount: number;
}

const STORAGE_KEY = 'column-management-settings';
const DEFAULT_MIN_WIDTH = 10;
const DEFAULT_MAX_WIDTH = 500;

export const useColumnManagement = (initialColumns: ColumnConfig[]) => {
  const [state, setState] = useState<ColumnManagementState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved settings with initial columns
        const mergedColumns = initialColumns.map(col => {
          const savedCol = parsed.columns?.find((c: ColumnConfig) => c.key === col.key);
          return savedCol ? { ...col, ...savedCol } : col;
        });
        return {
          columns: mergedColumns,
          frozenColumnCount: parsed.frozenColumnCount || 0
        };
      }
    } catch (error) {
      console.error('Error loading column settings:', error);
    }
    
    return {
      columns: initialColumns,
      frozenColumnCount: 0
    };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving column settings:', error);
    }
  }, [state]);

  const updateColumnWidth = useCallback((columnKey: string, newWidth: number) => {
    setState(prev => ({
      ...prev,
      columns: prev.columns.map(col => 
        col.key === columnKey 
          ? { 
              ...col, 
              width: Math.max(
                col.minWidth || DEFAULT_MIN_WIDTH, 
                Math.min(col.maxWidth || DEFAULT_MAX_WIDTH, newWidth)
              )
            }
          : col
      )
    }));
  }, []);

  const freezeColumnsUpTo = useCallback((columnIndex: number) => {
    setState(prev => ({
      ...prev,
      frozenColumnCount: columnIndex + 1,
      columns: prev.columns.map((col, index) => ({
        ...col,
        frozen: index <= columnIndex
      }))
    }));
  }, []);

  const unfreezeAllColumns = useCallback(() => {
    setState(prev => ({
      ...prev,
      frozenColumnCount: 0,
      columns: prev.columns.map(col => ({
        ...col,
        frozen: false
      }))
    }));
  }, []);

  const addColumn = useCallback((column: Omit<ColumnConfig, 'key'> & { key?: string }) => {
    const key = column.key || `custom_${Date.now()}`;
    const newColumn: ColumnConfig = {
      ...column,
      key,
      minWidth: column.minWidth || DEFAULT_MIN_WIDTH,
      maxWidth: column.maxWidth || DEFAULT_MAX_WIDTH,
      isCustom: true
    };

    setState(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));

    return key;
  }, []);

  const removeColumn = useCallback((columnKey: string) => {
    setState(prev => {
      const columnIndex = prev.columns.findIndex(col => col.key === columnKey);
      if (columnIndex === -1) return prev;

      const newColumns = prev.columns.filter(col => col.key !== columnKey);
      const newFrozenCount = columnIndex < prev.frozenColumnCount 
        ? Math.max(0, prev.frozenColumnCount - 1)
        : prev.frozenColumnCount;

      return {
        columns: newColumns.map((col, index) => ({
          ...col,
          frozen: index < newFrozenCount
        })),
        frozenColumnCount: newFrozenCount
      };
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setState({
      columns: initialColumns,
      frozenColumnCount: 0
    });
  }, [initialColumns]);

  return {
    columns: state.columns,
    frozenColumns: state.columns.slice(0, state.frozenColumnCount),
    scrollableColumns: state.columns.slice(state.frozenColumnCount),
    frozenColumnCount: state.frozenColumnCount,
    updateColumnWidth,
    freezeColumnsUpTo,
    unfreezeAllColumns,
    addColumn,
    removeColumn,
    resetToDefaults
  };
};