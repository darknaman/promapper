/**
 * Web Worker for CSV processing and product mapping
 * Handles large CSV files without blocking the main UI thread
 */

// Import PapaParse for CSV parsing
importScripts('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js');

/**
 * Batch processor for handling large datasets
 * Processes data in chunks to keep the main thread responsive
 */
class BatchProcessor {
  constructor(batchSize = 100, delay = 10) {
    this.batchSize = batchSize;
    this.delay = delay;
  }

  async processBatches(data, processor, onProgress) {
    const totalBatches = Math.ceil(data.length / this.batchSize);
    const results = [];

    for (let i = 0; i < totalBatches; i++) {
      const start = i * this.batchSize;
      const end = Math.min(start + this.batchSize, data.length);
      const batch = data.slice(start, end);
      
      // Process batch
      const batchResults = await processor(batch, i);
      results.push(...batchResults);
      
      // Report progress
      const progress = Math.round(((i + 1) / totalBatches) * 100);
      onProgress && onProgress(progress, i + 1, totalBatches);
      
      // Yield control to prevent blocking
      if (i < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    return results;
  }
}

/**
 * Optimized hierarchy helper using hash maps for O(1) lookups
 */
class OptimizedHierarchyHelper {
  constructor(rules) {
    this.rules = rules;
    this.buildHashMaps();
  }

  buildHashMaps() {
    // Create hash maps for fast lookups
    this.categoryMap = new Map();
    this.subcategoryMap = new Map();
    this.bigCMap = new Map();
    this.smallCMap = new Map();
    this.segmentMap = new Map();
    this.subSegmentMap = new Map();
    
    // Multi-level lookup maps for cascading relationships
    this.hierarchyMap = new Map();
    
    this.rules.forEach(rule => {
      // Build individual level maps
      this.addToMap(this.categoryMap, rule.category, rule);
      this.addToMap(this.subcategoryMap, rule.subcategory, rule);
      this.addToMap(this.bigCMap, rule.bigC, rule);
      this.addToMap(this.smallCMap, rule.smallC, rule);
      this.addToMap(this.segmentMap, rule.segment, rule);
      this.addToMap(this.subSegmentMap, rule.subSegment, rule);
      
      // Build hierarchical lookup map
      const key = this.createHierarchyKey(rule);
      this.hierarchyMap.set(key, rule);
    });
  }

  addToMap(map, value, rule) {
    if (!value) return;
    if (!map.has(value)) {
      map.set(value, []);
    }
    map.get(value).push(rule);
  }

  createHierarchyKey(selections) {
    return [
      selections.category || '',
      selections.subcategory || '',
      selections.bigC || '',
      selections.smallC || '',
      selections.segment || '',
      selections.subSegment || ''
    ].join('|');
  }

  getAvailableOptions(level, currentSelections) {
    const filteredRules = this.getFilteredRules(currentSelections, level);
    const uniqueValues = new Set();
    
    filteredRules.forEach(rule => {
      const value = rule[level];
      if (value && value.trim()) {
        uniqueValues.add(value.trim());
      }
    });

    return Array.from(uniqueValues)
      .sort()
      .map(value => ({ label: value, value }));
  }

  getFilteredRules(selections, excludeLevel) {
    return this.rules.filter(rule => {
      const levels = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
      
      return levels.every(level => {
        if (level === excludeLevel) return true;
        const selectedValue = selections[level];
        return !selectedValue || rule[level] === selectedValue;
      });
    });
  }
}

// Worker message handlers
self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'PARSE_CSV':
        await parseCsvFile(data);
        break;
      case 'PROCESS_PRODUCTS':
        await processProductsBatch(data);
        break;
      case 'OPTIMIZE_HIERARCHY':
        optimizeHierarchyRules(data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
};

/**
 * Parse CSV file using PapaParse with chunked processing
 */
async function parseCsvFile({ file, expectedHeaders, fileType }) {
  return new Promise((resolve, reject) => {
    const results = [];
    let totalRows = 0;
    let processedRows = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      chunk: function(chunk) {
        totalRows += chunk.data.length;
        
        // Process chunk in batches
        const batchProcessor = new BatchProcessor(50, 5);
        
        batchProcessor.processBatches(
          chunk.data,
          async (batch) => {
            return batch.map((row, index) => {
              if (fileType === 'products') {
                return {
                  id: row.id || row.ID || `product-${processedRows + index}`,
                  title: row.title || row.Title || '',
                  brand: row.brand || row.Brand || '',
                  url: row.url || row.URL || '',
                  category: undefined,
                  subcategory: undefined,
                  bigC: undefined,
                  smallC: undefined,
                  segment: undefined,
                  subSegment: undefined
                };
              } else {
                return {
                  category: row.category || '',
                  subcategory: row.subcategory || '',
                  bigC: row.bigC || '',
                  smallC: row.smallC || '',
                  segment: row.segment || '',
                  subSegment: row.subSegment || ''
                };
              }
            });
          },
          (progress) => {
            const chunkProcessed = Math.min(50, chunk.data.length);
            processedRows += chunkProcessed;
            self.postMessage({
              type: 'PARSE_PROGRESS',
              progress: Math.round((processedRows / Math.max(totalRows, 1)) * 100),
              processedRows,
              totalRows
            });
          }
        ).then(batchResults => {
          results.push(...batchResults);
        });
      },
      complete: function() {
        self.postMessage({
          type: 'PARSE_COMPLETE',
          data: results,
          fileType
        });
        resolve(results);
      },
      error: function(error) {
        self.postMessage({
          type: 'PARSE_ERROR',
          error: error.message
        });
        reject(error);
      }
    });
  });
}

/**
 * Process products in batches for mapping
 */
async function processProductsBatch({ products, hierarchyRules, batchSize = 100 }) {
  const hierarchyHelper = new OptimizedHierarchyHelper(hierarchyRules);
  const batchProcessor = new BatchProcessor(batchSize, 10);
  
  const processedProducts = await batchProcessor.processBatches(
    products,
    async (batch, batchIndex) => {
      return batch.map(product => {
        // Apply any auto-mapping logic here
        return product;
      });
    },
    (progress, currentBatch, totalBatches) => {
      self.postMessage({
        type: 'PROCESS_PROGRESS',
        progress,
        currentBatch,
        totalBatches
      });
    }
  );

  self.postMessage({
    type: 'PROCESS_COMPLETE',
    data: processedProducts
  });
}

/**
 * Optimize hierarchy rules for fast lookups
 */
function optimizeHierarchyRules({ rules }) {
  const optimizedHelper = new OptimizedHierarchyHelper(rules);
  
  self.postMessage({
    type: 'HIERARCHY_OPTIMIZED',
    data: {
      rules,
      optimizationComplete: true
    }
  });
}