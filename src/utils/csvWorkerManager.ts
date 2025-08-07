/**
 * CSV Worker Manager - Handles Web Worker communication for CSV processing
 * Provides a clean interface for offloading heavy CSV operations to Web Workers
 */

import { Product, HierarchyRule } from '../types/mapping';

export interface CsvWorkerProgress {
  progress: number;
  processedRows?: number;
  totalRows?: number;
  currentBatch?: number;
  totalBatches?: number;
}

export interface CsvWorkerResult {
  data: Product[] | HierarchyRule[];
  fileType: 'products' | 'hierarchy';
}

/**
 * Manager class for handling CSV processing with Web Workers
 */
export class CsvWorkerManager {
  private worker: Worker | null = null;
  private isProcessing = false;

  constructor() {
    this.initializeWorker();
  }

  /**
   * Initialize the Web Worker
   */
  private initializeWorker(): void {
    try {
      this.worker = new Worker('/csvWorker.js');
    } catch (error) {
      console.warn('Web Worker not supported, falling back to main thread processing');
      this.worker = null;
    }
  }

  /**
   * Check if Web Worker is available and ready
   */
  isWorkerAvailable(): boolean {
    return this.worker !== null && !this.isProcessing;
  }

  /**
   * Parse CSV file using Web Worker with progress tracking
   */
  async parseCsvFile(
    file: File,
    expectedHeaders: string[],
    fileType: 'products' | 'hierarchy',
    onProgress?: (progress: CsvWorkerProgress) => void
  ): Promise<CsvWorkerResult> {
    if (!this.worker) {
      throw new Error('Web Worker not available');
    }

    if (this.isProcessing) {
      throw new Error('Worker is already processing a file');
    }

    this.isProcessing = true;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      // Set up message listener
      const messageHandler = (e: MessageEvent) => {
        const { type, data, progress, processedRows, totalRows, error } = e.data;

        switch (type) {
          case 'PARSE_PROGRESS':
            onProgress?.({
              progress,
              processedRows,
              totalRows
            });
            break;

          case 'PARSE_COMPLETE':
            this.worker?.removeEventListener('message', messageHandler);
            this.isProcessing = false;
            resolve({
              data: data as Product[] | HierarchyRule[],
              fileType
            });
            break;

          case 'PARSE_ERROR':
          case 'ERROR':
            this.worker?.removeEventListener('message', messageHandler);
            this.isProcessing = false;
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener('message', messageHandler);

      // Send file to worker for processing
      this.worker.postMessage({
        type: 'PARSE_CSV',
        data: {
          file,
          expectedHeaders,
          fileType
        }
      });
    });
  }

  /**
   * Process products in batches using Web Worker
   */
  async processProductsBatch(
    products: Product[],
    hierarchyRules: HierarchyRule[],
    batchSize: number = 100,
    onProgress?: (progress: CsvWorkerProgress) => void
  ): Promise<Product[]> {
    if (!this.worker || this.isProcessing) {
      // Fallback to main thread processing
      return this.processProductsMainThread(products, batchSize, onProgress);
    }

    this.isProcessing = true;

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageHandler = (e: MessageEvent) => {
        const { type, data, progress, currentBatch, totalBatches, error } = e.data;

        switch (type) {
          case 'PROCESS_PROGRESS':
            onProgress?.({
              progress,
              currentBatch,
              totalBatches
            });
            break;

          case 'PROCESS_COMPLETE':
            this.worker?.removeEventListener('message', messageHandler);
            this.isProcessing = false;
            resolve(data as Product[]);
            break;

          case 'ERROR':
            this.worker?.removeEventListener('message', messageHandler);
            this.isProcessing = false;
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener('message', messageHandler);

      this.worker.postMessage({
        type: 'PROCESS_PRODUCTS',
        data: {
          products,
          hierarchyRules,
          batchSize
        }
      });
    });
  }

  /**
   * Fallback processing on main thread when Worker is not available
   */
  private async processProductsMainThread(
    products: Product[],
    batchSize: number = 100,
    onProgress?: (progress: CsvWorkerProgress) => void
  ): Promise<Product[]> {
    const totalBatches = Math.ceil(products.length / batchSize);
    const processedProducts: Product[] = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, products.length);
      const batch = products.slice(start, end);

      // Process batch (add any transformation logic here)
      processedProducts.push(...batch);

      // Report progress
      const progress = Math.round(((i + 1) / totalBatches) * 100);
      onProgress?.({
        progress,
        currentBatch: i + 1,
        totalBatches
      });

      // Yield control to keep UI responsive
      if (i < totalBatches - 1) {
        await new Promise(resolve => requestIdleCallback(() => resolve(void 0)));
      }
    }

    return processedProducts;
  }

  /**
   * Optimize hierarchy rules for better performance
   */
  async optimizeHierarchyRules(rules: HierarchyRule[]): Promise<HierarchyRule[]> {
    if (!this.worker || this.isProcessing) {
      return rules; // Return as-is if worker not available
    }

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageHandler = (e: MessageEvent) => {
        const { type, data, error } = e.data;

        switch (type) {
          case 'HIERARCHY_OPTIMIZED':
            this.worker?.removeEventListener('message', messageHandler);
            resolve(data.rules as HierarchyRule[]);
            break;

          case 'ERROR':
            this.worker?.removeEventListener('message', messageHandler);
            reject(new Error(error));
            break;
        }
      };

      this.worker.addEventListener('message', messageHandler);

      this.worker.postMessage({
        type: 'OPTIMIZE_HIERARCHY',
        data: { rules }
      });
    });
  }

  /**
   * Clean up worker resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isProcessing = false;
  }
}
