/**
 * Optimized Hierarchy Helper with hash maps and performance improvements
 * Uses O(1) lookups instead of nested loops for better performance with large datasets
 */

import { HierarchyRule, DropdownOption, FilterState, ClassificationLevel } from '../types/mapping';

export class OptimizedHierarchyHelper {
  private rules: HierarchyRule[];
  
  // Hash maps for O(1) lookups instead of O(n) array searches
  private categoryLookup = new Map<string, Set<HierarchyRule>>();
  private subcategoryLookup = new Map<string, Set<HierarchyRule>>();
  private bigCLookup = new Map<string, Set<HierarchyRule>>();
  private smallCLookup = new Map<string, Set<HierarchyRule>>();
  private segmentLookup = new Map<string, Set<HierarchyRule>>();
  private subSegmentLookup = new Map<string, Set<HierarchyRule>>();
  
  // Cached results to avoid repeated calculations
  private optionsCache = new Map<string, DropdownOption[]>();
  private validRulesCache = new Map<string, HierarchyRule[]>();
  
  // Lookup maps for each classification level
  private levelLookupMaps: Record<ClassificationLevel, Map<string, Set<HierarchyRule>>>;

  constructor(rules: HierarchyRule[]) {
    this.rules = rules;
    this.levelLookupMaps = {
      category: this.categoryLookup,
      subcategory: this.subcategoryLookup,
      bigC: this.bigCLookup,
      smallC: this.smallCLookup,
      segment: this.segmentLookup,
      subSegment: this.subSegmentLookup
    };
    
    this.buildHashMaps();
  }

  /**
   * Build hash maps for O(1) lookups
   * This preprocessing step improves performance for large datasets
   */
  private buildHashMaps(): void {
    // Clear existing maps
    Object.values(this.levelLookupMaps).forEach(map => map.clear());

    // Build lookup maps for each classification level
    this.rules.forEach(rule => {
      const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
      
      levels.forEach(level => {
        const value = rule[level];
        if (value && value.trim()) {
          const lookupMap = this.levelLookupMaps[level];
          if (!lookupMap.has(value)) {
            lookupMap.set(value, new Set());
          }
          lookupMap.get(value)!.add(rule);
        }
      });
    });
  }

  /**
   * Get available options for a specific level with optimized lookups
   */
  getAvailableOptions(level: ClassificationLevel, currentSelections: FilterState): DropdownOption[] {
    const cacheKey = this.generateCacheKey(level, currentSelections);
    
    // Return cached result if available
    if (this.optionsCache.has(cacheKey)) {
      return this.optionsCache.get(cacheKey)!;
    }

    // Get valid rules using optimized filtering
    const validRules = this.getValidRules(currentSelections, level);
    
    // Extract unique values for the target level
    const uniqueValues = new Set<string>();
    validRules.forEach(rule => {
      const value = rule[level];
      if (value && value.trim()) {
        uniqueValues.add(value.trim());
      }
    });

    // Create options array and cache result
    const options = Array.from(uniqueValues)
      .sort()
      .map(value => ({ label: value, value }));
    
    this.optionsCache.set(cacheKey, options);
    return options;
  }

  /**
   * Get valid rules using optimized intersection logic
   */
  private getValidRules(selections: FilterState, excludeLevel?: ClassificationLevel): HierarchyRule[] {
    const cacheKey = this.generateValidRulesCacheKey(selections, excludeLevel);
    
    if (this.validRulesCache.has(cacheKey)) {
      return this.validRulesCache.get(cacheKey)!;
    }

    const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    const selectedLevels = levels.filter(level => 
      level !== excludeLevel && selections[level] && selections[level].trim()
    );

    let validRules: Set<HierarchyRule>;

    if (selectedLevels.length === 0) {
      // If no selections, return all rules
      validRules = new Set(this.rules);
    } else {
      // Start with rules matching the first selected level
      const firstLevel = selectedLevels[0];
      const firstValue = selections[firstLevel]!;
      const firstLevelRules = this.levelLookupMaps[firstLevel].get(firstValue);
      
      if (!firstLevelRules || firstLevelRules.size === 0) {
        validRules = new Set();
      } else {
        validRules = new Set(firstLevelRules);

        // Intersect with rules from other selected levels
        for (let i = 1; i < selectedLevels.length; i++) {
          const level = selectedLevels[i];
          const value = selections[level]!;
          const levelRules = this.levelLookupMaps[level].get(value);
          
          if (!levelRules || levelRules.size === 0) {
            validRules = new Set();
            break;
          }

          // Intersection: keep only rules that exist in both sets
          validRules = new Set([...validRules].filter(rule => levelRules.has(rule)));
          
          if (validRules.size === 0) break;
        }
      }
    }

    const result = Array.from(validRules);
    this.validRulesCache.set(cacheKey, result);
    return result;
  }

