import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Plus, X } from 'lucide-react';
import { CustomColumn } from '../types/columnManagement';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (column: Omit<CustomColumn, 'id' | 'created'>) => void;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onAddColumn }) => {
  const [formData, setFormData] = useState({
    name: '',
    dataType: 'text' as 'text' | 'number' | 'date' | 'dropdown',
    defaultValue: '',
    required: false,
    sortable: true,
    width: 150,
    minLength: '',
    maxLength: '',
    min: '',
    max: '',
    options: [''],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const validationRules: any = {
      required: formData.required,
    };

    if (formData.dataType === 'text') {
      if (formData.minLength) validationRules.minLength = parseInt(formData.minLength);
      if (formData.maxLength) validationRules.maxLength = parseInt(formData.maxLength);
    } else if (formData.dataType === 'number') {
      if (formData.min) validationRules.min = parseFloat(formData.min);
      if (formData.max) validationRules.max = parseFloat(formData.max);
    } else if (formData.dataType === 'dropdown') {
      validationRules.options = formData.options.filter(opt => opt.trim());
    }

    const newColumn: Omit<CustomColumn, 'id' | 'created'> = {
      name: formData.name.trim(),
      dataType: formData.dataType,
      defaultValue: formData.defaultValue,
      validationRules,
      width: formData.width,
      sortable: formData.sortable,
    };

    onAddColumn(newColumn);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dataType: 'text',
      defaultValue: '',
      required: false,
      sortable: true,
      width: 150,
      minLength: '',
      maxLength: '',
      min: '',
      max: '',
      options: [''],
    });
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Custom Column</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="column-name">Column Name *</Label>
            <Input
              id="column-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter column name"
              required
            />
          </div>

          <div>
            <Label htmlFor="data-type">Data Type</Label>
            <Select
              value={formData.dataType}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, dataType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="dropdown">Dropdown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="default-value">Default Value</Label>
            <Input
              id="default-value"
              value={formData.defaultValue}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultValue: e.target.value }))}
              placeholder="Optional default value"
            />
          </div>

          <div>
            <Label htmlFor="width">Column Width (px)</Label>
            <Input
              id="width"
              type="number"
              value={formData.width}
              onChange={(e) => setFormData(prev => ({ ...prev, width: parseInt(e.target.value) || 150 }))}
              min="50"
              max="500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, required: !!checked }))}
            />
            <Label htmlFor="required">Required field</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sortable"
              checked={formData.sortable}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sortable: !!checked }))}
            />
            <Label htmlFor="sortable">Sortable</Label>
          </div>

          {/* Validation Rules based on data type */}
          {formData.dataType === 'text' && (
            <div className="space-y-2">
              <Label>Text Validation</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="min-length" className="text-xs">Min Length</Label>
                  <Input
                    id="min-length"
                    type="number"
                    value={formData.minLength}
                    onChange={(e) => setFormData(prev => ({ ...prev, minLength: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="max-length" className="text-xs">Max Length</Label>
                  <Input
                    id="max-length"
                    type="number"
                    value={formData.maxLength}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxLength: e.target.value }))}
                    placeholder="255"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.dataType === 'number' && (
            <div className="space-y-2">
              <Label>Number Validation</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="min-value" className="text-xs">Min Value</Label>
                  <Input
                    id="min-value"
                    type="number"
                    value={formData.min}
                    onChange={(e) => setFormData(prev => ({ ...prev, min: e.target.value }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <Label htmlFor="max-value" className="text-xs">Max Value</Label>
                  <Input
                    id="max-value"
                    type="number"
                    value={formData.max}
                    onChange={(e) => setFormData(prev => ({ ...prev, max: e.target.value }))}
                    placeholder="Any"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.dataType === 'dropdown' && (
            <div className="space-y-2">
              <Label>Dropdown Options</Label>
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                  />
                  {formData.options.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Option
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Column</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnModal;