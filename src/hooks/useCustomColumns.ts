import { useState, useEffect, useCallback } from 'react';
import { CustomColumn, CustomColumnValue } from '../types/customColumns';

const STORAGE_KEY_COLUMNS = 'customColumns';
const STORAGE_KEY_VALUES = 'customColumnValues';

export const useCustomColumns = () => {
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customValues, setCustomValues] = useState<CustomColumnValue[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedColumns = localStorage.getItem(STORAGE_KEY_COLUMNS);
      const savedValues = localStorage.getItem(STORAGE_KEY_VALUES);
      
      if (savedColumns) {
        setCustomColumns(JSON.parse(savedColumns));
      }
      if (savedValues) {
        setCustomValues(JSON.parse(savedValues));
      }
    } catch (error) {
      console.error('Error loading custom columns from storage:', error);
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(customColumns));
    } catch (error) {
      console.error('Error saving custom columns to storage:', error);
    }
  }, [customColumns]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VALUES, JSON.stringify(customValues));
    } catch (error) {
      console.error('Error saving custom values to storage:', error);
    }
  }, [customValues]);

  const addColumn = useCallback((column: Omit<CustomColumn, 'id'>) => {
    const newColumn: CustomColumn = {
      ...column,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    setCustomColumns(prev => [...prev, newColumn]);
  }, []);

  const removeColumn = useCallback((columnId: string) => {
    setCustomColumns(prev => prev.filter(col => col.id !== columnId));
    // Also remove all values for this column
    setCustomValues(prev => prev.filter(val => val.columnId !== columnId));
  }, []);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setCustomColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, width } : col
    ));
  }, []);

  const getValue = useCallback((rowId: string, columnId: string): string => {
    const value = customValues.find(val => val.rowId === rowId && val.columnId === columnId);
    const column = customColumns.find(col => col.id === columnId);
    return value?.value || column?.defaultValue || '';
  }, [customValues, customColumns]);

  const setValue = useCallback((rowId: string, columnId: string, value: string) => {
    setCustomValues(prev => {
      const existingIndex = prev.findIndex(val => val.rowId === rowId && val.columnId === columnId);
      
      if (existingIndex >= 0) {
        // Update existing value
        const newValues = [...prev];
        newValues[existingIndex] = { ...newValues[existingIndex], value };
        return newValues;
      } else {
        // Add new value
        return [...prev, { rowId, columnId, value }];
      }
    });
  }, []);

  return {
    customColumns,
    addColumn,
    removeColumn,
    updateColumnWidth,
    getValue,
    setValue
  };
};