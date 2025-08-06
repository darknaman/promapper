import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface FooterAttributionProps {
  className?: string;
}

const FooterAttribution: React.FC<FooterAttributionProps> = ({ className }) => {
  return (
    <footer className={cn(
      "fixed bottom-4 left-4 z-30",
      "bg-background/80 backdrop-blur-sm border border-border rounded-lg",
      "px-3 py-2 shadow-lg",
      "text-xs text-muted-foreground",
      "transition-opacity duration-300 hover:opacity-100 opacity-70",
      "pointer-events-auto",
      className
    )}>
      <div className="flex items-center gap-1">
        <span>Made with</span>
        <Heart className="h-3 w-3 text-red-500 fill-current animate-pulse" />
        <span>by</span>
        <span className="font-medium text-foreground">Naman Singla</span>
      </div>
    </footer>
  );
};

export default FooterAttribution;