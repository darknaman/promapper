import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface URLCellProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}

const URLCell: React.FC<URLCellProps> = ({ value, onChange, onBlur }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleOpenURL = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    
    try {
      // Add protocol if missing
      let url = value;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="h-8 text-xs"
        placeholder="Enter URL"
      />
    );
  }

  const truncatedValue = value && value.length > 25 ? `${value.substring(0, 25)}...` : value;
  const isValidURL = value && value.trim().length > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1 h-8">
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className="flex-1 px-2 py-1 text-xs cursor-pointer hover:bg-muted/50 rounded truncate min-w-0"
              onDoubleClick={handleDoubleClick}
            >
              {truncatedValue || 'Click to edit'}
            </div>
          </TooltipTrigger>
          {value && value.length > 25 && (
            <TooltipContent side="top" className="max-w-md break-words">
              <p>{value}</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        {isValidURL && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenURL}
                className="h-6 w-6 p-0 hover:bg-accent hover:text-accent-foreground shrink-0"
                aria-label="Open URL in new tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Open in new tab</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default URLCell;