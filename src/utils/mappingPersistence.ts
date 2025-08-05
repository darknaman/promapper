/**
 * Mapping Persistence Utility
 * Handles saving and loading of product mappings to localStorage
 * Ensures data persistence across page refreshes and network issues
 */

import { Product, HierarchyRule } from '../types/mapping';

const STORAGE_KEYS = {
  PRODUCTS: 'product_mappings',
  HIERARCHY: 'hierarchy_rules',
  LAST_SAVED: 'last_saved_timestamp',
  AUTO_SAVE_ENABLED: 'auto_save_enabled'
} as const;

export interface PersistedData {
  products: Product[];
  hierarchyRules: HierarchyRule[];
  lastSaved: number;
  productsFileName?: string;
  hierarchyFileName?: string;
}

/**
 * Save current mapping data to localStorage
 */
export const saveMappingData = (
  products: Product[], 
  hierarchyRules: HierarchyRule[],
  productsFileName?: string,
  hierarchyFileName?: string
): void => {
  try {
    const data: PersistedData = {
      products,
      hierarchyRules,
      lastSaved: Date.now(),
      productsFileName,
      hierarchyFileName
    };

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.HIERARCHY, JSON.stringify(hierarchyRules));
    localStorage.setItem(STORAGE_KEYS.LAST_SAVED, Date.now().toString());
    
    if (productsFileName) {
      localStorage.setItem('products_file_name', productsFileName);
    }
    if (hierarchyFileName) {
      localStorage.setItem('hierarchy_file_name', hierarchyFileName);
    }

    console.log('Mapping data saved successfully');
  } catch (error) {
    console.error('Failed to save mapping data:', error);
  }
};

/**
 * Load mapping data from localStorage
 */
export const loadMappingData = (): PersistedData | null => {
  try {
    const productsStr = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const hierarchyStr = localStorage.getItem(STORAGE_KEYS.HIERARCHY);
    const lastSavedStr = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
    const productsFileName = localStorage.getItem('products_file_name') || undefined;
    const hierarchyFileName = localStorage.getItem('hierarchy_file_name') || undefined;

    if (!productsStr && !hierarchyStr) {
      return null;
    }

    const products: Product[] = productsStr ? JSON.parse(productsStr) : [];
    const hierarchyRules: HierarchyRule[] = hierarchyStr ? JSON.parse(hierarchyStr) : [];
    const lastSaved = lastSavedStr ? parseInt(lastSavedStr, 10) : 0;

    return {
      products,
      hierarchyRules,
      lastSaved,
      productsFileName,
      hierarchyFileName
    };
  } catch (error) {
    console.error('Failed to load mapping data:', error);
    return null;
  }
};

/**
 * Clear all persisted mapping data
 */
export const clearMappingData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.HIERARCHY);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);
    localStorage.removeItem('products_file_name');
    localStorage.removeItem('hierarchy_file_name');
    console.log('Mapping data cleared successfully');
  } catch (error) {
    console.error('Failed to clear mapping data:', error);
  }
};

/**
 * Check if there's saved data available
 */
export const hasSavedData = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.PRODUCTS) !== null || 
         localStorage.getItem(STORAGE_KEYS.HIERARCHY) !== null;
};

/**
 * Get the last saved timestamp
 */
export const getLastSavedTime = (): Date | null => {
  const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
  return timestamp ? new Date(parseInt(timestamp, 10)) : null;
};

/**
 * Auto-save functionality
 */
export class AutoSaveManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly SAVE_DELAY = 2000; // 2 seconds delay

  constructor(
    private onSave: (products: Product[], hierarchyRules: HierarchyRule[], productsFileName?: string, hierarchyFileName?: string) => void
  ) {}

  /**
   * Schedule an auto-save operation (debounced)
   */
  scheduleSave(
    products: Product[], 
    hierarchyRules: HierarchyRule[],
    productsFileName?: string,
    hierarchyFileName?: string
  ): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.onSave(products, hierarchyRules, productsFileName, hierarchyFileName);
      this.saveTimeout = null;
    }, this.SAVE_DELAY);
  }

  /**
   * Cancel any pending save operation
   */
  cancelSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Destroy the auto-save manager
   */
  destroy(): void {
    this.cancelSave();
  }
}