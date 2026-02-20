import { cn } from "@/lib/utils";
import { Check, Clock, AlertCircle, Eye, CircleDot } from "lucide-react";

type StatusType = 'open' | 'done' | 'waiting' | 'needs_review' | 'draft' | 'processing' | 'parsed' | 'finalized' | 'error';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
  size?: 'sm' | 'md';
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ElementType; 
  className: string;
}> = {
  open: {
    label: 'Open',
    icon: CircleDot,
    className: 'bg-primary/15 text-primary border-primary/25',
  },
  pending: {
    label: 'Open',
    icon: CircleDot,
    className: 'bg-primary/15 text-primary border-primary/25',
  },
  done: {
    label: 'Done',
    icon: Check,
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
  },
  waiting: {
    label: 'Waiting',
    icon: Clock,
    className: 'bg-violet-600/15 text-violet-600 border-violet-500/25 dark:text-violet-400',
  },
  needs_review: {
    label: 'Needs Review',
    icon: Eye,
    className: 'bg-rose-500/15 text-rose-600 border-rose-500/25 dark:text-rose-400',
  },
  draft: {
    label: 'Draft',
    icon: CircleDot,
    className: 'bg-secondary text-muted-foreground border-border',
  },
  processing: {
    label: 'Processing',
    icon: Clock,
    className: 'bg-blue-500/15 text-blue-600 border-blue-500/25 dark:text-blue-400',
  },
  parsed: {
    label: 'Parsed',
    icon: Check,
    className: 'bg-teal-500/15 text-teal-600 border-teal-500/25 dark:text-teal-400',
  },
  finalized: {
    label: 'Finalized',
    icon: Check,
    className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    className: 'bg-destructive/15 text-destructive border-destructive/25',
  },
};

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium transition-colors flex-shrink-0",
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: string; className?: string }) {
  const config: Record<string, { label: string; className: string }> = {
    high: { label: 'High', className: 'bg-destructive/15 text-destructive border-destructive/25' },
    medium: { label: 'Medium', className: 'bg-violet-600/15 text-violet-600 border-violet-500/25 dark:text-violet-400' },
    low: { label: 'Low', className: 'bg-secondary text-muted-foreground border-border' },
  };
  
  const cfg = config[severity] || config.low;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        cfg.className,
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{cfg.label}</span>
    </span>
  );
}
