import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface DetectedColumn {
  name: string;
  dataType: 'text' | 'number';
  sampleValues: string[];
}

interface CSVColumnPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedColumns: string[]) => void;
  detectedColumns: DetectedColumn[];
}

export const CSVColumnPreviewDialog: React.FC<CSVColumnPreviewDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  detectedColumns
}) => {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(detectedColumns.map(col => col.name))
  );

  const handleColumnToggle = (columnName: string, checked: boolean) => {
    const newSelection = new Set(selectedColumns);
    if (checked) {
      newSelection.add(columnName);
    } else {
      newSelection.delete(columnName);
    }
    setSelectedColumns(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedColumns(new Set(detectedColumns.map(col => col.name)));
    } else {
      setSelectedColumns(new Set());
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedColumns));
    onClose();
  };

  const allSelected = selectedColumns.size === detectedColumns.length;
  const someSelected = selectedColumns.size > 0 && selectedColumns.size < detectedColumns.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>New Columns Detected in CSV</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Found {detectedColumns.length} new columns. Select which ones to add to your table.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              className={someSelected ? "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" : ""}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All ({detectedColumns.length} columns)
            </label>
          </div>

          <ScrollArea className="max-h-[400px] border rounded-md p-4">
            <div className="space-y-4">
              {detectedColumns.map((column) => (
                <div key={column.name} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`column-${column.name}`}
                      checked={selectedColumns.has(column.name)}
                      onCheckedChange={(checked) => 
                        handleColumnToggle(column.name, checked as boolean)
                      }
                    />
                    <div className="flex items-center space-x-2 flex-1">
                      <label
                        htmlFor={`column-${column.name}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {column.name}
                      </label>
                      <Badge variant={column.dataType === 'number' ? 'default' : 'secondary'}>
                        {column.dataType}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="ml-6 space-y-1">
                    <p className="text-xs text-muted-foreground">Sample values:</p>
                    <div className="flex flex-wrap gap-1">
                      {column.sampleValues.slice(0, 5).map((value, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {value || '(empty)'}
                        </Badge>
                      ))}
                      {column.sampleValues.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{column.sampleValues.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedColumns.size === 0}
          >
            Add Selected Columns ({selectedColumns.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};