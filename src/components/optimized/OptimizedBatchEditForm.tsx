import React, { useState, useCallback, useMemo, memo } from 'react';
import { Product, ClassificationLevel } from '../../types/mapping';
import { BatchEditFormData } from '../../types/batchEdit';
import { OptimizedHierarchyHelper } from '../../utils/optimizedHierarchyHelper';
import OptimizedDropdownCell from './OptimizedDropdownCell';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { X, Save, Eye } from 'lucide-react';
import { useBatchedUpdates } from '../../hooks/usePerformanceOptimizations';

interface OptimizedBatchEditFormProps {
  selectedProducts: Product[];
  hierarchyHelper: OptimizedHierarchyHelper;
  onBatchUpdate: (updates: BatchEditFormData) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

const OptimizedBatchEditForm: React.FC<OptimizedBatchEditFormProps> = memo(({
  selectedProducts,
  hierarchyHelper,
  onBatchUpdate,
  onClose,
  isOpen
}) => {
  const [formData, setFormData] = useState<BatchEditFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { batchUpdate } = useBatchedUpdates();

  // Memoized classification levels
  const classifications: ClassificationLevel[] = useMemo(() => 
    ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'], 
    []
  );

  // Memoized available options for each level
  const availableOptions = useMemo(() => {
    const options: Record<ClassificationLevel, Array<{ value: string; label: string }>> = {} as any;
    
    classifications.forEach(level => {
      options[level] = hierarchyHelper.getAvailableOptions(level, formData);
    });
    
    return options;
  }, [classifications, hierarchyHelper, formData]);

  // Memoized form validation
  const hasChanges = useMemo(() => 
    Object.keys(formData).length > 0, 
    [formData]
  );

  const handleFieldChange = useCallback((level: ClassificationLevel, value: string) => {
    batchUpdate(() => {
      setFormData(prev => {
        const newData = {
          ...prev,
          [level]: value || undefined
        };
        
        // Clear invalid selections first
        const clearedData = hierarchyHelper.clearInvalidSelections(newData, level);
        
        // Auto-complete remaining fields if only one option available
        const autoCompletedData = hierarchyHelper.autoCompleteSelections(clearedData);
        
        return autoCompletedData;
      });
    });
  }, [hierarchyHelper, batchUpdate]);

  const handleClearField = useCallback((level: ClassificationLevel) => {
    batchUpdate(() => {
      setFormData(prev => {
        const newData = { ...prev };
        delete newData[level];
        return newData;
      });
    });
  }, [batchUpdate]);

  const handleSubmit = useCallback(async () => {
    if (!hasChanges) return;
    
    setIsLoading(true);
    setProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      await onBatchUpdate(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Short delay to show completion
      setTimeout(() => {
        onClose();
        setFormData({});
        setProgress(0);
      }, 300);
    } catch (error) {
      console.error('Batch update failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasChanges, formData, onBatchUpdate, onClose]);

  const handleReset = useCallback(() => {
    setFormData({});
    setShowPreview(false);
  }, []);

  // Memoized preview data
  const previewData = useMemo(() => {
    if (!showPreview || !hasChanges) return [];
    
    return selectedProducts.slice(0, 5).map(product => ({
      ...product,
      ...formData
    }));
  }, [selectedProducts, formData, showPreview, hasChanges]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Batch Edit Products</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedProducts.length} selected
              </Badge>
              {hasChanges && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-6 px-2 text-xs"
                >
                  Reset
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Update classification fields for {selectedProducts.length} selected products. 
            Only filled fields will be applied to all selected products.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-2">
          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classifications.map((level) => (
              <div key={level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">
                    {level}
                  </label>
                  {formData[level] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearField(level)}
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      title={`Clear ${level}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <OptimizedDropdownCell
                  value={formData[level] || ''}
                  options={availableOptions[level]}
                  onChange={(value) => handleFieldChange(level, value)}
                  placeholder={`Select ${level}...`}
                  searchable={true}
                  clearable={false}
                />
              </div>
            ))}
          </div>

          {/* Preview Section */}
          {hasChanges && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Changes Summary</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              {/* Changes Summary */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(formData).map(([field, value]) => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field}: {value}
                  </Badge>
                ))}
              </div>

              {/* Preview Data */}
              {showPreview && previewData.length > 0 && (
                <Card className="p-3 max-h-48 overflow-auto">
                  <div className="text-xs font-medium mb-2">
                    Preview (showing first {previewData.length} of {selectedProducts.length} products):
                  </div>
                  <div className="space-y-2 text-xs">
                    {previewData.map((product, index) => (
                      <div key={product.id} className="p-2 bg-muted/30 rounded">
                        <div className="font-medium truncate">{product.title}</div>
                        <div className="text-muted-foreground mt-1 space-y-1">
                          {Object.entries(formData).map(([field, value]) => (
                            <div key={field}>
                              {field}: {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedProducts.length > 5 && (
                      <div className="text-muted-foreground text-center py-2">
                        ... and {selectedProducts.length - 5} more products
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Updating {selectedProducts.length} products...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isLoading}
            className="text-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 text-sm"
          >
            <Save className="h-4 w-4" />
            {isLoading ? `Updating... (${Math.round(progress)}%)` : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

OptimizedBatchEditForm.displayName = 'OptimizedBatchEditForm';

export default OptimizedBatchEditForm;