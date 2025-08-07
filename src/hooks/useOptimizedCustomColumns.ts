import { useState, useEffect, useCallback, useMemo } from 'react';
import { CustomColumn, CustomColumnValue } from '../types/customColumns';
import { useDebounce, useBatchedUpdates } from './usePerformanceOptimizations';

const STORAGE_KEY_COLUMNS = 'customColumns';
const STORAGE_KEY_VALUES = 'customColumnValues';

// LRU Cache for frequently accessed values
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const useOptimizedCustomColumns = () => {
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [customValues, setCustomValues] = useState<CustomColumnValue[]>([]);
  const [valueCache] = useState(() => new LRUCache<string, string>(1000));
  
  const { batchUpdate } = useBatchedUpdates();

  // Memoized value lookup map for performance
  const valueMap = useMemo(() => {
    const map = new Map<string, string>();
    customValues.forEach(val => {
      const key = `${val.rowId}:${val.columnId}`;
      map.set(key, val.value);
      valueCache.set(key, val.value);
    });
    return map;
  }, [customValues, valueCache]);

  // Memoized columns map for quick lookups
  const columnsMap = useMemo(() => {
    const map = new Map<string, CustomColumn>();
    customColumns.forEach(col => map.set(col.id, col));
    return map;
  }, [customColumns]);

  // Load from localStorage on mount with error handling
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      try {
        const [savedColumns, savedValues] = await Promise.all([
          localStorage.getItem(STORAGE_KEY_COLUMNS),
          localStorage.getItem(STORAGE_KEY_VALUES)
        ]);
        
        if (!mounted) return;
        
        if (savedColumns) {
          const parsedColumns = JSON.parse(savedColumns);
          setCustomColumns(Array.isArray(parsedColumns) ? parsedColumns : []);
        }
        
        if (savedValues) {
          const parsedValues = JSON.parse(savedValues);
          setCustomValues(Array.isArray(parsedValues) ? parsedValues : []);
        }
      } catch (error) {
        console.error('Error loading custom columns from storage:', error);
        // Reset to default state on error
        setCustomColumns([]);
        setCustomValues([]);
      }
    };
    
    loadData();
    return () => { mounted = false; };
  }, []);

  // Debounced save to localStorage for better performance
  const debouncedSaveColumns = useDebounce((columns: CustomColumn[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columns));
    } catch (error) {
      console.error('Error saving custom columns to storage:', error);
    }
  }, 500);

  const debouncedSaveValues = useDebounce((values: CustomColumnValue[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_VALUES, JSON.stringify(values));
    } catch (error) {
      console.error('Error saving custom values to storage:', error);
    }
  }, 500);

  // Save to localStorage when data changes
  useEffect(() => {
    debouncedSaveColumns(customColumns);
  }, [customColumns, debouncedSaveColumns]);

  useEffect(() => {
    debouncedSaveValues(customValues);
  }, [customValues, debouncedSaveValues]);

  const addColumn = useCallback((column: Omit<CustomColumn, 'id'>): string => {
    const newColumn: CustomColumn = {
      ...column,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    batchUpdate(() => {
      setCustomColumns(prev => [...prev, newColumn]);
    });
    
    return newColumn.id;
  }, [batchUpdate]);

  const removeColumn = useCallback((columnId: string) => {
    batchUpdate(() => {
      setCustomColumns(prev => prev.filter(col => col.id !== columnId));
      setCustomValues(prev => prev.filter(val => val.columnId !== columnId));
    });
    
    // Clear cache entries for this column
    valueCache.clear();
  }, [batchUpdate, valueCache]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    batchUpdate(() => {
      setCustomColumns(prev => prev.map(col => 
        col.id === columnId ? { ...col, width: Math.max(10, Math.min(500, width)) } : col
      ));
    });
  }, [batchUpdate]);

  const getValue = useCallback((rowId: string, columnId: string): string => {
    const cacheKey = `${rowId}:${columnId}`;
    
    // Check cache first
    const cachedValue = valueCache.get(cacheKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Check value map
    const mapValue = valueMap.get(cacheKey);
    if (mapValue !== undefined) {
      valueCache.set(cacheKey, mapValue);
      return mapValue;
    }
    
    // Fallback to column default
    const column = columnsMap.get(columnId);
    const defaultValue = column?.defaultValue || '';
    valueCache.set(cacheKey, defaultValue);
    return defaultValue;
  }, [valueMap, columnsMap, valueCache]);

  const setValue = useCallback((rowId: string, columnId: string, value: string) => {
    const cacheKey = `${rowId}:${columnId}`;
    
    batchUpdate(() => {
      setCustomValues(prev => {
        const existingIndex = prev.findIndex(val => 
          val.rowId === rowId && val.columnId === columnId
        );
        
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
    });
    
    // Update cache immediately for instant feedback
    valueCache.set(cacheKey, value);
  }, [batchUpdate, valueCache]);

  // Bulk operations for better performance
  const setMultipleValues = useCallback((updates: Array<{
    rowId: string;
    columnId: string;
    value: string;
  }>) => {
    batchUpdate(() => {
      setCustomValues(prev => {
        const newValues = [...prev];
        const updateMap = new Map<string, string>();
        
        // Create update map
        updates.forEach(({ rowId, columnId, value }) => {
          updateMap.set(`${rowId}:${columnId}`, value);
          valueCache.set(`${rowId}:${columnId}`, value);
        });
        
        // Apply updates
        updates.forEach(({ rowId, columnId, value }) => {
          const existingIndex = newValues.findIndex(val => 
            val.rowId === rowId && val.columnId === columnId
          );
          
          if (existingIndex >= 0) {
            newValues[existingIndex] = { ...newValues[existingIndex], value };
          } else {
            newValues.push({ rowId, columnId, value });
          }
        });
        
        return newValues;
      });
    });
  }, [batchUpdate, valueCache]);

  // Get all values for a specific row efficiently
  const getRowValues = useCallback((rowId: string): Record<string, string> => {
    const rowValues: Record<string, string> = {};
    
    customColumns.forEach(column => {
      rowValues[column.id] = getValue(rowId, column.id);
    });
    
    return rowValues;
  }, [customColumns, getValue]);

  // Clear all values for better memory management
  const clearAllValues = useCallback(() => {
    batchUpdate(() => {
      setCustomValues([]);
    });
    valueCache.clear();
  }, [batchUpdate, valueCache]);

  // Performance monitoring
  const getPerformanceMetrics = useCallback(() => ({
    columnsCount: customColumns.length,
    valuesCount: customValues.length,
    cacheSize: valueCache['cache'].size,
    memoryUsage: JSON.stringify(customValues).length + JSON.stringify(customColumns).length
  }), [customColumns, customValues, valueCache]);

  return {
    customColumns,
    addColumn,
    removeColumn,
    updateColumnWidth,
    getValue,
    setValue,
    setMultipleValues,
    getRowValues,
    clearAllValues,
    getPerformanceMetrics
  };
};