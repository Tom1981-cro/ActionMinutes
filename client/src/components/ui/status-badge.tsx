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
    className: 'bg-muted text-muted-foreground border-border',
  },
  done: {
    label: 'Done',
    icon: Check,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  waiting: {
    label: 'Waiting',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  needs_review: {
    label: 'Needs Review',
    icon: Eye,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  draft: {
    label: 'Draft',
    icon: CircleDot,
    className: 'bg-muted text-muted-foreground border-border',
  },
  processing: {
    label: 'Processing',
    icon: Clock,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  parsed: {
    label: 'Parsed',
    icon: Check,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  finalized: {
    label: 'Finalized',
    icon: Check,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open;
  const Icon = config.icon;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
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
    high: { label: 'High', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    medium: { label: 'Medium', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    low: { label: 'Low', className: 'bg-muted text-muted-foreground border-border' },
  };
  
  const cfg = config[severity] || config.low;
  
  return (
    <span 
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        cfg.className,
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5" />
      <span>{cfg.label}</span>
    </span>
  );
}
