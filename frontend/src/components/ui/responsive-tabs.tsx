import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface TabItem {
  value: string;
  icon?: React.ReactNode;
  label: string | React.ReactNode;
  content: React.ReactNode;
}

interface ResponsiveTabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function ResponsiveTabs({ tabs, value, onValueChange, className }: ResponsiveTabsProps) {
  const activeTab = tabs.find(t => t.value === value);

  return (
    <div className={cn('space-y-1', className)}>
      {/* ── Mobile: accordion view ── */}
      <div className="md:hidden space-y-1">
        {tabs.map(tab => {
          const isActive = value === tab.value;
          return (
            <div key={tab.value}>
              <button
                onClick={() => onValueChange(isActive ? '' : tab.value)}
                className={cn(
                  'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors border',
                  isActive
                    ? 'bg-muted/80 border-border text-foreground'
                    : 'bg-muted/30 border-transparent hover:bg-muted/50 hover:border-border text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                  {tab.icon && <span className="shrink-0">{tab.icon}</span>}
                  <span className="truncate">{tab.label}</span>
                </div>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    isActive && 'rotate-180'
                  )}
                />
              </button>
              {isActive && <div className="mt-3 pb-2">{tab.content}</div>}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: traditional tab view ── */}
      <div className="hidden md:block">
        <div className="flex gap-1 bg-muted rounded-lg p-[3px] overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => onValueChange(tab.value)}
              data-state={value === tab.value ? 'active' : 'inactive'}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all',
                'text-foreground/60 hover:text-foreground',
                value === tab.value && 'bg-background text-foreground shadow-sm'
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-4">{activeTab?.content}</div>
      </div>
    </div>
  );
}
