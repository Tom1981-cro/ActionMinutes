import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("glass-panel rounded-2xl overflow-hidden", className)}>
      <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex justify-between items-start gap-4">
          <Skeleton className="h-6 w-3/4 bg-muted" />
          <Skeleton className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <Skeleton className="h-4 w-32 mt-2 bg-muted" />
      </CardHeader>
      <CardContent className="pb-3 px-4 md:px-6">
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-2/3 mt-2 bg-muted" />
      </CardContent>
    </Card>
  );
}

export function ActionCardSkeleton() {
  return (
    <Card className="glass-panel rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-5 w-full bg-muted" />
            <Skeleton className="h-5 w-3/4 bg-muted" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full bg-muted" />
              <Skeleton className="h-5 w-20 rounded-full bg-muted" />
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-4 w-20 bg-muted" />
        </div>
      </CardContent>
      <div className="border-t border-border bg-muted px-2 py-2">
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-xl bg-muted" />
          <Skeleton className="h-11 flex-1 rounded-xl bg-muted" />
          <Skeleton className="h-11 flex-1 rounded-xl bg-muted" />
          <Skeleton className="h-11 flex-1 rounded-xl bg-muted" />
        </div>
      </div>
    </Card>
  );
}

export function MeetingCardSkeleton() {
  return (
    <Card className="glass-panel rounded-2xl overflow-hidden">
      <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
          <Skeleton className="h-6 w-3/4 bg-muted" />
          <Skeleton className="h-5 w-24 rounded-full bg-muted" />
        </div>
        <Skeleton className="h-4 w-28 mt-2 bg-muted" />
      </CardHeader>
      <CardContent className="pb-3 px-4 md:px-6">
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-4/5 mt-2 bg-muted" />
      </CardContent>
      <div className="px-4 pb-4 md:px-6 md:pb-5">
        <Skeleton className="h-4 w-28 bg-muted" />
      </div>
    </Card>
  );
}

export function JournalEntrySkeleton() {
  return (
    <Card className="glass-panel rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32 bg-muted" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-full bg-muted" />
            <Skeleton className="h-5 w-5 rounded-full bg-muted" />
          </div>
        </div>
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-2/3 bg-muted" />
      </CardContent>
    </Card>
  );
}

export function NoteCardSkeleton() {
  return (
    <Card className="glass-panel rounded-xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-5 w-3/4 bg-muted" />
          <Skeleton className="h-5 w-5 rounded bg-muted" />
        </div>
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-full bg-muted" />
        <Skeleton className="h-4 w-1/2 bg-muted" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-16 rounded-full bg-muted" />
          <Skeleton className="h-5 w-20 rounded-full bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export function CalendarEventSkeleton() {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted">
      <Skeleton className="h-12 w-12 rounded-lg bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-muted" />
        <Skeleton className="h-3 w-1/2 bg-muted" />
      </div>
    </div>
  );
}

export function TranscriptSkeleton() {
  return (
    <Card className="glass-panel rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg bg-muted" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-48 bg-muted" />
              <Skeleton className="h-4 w-32 bg-muted" />
            </div>
          </div>
          <Skeleton className="h-8 w-24 rounded-lg bg-muted" />
        </div>
        <Skeleton className="h-20 w-full rounded-lg bg-muted" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg bg-muted" />
          <Skeleton className="h-8 w-20 rounded-lg bg-muted" />
          <Skeleton className="h-8 w-20 rounded-lg bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SkeletonListProps {
  count?: number;
  type: "card" | "action" | "meeting" | "journal" | "note" | "calendar" | "transcript";
  className?: string;
}

export function SkeletonList({ count = 3, type, className }: SkeletonListProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);
  
  const SkeletonComponent = {
    card: CardSkeleton,
    action: ActionCardSkeleton,
    meeting: MeetingCardSkeleton,
    journal: JournalEntrySkeleton,
    note: NoteCardSkeleton,
    calendar: CalendarEventSkeleton,
    transcript: TranscriptSkeleton,
  }[type];

  return (
    <div className={cn("space-y-4", className)}>
      {skeletons.map((i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
}

export function PageLoadingSkeleton({ 
  title = true,
  subtitle = true,
  action = true,
  listType = "card" as const,
  listCount = 3
}: {
  title?: boolean;
  subtitle?: boolean;
  action?: boolean;
  listType?: "card" | "action" | "meeting" | "journal" | "note" | "calendar" | "transcript";
  listCount?: number;
}) {
  return (
    <div className="space-y-6 md:space-y-8 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          {title && <Skeleton className="h-10 w-48 bg-muted" />}
          {subtitle && <Skeleton className="h-5 w-64 bg-muted" />}
        </div>
        {action && <Skeleton className="h-12 w-36 rounded-xl bg-muted" />}
      </div>
      <SkeletonList count={listCount} type={listType} />
    </div>
  );
}
