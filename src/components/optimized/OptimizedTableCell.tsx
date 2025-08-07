import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface OptimizedTableCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  width?: number;
  isEditable?: boolean;
  type?: 'text' | 'url' | 'readonly';
  placeholder?: string;
  validation?: (value: string) => string | null;
}

const OptimizedTableCell: React.FC<OptimizedTableCellProps> = memo(({
  value,
  onChange,
  onBlur,
  className,
  width,
  isEditable = true,
  type = 'text',
  placeholder = '',
  validation
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Sync edit value with prop value
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Auto-focus when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (isEditable && type !== 'readonly') {
      setIsEditing(true);
    }
  }, [isEditable, type]);

  const handleSave = useCallback(() => {
    let valueToSave = editValue;
    
    // Validate if validation function provided
    if (validation) {
      const validationError = validation(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    setError(null);
    onChange(valueToSave);
    setIsEditing(false);
    onBlur?.();
  }, [editValue, onChange, onBlur, validation]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setError(null);
    setIsEditing(false);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        handleSave();
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
      case 'Tab':
        // Allow tab to propagate for navigation
        handleSave();
        break;
    }
  }, [handleSave, handleCancel]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
    setError(null); // Clear error on change
  }, []);

  const cellStyle = width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {};

  if (isEditing) {
    return (
      <div 
        ref={cellRef}
        className={cn(
          "relative h-8 flex items-center",
          className
        )}
        style={cellStyle}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleInputChange}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full h-full px-2 text-xs border border-primary bg-background text-foreground",
            "focus:outline-none focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:ring-destructive"
          )}
          placeholder={placeholder}
        />
        {error && (
          <div className="absolute top-full left-0 z-50 mt-1 p-1 text-xs text-destructive bg-destructive/10 border border-destructive rounded shadow-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  const displayValue = value || placeholder;
  const isUrl = type === 'url' && value;

  return (
    <div
      ref={cellRef}
      className={cn(
        "h-8 px-2 flex items-center text-xs truncate",
        "hover:bg-muted/50 transition-colors duration-150",
        isEditable && "cursor-pointer",
        type === 'readonly' && "text-muted-foreground bg-muted/30",
        className
      )}
      style={cellStyle}
      onDoubleClick={handleDoubleClick}
      title={value}
    >
      {isUrl ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {displayValue}
        </a>
      ) : (
        <span className="truncate">
          {displayValue}
        </span>
      )}
    </div>
  );
});

OptimizedTableCell.displayName = 'OptimizedTableCell';

export default OptimizedTableCell;