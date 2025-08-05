import React, { useRef, useCallback, forwardRef } from 'react';

interface ResizableHeaderProps {
  columns: Array<{
    key: string;
    title: string;
    width: number;
    hasCheckbox?: boolean;
  }>;
  onColumnResize: (column: string, width: number) => void;
}

const ResizableHeader = forwardRef<HTMLDivElement, ResizableHeaderProps>(({ columns, onColumnResize }, ref) => {
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const currentColumnRef = useRef<string>('');

  const handleMouseDown = useCallback((e: React.MouseEvent, column: string, currentWidth: number) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = currentWidth;
    currentColumnRef.current = column;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.max(60, startWidthRef.current + deltaX);
      onColumnResize(currentColumnRef.current, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onColumnResize]);

  const gridTemplateColumns = columns.map(col => `${col.width}px`).join(' ');

  return (
    <div className="border-b bg-muted/30 overflow-x-auto" ref={ref}>
      <div className="p-4">
        <div className="grid gap-2 text-sm font-medium text-foreground" style={{ gridTemplateColumns }}>
          {columns.map((column, index) => (
            <div key={column.key} className="flex items-center gap-1 relative group">
              <span>{column.title}</span>
              {column.hasCheckbox && (
                <input type="checkbox" defaultChecked className="w-3 h-3" title="Enable editing" />
              )}
              {index < columns.length - 1 && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 group-hover:bg-primary/30"
                  onMouseDown={(e) => handleMouseDown(e, column.key, column.width)}
                  title="Resize column"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

ResizableHeader.displayName = 'ResizableHeader';

export default ResizableHeader;