  /**
   * Generate cache key for options
   */
  private generateCacheKey(level: ClassificationLevel, selections: FilterState): string {
    const relevantSelections = { ...selections };
    delete relevantSelections[level]; // Exclude the target level
    
    return `${level}-${JSON.stringify(relevantSelections)}`;
  }

  /**
   * Generate cache key for valid rules
   */
  private generateValidRulesCacheKey(selections: FilterState, excludeLevel?: ClassificationLevel): string {
    const relevantSelections = { ...selections };
    if (excludeLevel) {
      delete relevantSelections[excludeLevel];
    }
    
    return `valid-${JSON.stringify(relevantSelections)}`;
  }

  /**
   * Check if a combination is valid using optimized lookup
   */
  isValidCombination(selections: FilterState): boolean {
    const validRules = this.getValidRules(selections);
    return validRules.length > 0;
  }

  /**
   * Auto-complete selections when only one option remains
   */
  autoCompleteSelections(selections: FilterState): FilterState {
    const newSelections = { ...selections };
    const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    
    let hasChanges = true;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (hasChanges && iterations < maxIterations) {
      hasChanges = false;
      iterations++;
      
      for (const level of levels) {
        if (!newSelections[level]) {
          const options = this.getAvailableOptions(level, newSelections);
          if (options.length === 1) {
            newSelections[level] = options[0].value;
            hasChanges = true;
          }
        }
      }
    }
    
    return newSelections;
  }

  /**
   * Clear invalid selections after a change
   */
  clearInvalidSelections(selections: FilterState, changedLevel: ClassificationLevel): FilterState {
    const newSelections = { ...selections };
    const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    
    for (const level of levels) {
      if (level !== changedLevel && newSelections[level]) {
        const options = this.getAvailableOptions(level, newSelections);
        const isValid = options.some(option => option.value === newSelections[level]);
        if (!isValid) {
          newSelections[level] = undefined;
        }
      }
    }
    
    return newSelections;
  }

  /**
   * Get all unique values for a specific level using hash map
   */
  getAllValuesForLevel(level: ClassificationLevel): DropdownOption[] {
    const lookupMap = this.levelLookupMaps[level];
    
    return Array.from(lookupMap.keys())
      .sort()
      .map(value => ({ label: value, value }));
  }

  /**
   * Clear all caches (call when rules change)
   */
  clearCache(): void {
    this.optionsCache.clear();
    this.validRulesCache.clear();
  }

  /**
   * Legacy compatibility methods for existing code
   */
  getMatchingRule(selections: FilterState): HierarchyRule | null {
    const validRules = this.getValidRules(selections);
    return validRules.length > 0 ? validRules[0] : null;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalRules: number;
    cacheSize: number;
    validRulesCacheSize: number;
    avgRulesPerCategory: number;
  } {
    const totalRules = this.rules.length;
    const cacheSize = this.optionsCache.size;
    const validRulesCacheSize = this.validRulesCache.size;
    
    let totalMappings = 0;
    Object.values(this.levelLookupMaps).forEach(map => {
      totalMappings += map.size;
    });
    
    return {
      totalRules,
      cacheSize,
      validRulesCacheSize,
      avgRulesPerCategory: totalMappings > 0 ? Math.round(totalRules / totalMappings) : 0
    };
  }
}
