import React from 'react';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: SortDirection } | null;
  onSort: (key: string, direction: SortDirection) => void;
  width: number;
  className?: string;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  width,
  className
}) => {
  const isCurrentSort = currentSort?.key === sortKey;
  const currentDirection = isCurrentSort ? currentSort.direction : null;

  const handleClick = () => {
    if (currentDirection === null) {
      onSort(sortKey, 'asc');
    } else if (currentDirection === 'asc') {
      onSort(sortKey, 'desc');
    } else {
      onSort(sortKey, null);
    }
  };

  const getSortIcon = () => {
    if (!isCurrentSort || currentDirection === null) {
      return <ChevronsUpDown className="h-3 w-3 opacity-50" />;
    }
    return currentDirection === 'asc' 
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={cn(
        "h-8 px-2 justify-between text-xs font-medium hover:bg-muted/50",
        isCurrentSort && "bg-muted/30",
        className
      )}
      style={{ width }}
    >
      <span className="truncate">{label}</span>
      {getSortIcon()}
    </Button>
  );
};