import React, { useRef, useCallback, useState } from 'react';
import { MoreVertical, Lock, Unlock } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import { ColumnConfig } from '../hooks/useColumnManagement';

interface ResizableColumnHeaderProps {
  column: ColumnConfig;
  columnIndex: number;
  totalColumns: number;
  frozenColumnCount: number;
  onColumnResize: (columnKey: string, width: number) => void;
  onFreezeColumnsUpTo: (columnIndex: number) => void;
  onUnfreezeAll: () => void;
  onRemoveColumn?: (columnKey: string) => void;
  children: React.ReactNode;
  className?: string;
}

const ResizableColumnHeader: React.FC<ResizableColumnHeaderProps> = ({
  column,
  columnIndex,
  totalColumns,
  frozenColumnCount,
  onColumnResize,
  onFreezeColumnsUpTo,
  onUnfreezeAll,
  onRemoveColumn,
  children,
  className
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizePreview, setResizePreview] = useState<number | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = column.width;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(
        column.minWidth || 10,
        Math.min(column.maxWidth || 500, startWidthRef.current + deltaX)
      );
      setResizePreview(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (resizePreview !== null) {
        onColumnResize(column.key, resizePreview);
        setResizePreview(null);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [column.key, column.width, column.minWidth, column.maxWidth, onColumnResize, resizePreview]);

  const displayWidth = resizePreview !== null ? resizePreview : column.width;
  const isFrozen = columnIndex < frozenColumnCount;
  const canFreeze = columnIndex < totalColumns - 1;
  const hasCustomColumns = !!onRemoveColumn && column.isCustom;

  return (
    <th
      className={cn(
        "text-left p-2 text-sm font-medium border-r border-border relative group",
        "transition-colors duration-200",
        isFrozen && "bg-muted/50 z-20",
        isResizing && "bg-accent/20",
        className
      )}
      style={{
        width: displayWidth,
        minWidth: displayWidth,
        position: isFrozen ? 'sticky' : 'relative',
        left: isFrozen ? 0 : 'auto',
        zIndex: isFrozen ? 20 : 10,
      }}
    >
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* Column Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-50">
            {canFreeze && !isFrozen && (
              <DropdownMenuItem onClick={() => onFreezeColumnsUpTo(columnIndex)}>
                <Lock className="mr-2 h-4 w-4" />
                Freeze columns up to here
              </DropdownMenuItem>
            )}
            {frozenColumnCount > 0 && (
              <DropdownMenuItem onClick={() => onUnfreezeAll()}>
                <Unlock className="mr-2 h-4 w-4" />
                Unfreeze all columns
              </DropdownMenuItem>
            )}
            {hasCustomColumns && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemoveColumn(column.key)}
                  className="text-destructive focus:text-destructive"
                >
                  Remove column
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Resize Handle */}
        {columnIndex < totalColumns - 1 && (
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-primary/30 border-r-2 border-transparent hover:border-primary/50"
            )}
            onMouseDown={handleMouseDown}
            title={`Resize column (${displayWidth}px)`}
          >
            <div className="w-px h-4 bg-muted-foreground" />
          </div>
        )}

        {/* Frozen indicator */}
        {isFrozen && (
          <div className="absolute top-0 right-0 w-1 h-1 bg-primary rounded-full" />
        )}
      </div>

      {/* Resize preview overlay */}
      {isResizing && resizePreview !== null && (
        <div className="absolute top-0 left-0 right-0 bottom-0 bg-primary/10 pointer-events-none flex items-center justify-center">
          <span className="text-xs font-mono bg-primary text-primary-foreground px-1 py-0.5 rounded">
            {resizePreview}px
          </span>
        </div>
      )}
    </th>
  );
};

export default ResizableColumnHeader;