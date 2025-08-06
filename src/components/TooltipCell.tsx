import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface TooltipCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  className?: string;
}

const TooltipCell: React.FC<TooltipCellProps> = memo(({ 
  value, 
  onChange, 
  onBlur,
  className 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    onChange(editValue);
    setIsEditing(false);
    onBlur?.();
  }, [onChange, editValue, onBlur]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  }, [handleSave, value]);

  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`h-8 text-xs border-primary/50 ${className || ''}`}
      />
    );
  }

  const truncatedValue = value && value.length > 30 ? `${value.substring(0, 30)}...` : value;
  const displayValue = truncatedValue || 'Double-click to edit';

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`h-8 px-2 flex items-center text-xs cursor-pointer hover:bg-muted/50 rounded truncate transition-colors ${className || ''}`}
            onDoubleClick={handleDoubleClick}
            title={value}
          >
            <span className="truncate">{displayValue}</span>
          </div>
        </TooltipTrigger>
        {value && value.length > 30 && (
          <TooltipContent side="top" className="max-w-md break-words z-50">
            <p>{value}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
});

TooltipCell.displayName = 'TooltipCell';

export default TooltipCell;