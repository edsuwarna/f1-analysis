import { useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}

export default function CollapsibleCard({
  title, subtitle, icon, defaultOpen = false,
  children, className = '', badge,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-muted/20 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <div className="min-w-0">
            <h3 className="font-semibold text-sm flex items-center gap-2 truncate">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {open && <div className="border-t border-border">{children}</div>}
    </Card>
  );
}
