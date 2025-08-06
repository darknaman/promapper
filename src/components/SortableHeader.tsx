import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal, Pin } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { SortConfig } from '../types/columnManagement';
import { cn } from '../lib/utils';

interface SortableHeaderProps {
  column: {
    key: string;
    title: string;
    width: number;
    sortable?: boolean;
    hasCheckbox?: boolean;
  };
  sortConfigs: SortConfig[];
  freezePosition: number;
  columnIndex: number;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onRemoveSort: (column: string) => void;
  onFreezeHere: (position: number) => void;
  onColumnResize: (column: string, width: number) => void;
  children?: React.ReactNode;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  column,
  sortConfigs,
  freezePosition,
  columnIndex,
  onSort,
  onRemoveSort,
  onFreezeHere,
  onColumnResize,
  children,
}) => {
  const sortInfo = sortConfigs.find(sort => sort.column === column.key);
  const isSortable = column.sortable !== false;
  const isFrozen = columnIndex <= freezePosition;

  const handleSort = (direction: 'asc' | 'desc') => {
    if (sortInfo?.direction === direction) {
      onRemoveSort(column.key);
    } else {
      onSort(column.key, direction);
    }
  };

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = column.width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      onColumnResize(column.key, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.key, column.width, onColumnResize]);

  return (
    <th 
      className={cn(
        "relative group bg-muted/30 border-b border-border h-12 px-3",
        isFrozen && "sticky left-0 z-10 bg-background border-r-2 border-primary/20"
      )}
      style={{ width: column.width, minWidth: column.width }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 h-full">
        {column.hasCheckbox && children}
        
        <span className="font-medium text-sm text-foreground truncate">
          {column.title}
        </span>

        {isFrozen && (
          <Pin className="h-3 w-3 text-primary/60" />
        )}

        {sortInfo && (
          <Badge variant="secondary" className="text-xs px-1">
            {sortInfo.priority}
          </Badge>
        )}

        {isSortable && (
          <div className="flex items-center">
            {!sortInfo && (
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
            )}
            {sortInfo?.direction === 'asc' && (
              <ArrowUp className="h-3 w-3 text-primary" />
            )}
            {sortInfo?.direction === 'desc' && (
              <ArrowDown className="h-3 w-3 text-primary" />
            )}
          </div>
        )}
      </div>

      {/* Sort Controls */}
      {isSortable && (
        <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              <DropdownMenuItem onClick={() => handleSort('asc')}>
                <ArrowUp className="h-3 w-3 mr-2" />
                Sort Ascending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('desc')}>
                <ArrowDown className="h-3 w-3 mr-2" />
                Sort Descending
              </DropdownMenuItem>
              {sortInfo && (
                <DropdownMenuItem onClick={() => onRemoveSort(column.key)}>
                  Remove Sort
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onFreezeHere(columnIndex)}>
                <Pin className="h-3 w-3 mr-2" />
                Freeze Here
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
        onMouseDown={handleMouseDown}
        title="Resize column"
      />
    </th>
  );
};

export default SortableHeader;