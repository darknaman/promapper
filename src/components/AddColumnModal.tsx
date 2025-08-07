import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus } from 'lucide-react';
import { CustomColumn } from '../types/customColumns';

interface AddColumnModalProps {
  onAddColumn: (column: Omit<CustomColumn, 'id'>) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ onAddColumn, isOpen, onClose }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [columnName, setColumnName] = useState('');
  const [dataType, setDataType] = useState<'text' | 'number'>('text');
  const [defaultValue, setDefaultValue] = useState('');

  const handleAdd = () => {
    if (!columnName.trim()) return;

    onAddColumn({
      name: columnName.trim(),
      dataType,
      defaultValue: defaultValue.trim(),
      width: 120
    });

    // Reset form
    setColumnName('');
    setDataType('text');
    setDefaultValue('');
    
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && columnName.trim()) {
      handleAdd();
    }
  };

  const modalOpen = isOpen !== undefined ? isOpen : internalOpen;
  const handleOpenChange = onClose || setInternalOpen;

  return (
    <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
      {!isOpen && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Column
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Column</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Column Name</Label>
            <Input
              id="column-name"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter column name"
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="data-type">Data Type</Label>
            <Select value={dataType} onValueChange={(value) => setDataType(value as 'text' | 'number')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-value">Default Value (Optional)</Label>
            <Input
              id="default-value"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter default value"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onClose ? onClose() : setInternalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!columnName.trim()}>
              Add Column
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddColumnModal;