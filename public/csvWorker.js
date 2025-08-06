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
 * Parse CSV file with enhanced processing and memory management
 */
async function parseCsvFile({ file, expectedHeaders, fileType }) {
  return new Promise((resolve, reject) => {
    const results = [];
    let totalRows = 0;
    let processedRows = 0;
    let estimatedMemoryUsage = 0;
    let lastProgressTime = Date.now();
    let isFirstChunk = true;
    
    // Calculate optimal chunk size based on file size
    const fileSizeMB = file.size / (1024 * 1024);
    let chunkSize;
    
    if (fileSizeMB > 50) {
      chunkSize = 1024 * 256; // 256KB for very large files
    } else if (fileSizeMB > 10) {
      chunkSize = 1024 * 512; // 512KB for large files  
    } else {
      chunkSize = 1024 * 1024; // 1MB for smaller files
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      chunkSize: chunkSize,
      chunk: async function(chunk) {
        try {
          if (isFirstChunk) {
            // Better row estimation
            const avgRowSize = file.size / chunk.data.length;
            totalRows = Math.min(Math.round(file.size / avgRowSize), 2000000); // Cap at 2M rows
            isFirstChunk = false;
            
            // Inform about large file processing
            if (fileSizeMB > 20) {
              self.postMessage({
                type: 'PARSE_PROGRESS',
                progress: 0,
                processedRows: 0,
                totalRows,
                message: `Processing large file (${fileSizeMB.toFixed(1)}MB)...`
              });
            }
          }
        
          // Process chunk data with memory-aware batching
          const processedChunk = [];
          const batchSize = Math.min(1000, Math.max(100, Math.floor(10000 / (fileSizeMB || 1)))); // Dynamic batch size
          
          for (let i = 0; i < chunk.data.length; i += batchSize) {
            const batch = chunk.data.slice(i, i + batchSize);
            
            const processedBatch = batch.map((row, index) => {
              if (fileType === 'products') {
                // Keep ALL original CSV columns for custom column detection
                console.log('Worker processing CSV row with headers:', Object.keys(row));
                return {
                  ...row, // Preserve all original CSV columns
                  // Ensure core fields have fallbacks
                  id: row.id || row.ID || row.productId || row.sku || `product-${processedRows + i + index}`,
                  title: row.title || row.Title || row.name || row.Name || row.productName || '',
                  brand: row.brand || row.Brand || '',
                  url: row.url || row.URL || row.link || ''
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
            
            processedChunk.push(...processedBatch);
            
            // Yield control periodically to prevent blocking
            if (i % 2000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }

          results.push(...processedChunk);
          processedRows += chunk.data.length;
          
          // Estimate memory usage (rough calculation)
          estimatedMemoryUsage = results.length * 0.5; // KB per row
          
          // Memory management check
          if (estimatedMemoryUsage > 512 * 1024) { // 512MB limit
            self.postMessage({
              type: 'PARSE_ERROR',
              error: `File too large for memory (${(estimatedMemoryUsage/1024).toFixed(0)}MB). Please use a smaller file.`
            });
            return;
          }

          // Throttled progress updates (every 250ms for responsiveness)
          const now = Date.now();
          if (now - lastProgressTime > 250) {
            const progress = Math.min(Math.round((processedRows / Math.max(totalRows, processedRows)) * 100), 100);
            self.postMessage({
              type: 'PARSE_PROGRESS',
              progress,
              processedRows,
              totalRows: Math.max(totalRows, processedRows),
              memoryUsage: Math.round(estimatedMemoryUsage / 1024) // MB
            });
            lastProgressTime = now;
          }
          
        } catch (error) {
          self.postMessage({
            type: 'PARSE_ERROR',
            error: `Chunk processing error: ${error.message}`
          });
          return;
        }
      },
      complete: function() {
        try {
          if (results.length === 0) {
            self.postMessage({
              type: 'PARSE_ERROR',
              error: 'No valid data found in CSV file. Please check the file format.'
            });
            return;
          }
          
          console.log('CSV parsing complete. Total results:', results.length);
          self.postMessage({
            type: 'PARSE_COMPLETE',
            data: results,
            fileType,
            stats: {
              totalRows: results.length,
              memoryUsage: Math.round(estimatedMemoryUsage / 1024), // MB
              fileSize: fileSizeMB.toFixed(1)
            }
          });
          
          resolve(results);
          
        } catch (error) {
          self.postMessage({
            type: 'PARSE_ERROR',
            error: `Completion error: ${error.message}`
          });
          reject(error);
        }
      },
      error: function(error) {
        console.error('CSV parsing error:', error);
        self.postMessage({
          type: 'PARSE_ERROR',
          error: `CSV parsing failed: ${error.message || error}`
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