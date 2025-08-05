import React, { useState, useCallback } from 'react';
import { Product, ClassificationLevel } from '../types/mapping';
import { BatchEditFormData } from '../types/batchEdit';
import { OptimizedHierarchyHelper } from '../utils/optimizedHierarchyHelper';
import CascadingSelect from './CascadingSelect';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { X, Save, Eye } from 'lucide-react';

interface BatchEditFormProps {
  selectedProducts: Product[];
  hierarchyHelper: OptimizedHierarchyHelper;
  onBatchUpdate: (updates: BatchEditFormData) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

const BatchEditForm: React.FC<BatchEditFormProps> = ({
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

  const classifications: ClassificationLevel[] = ['category', 'subcategory', 'bigC', 'smallC', 'segment', 'subSegment'];

  const handleFieldChange = useCallback((level: ClassificationLevel, value: string | null) => {
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
  }, [hierarchyHelper]);

  const handleClearField = useCallback((level: ClassificationLevel) => {
    setFormData(prev => {
      const newData = { ...prev };
      delete newData[level];
      return newData;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (Object.keys(formData).length === 0) return;
    
    setIsLoading(true);
    setProgress(0);
    
    try {
      // Simulate progress for UI feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      await onBatchUpdate(formData);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setTimeout(() => {
        onClose();
        setFormData({});
        setProgress(0);
      }, 500);
    } catch (error) {
      console.error('Batch update failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [formData, onBatchUpdate, onClose]);

  const previewChanges = () => {
    return selectedProducts.map(product => ({
      ...product,
      ...formData
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Batch Edit Products</span>
            <Badge variant="outline">{selectedProducts.length} selected</Badge>
          </DialogTitle>
          <DialogDescription>
            Update classification fields for {selectedProducts.length} selected products. Only filled fields will be updated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-visible">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible">
            {classifications.map((level) => (
              <div key={level} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium capitalize">{level}</label>
                  {formData[level] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearField(level)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <CascadingSelect
                  options={hierarchyHelper.getAvailableOptions(level, formData)}
                  value={formData[level]}
                  onChange={(value) => handleFieldChange(level, value)}
                  placeholder={`Select ${level}...`}
                  className="h-10"
                />
              </div>
            ))}
          </div>

          {/* Preview Section */}
          {Object.keys(formData).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>

              {showPreview && (
                <Card className="p-4 max-h-60 overflow-auto">
                  <h4 className="font-medium mb-2">Changes Preview:</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(formData).map(([field, value]) => (
                      <div key={field} className="flex gap-2">
                        <span className="font-medium capitalize">{field}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Updating products...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(formData).length === 0 || isLoading}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isLoading ? 'Updating...' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchEditForm;