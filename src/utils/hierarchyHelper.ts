import { HierarchyRule, DropdownOption, FilterState, ClassificationLevel } from '../types/mapping';

export class HierarchyHelper {
  private rules: HierarchyRule[];

  constructor(rules: HierarchyRule[]) {
    this.rules = rules;
  }

  // Memoized cache for performance optimization
  private optionsCache = new Map<string, DropdownOption[]>();
  private filteredRulesCache = new Map<string, HierarchyRule[]>();

  // Get available options for a specific level based on current selections
  getAvailableOptions(level: ClassificationLevel, currentSelections: FilterState): DropdownOption[] {
    const cacheKey = this.getCacheKey(level, currentSelections);
    
    if (this.optionsCache.has(cacheKey)) {
      return this.optionsCache.get(cacheKey)!;
    }

    const filteredRules = this.getFilteredRules(currentSelections, level);
    const uniqueValues = new Set<string>();
    
    filteredRules.forEach(rule => {
      const value = rule[level];
      if (value && value.trim()) {
        uniqueValues.add(value.trim());
      }
    });

    const options = Array.from(uniqueValues)
      .sort()
      .map(value => ({ label: value, value }));
    
    this.optionsCache.set(cacheKey, options);
    return options;
  }

  // Generate cache key for memoization
  private getCacheKey(level: ClassificationLevel, selections: FilterState, excludeLevel?: ClassificationLevel): string {
    const relevantSelections = { ...selections };
    if (excludeLevel) {
      delete relevantSelections[excludeLevel];
    }
    return `${level}-${JSON.stringify(relevantSelections)}`;
  }

  // Get filtered rules based on current selections, excluding the specified level
  private getFilteredRules(selections: FilterState, excludeLevel?: ClassificationLevel): HierarchyRule[] {
    const cacheKey = `filtered-${JSON.stringify(selections)}-${excludeLevel || 'none'}`;
    
    if (this.filteredRulesCache.has(cacheKey)) {
      return this.filteredRulesCache.get(cacheKey)!;
    }

    const filteredRules = this.rules.filter(rule => {
      const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
      
      return levels.every(level => {
        if (level === excludeLevel) return true; // Don't filter on the level we're updating
        const selectedValue = selections[level];
        return !selectedValue || rule[level] === selectedValue;
      });
    });

    this.filteredRulesCache.set(cacheKey, filteredRules);
    return filteredRules;
  }

  // Clear caches when rules change
  clearCache(): void {
    this.optionsCache.clear();
    this.filteredRulesCache.clear();
  }

  // Check if a combination of selections is valid
  isValidCombination(selections: FilterState): boolean {
    const matchingRules = this.getFilteredRules(selections);
    return matchingRules.length > 0;
  }

  // Get the first valid rule that matches the current selections
  getMatchingRule(selections: FilterState): HierarchyRule | null {
    const matchingRules = this.getFilteredRules(selections);
    return matchingRules.length > 0 ? matchingRules[0] : null;
  }

  // Auto-complete selections when only one option remains
  autoCompleteSelections(selections: FilterState): FilterState {
    const newSelections = { ...selections };
    const levels: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];
    
    let changed = true;
    while (changed) {
      changed = false;
      
      for (const level of levels) {
        if (!newSelections[level]) {
          const options = this.getAvailableOptions(level, newSelections);
          if (options.length === 1) {
            newSelections[level] = options[0].value;
            changed = true;
          }
        }
      }
    }
    
    return newSelections;
  }

  // Clear invalid selections after a change
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

  // Get all unique values for a specific level
  getAllValuesForLevel(level: ClassificationLevel): DropdownOption[] {
    const uniqueValues = new Set<string>();
    
    this.rules.forEach(rule => {
      const value = rule[level];
      if (value && value.trim()) {
        uniqueValues.add(value.trim());
      }
    });

    return Array.from(uniqueValues)
      .sort()
      .map(value => ({ label: value, value }));
  }
}