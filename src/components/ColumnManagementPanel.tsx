import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { 
  Settings, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Columns, 
  Eye, 
  EyeOff, 
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Pin,
  PinOff
} from 'lucide-react';
import { CustomColumn, SortConfig } from '../types/columnManagement';
import { cn } from '../lib/utils';
import AddColumnModal from './AddColumnModal';

interface ColumnManagementPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  customColumns: CustomColumn[];
  sortConfigs: SortConfig[];
  freezePosition: number;
  hiddenColumns: string[];
  onAddColumn: (column: Omit<CustomColumn, 'id' | 'created'>) => void;
  onRemoveColumn: (columnId: string) => void;
  onSetFreezePosition: (position: number) => void;
  onToggleColumnVisibility: (columnKey: string) => void;
  onAddSort: (column: string, direction: 'asc' | 'desc') => void;
  onRemoveSort: (column: string) => void;
  onClearAllSorts: () => void;
  allColumns: Array<{ key: string; title: string; sortable?: boolean }>;
}

const ColumnManagementPanel: React.FC<ColumnManagementPanelProps> = ({
  isOpen,
  onToggle,
  customColumns,
  sortConfigs,
  freezePosition,
  hiddenColumns,
  onAddColumn,
  onRemoveColumn,
  onSetFreezePosition,
  onToggleColumnVisibility,
  onAddSort,
  onRemoveSort,
  onClearAllSorts,
  allColumns,
}) => {
  const [showAddColumnModal, setShowAddColumnModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    columns: true,
    sorting: false,
    freeze: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getSortInfo = (columnKey: string) => {
    return sortConfigs.find(sort => sort.column === columnKey);
  };

  const handleSortChange = (columnKey: string, direction: 'asc' | 'desc' | null) => {
    if (direction === null) {
      onRemoveSort(columnKey);
    } else {
      onAddSort(columnKey, direction);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 shadow-lg"
      >
        <Settings className="h-4 w-4 mr-2" />
        Manage Columns
      </Button>
    );
  }

  return (
    <>
      <Card className="fixed top-4 right-4 w-80 max-h-[90vh] overflow-y-auto z-50 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Columns className="h-5 w-5" />
              Column Management
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Custom Columns Section */}
          <Collapsible open={expandedSections.columns} onOpenChange={() => toggleSection('columns')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span className="flex items-center gap-2">
                  {expandedSections.columns ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Custom Columns ({customColumns.length})
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              <Button
                onClick={() => setShowAddColumnModal(true)}
                size="sm"
                className="w-full"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Column
              </Button>
              
              {customColumns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No custom columns yet
                </p>
              ) : (
                <div className="space-y-1">
                  {customColumns.map((column) => (
                    <div key={column.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{column.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {column.dataType} • {column.width}px
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleColumnVisibility(column.id)}
                          title={hiddenColumns.includes(column.id) ? 'Show column' : 'Hide column'}
                        >
                          {hiddenColumns.includes(column.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveColumn(column.id)}
                          title="Delete column"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Sorting Section */}
          <Collapsible open={expandedSections.sorting} onOpenChange={() => toggleSection('sorting')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span className="flex items-center gap-2">
                  {expandedSections.sorting ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Sorting ({sortConfigs.length} active)
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              {sortConfigs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAllSorts}
                  className="w-full"
                >
                  Clear All Sorts
                </Button>
              )}
              
              <div className="space-y-1">
                {allColumns.map((column) => {
                  const sortInfo = getSortInfo(column.key);
                  const isSortable = column.sortable !== false;
                  
                  return (
                    <div key={column.key} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <span className="flex-1 font-medium">{column.title}</span>
                      <div className="flex items-center gap-1">
                        {sortInfo && (
                          <Badge variant="secondary" className="text-xs">
                            #{sortInfo.priority}
                          </Badge>
                        )}
                        {isSortable && (
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSortChange(column.key, sortInfo?.direction === 'asc' ? null : 'asc')}
                              className={cn(
                                "p-1",
                                sortInfo?.direction === 'asc' && "bg-primary text-primary-foreground"
                              )}
                              title="Sort ascending"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSortChange(column.key, sortInfo?.direction === 'desc' ? null : 'desc')}
                              className={cn(
                                "p-1",
                                sortInfo?.direction === 'desc' && "bg-primary text-primary-foreground"
                              )}
                              title="Sort descending"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Freeze Panes Section */}
          <Collapsible open={expandedSections.freeze} onOpenChange={() => toggleSection('freeze')}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span className="flex items-center gap-2">
                  {expandedSections.freeze ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Freeze Panes
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Select the last column to freeze:
              </div>
              <RadioGroup
                value={freezePosition.toString()}
                onValueChange={(value) => onSetFreezePosition(parseInt(value))}
              >
                {allColumns.map((column, index) => (
                  <div key={column.key} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`freeze-${index}`} />
                    <Label htmlFor={`freeze-${index}`} className="text-sm flex items-center gap-2">
                      {index <= freezePosition ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
                      {column.title}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CollapsibleContent>
          </Collapsible>

          {/* Column Visibility */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Column Visibility</Label>
            {allColumns.map((column) => (
              <div key={column.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`visible-${column.key}`}
                  checked={!hiddenColumns.includes(column.key)}
                  onCheckedChange={() => onToggleColumnVisibility(column.key)}
                />
                <Label htmlFor={`visible-${column.key}`} className="text-sm">
                  {column.title}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AddColumnModal
        isOpen={showAddColumnModal}
        onClose={() => setShowAddColumnModal(false)}
        onAddColumn={onAddColumn}
      />
    </>
  );
};

export default ColumnManagementPanel;