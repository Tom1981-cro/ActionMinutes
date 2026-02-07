import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarBlank, CheckCircle, SpinnerGap, Users, ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useMeetings } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton-loader";
import { SAMPLE_MEETINGS, isDemoMode, enableDemoMode, disableDemoMode } from "@/lib/sample-data";

export default function MeetingsPage() {
  const { data: meetings = [], isLoading } = useMeetings();
  const [, navigate] = useLocation();
  const [showDemo, setShowDemo] = useState(isDemoMode());

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Meetings</h1>
            <p className="text-muted-foreground text-sm">History of your captured minutes.</p>
          </div>
        </div>
        <SkeletonList count={3} type="meeting" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Meetings</h1>
          <p className="text-muted-foreground text-sm">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button className="w-full sm:w-auto h-10 rounded-xl btn-gradient" data-testid="button-new-meeting">
            <Plus className="mr-2 h-5 w-5" weight="bold" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {meetings.length === 0 && !showDemo && (
          <EmptyState 
            variant="meetings" 
            onAction={() => navigate("/capture")}
            showTutorial={false}
          />
        )}

        {meetings.length === 0 && !showDemo && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => { enableDemoMode(); setShowDemo(true); }}
              className="text-muted-foreground hover:text-foreground text-sm"
              data-testid="button-try-demo"
            >
              <Eye className="mr-2 h-4 w-4" weight="duotone" />
              Try with sample data
            </Button>
          </div>
        )}

        {meetings.length === 0 && showDemo && (
          <>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-full bg-accent text-primary border-border">
                  Demo Mode
                </Badge>
                <span className="text-sm text-muted-foreground">Showing sample meetings</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { disableDemoMode(); setShowDemo(false); }}
                className="text-muted-foreground hover:text-foreground text-xs"
                data-testid="button-exit-demo"
              >
                <EyeSlash className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                Exit demo
              </Button>
            </div>
            {SAMPLE_MEETINGS.map((sample, idx) => (
              <Card 
                key={`sample-${idx}`} 
                className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl opacity-90"
                onClick={() => navigate("/capture")}
                data-testid={`card-sample-meeting-${idx}`}
              >
                <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
                    <CardTitle className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">{sample.title}</CardTitle>
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <Badge variant="outline" className="rounded-full bg-sky-500/20 text-sky-300 border-sky-500/30">
                        <CheckCircle className="mr-1 h-3 w-3" weight="fill" />
                        parsed
                      </Badge>
                      <span className="text-sm text-muted-foreground sm:hidden">
                        {format(new Date(sample.date), "MMM d")}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {format(new Date(sample.date), "MMM d, yyyy")}
                  </span>
                </CardHeader>
                <CardContent className="pb-3 px-4 md:px-6">
                  <p className="text-sm text-foreground line-clamp-2 leading-snug">
                    {sample.summary}
                  </p>
                </CardContent>
                <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-4 text-sm text-muted-foreground flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" weight="duotone" />
                    {sample.attendees.split(",").length} attendees
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" weight="bold" />
                </CardFooter>
              </Card>
            ))}
          </>
        )}
        
        {meetings.map((meeting: any) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/app/capture?id=${meeting.id}` : `/app/meeting/${meeting.id}`}>
            <Card className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl" data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
                  <CardTitle className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors">{meeting.title}</CardTitle>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "rounded-full shrink-0",
                        meeting.parseState === 'finalized' && 'bg-transparent text-emerald-400 border-emerald-400/50',
                        meeting.parseState === 'processing' && 'bg-accent text-primary border-border',
                        meeting.parseState === 'parsed' && 'bg-sky-500/20 text-sky-300 border-sky-500/30',
                        meeting.parseState === 'draft' && 'bg-accent text-muted-foreground border-border'
                      )}
                    >
                      {meeting.parseState === 'processing' && <SpinnerGap className="mr-1 h-3 w-3 animate-spin" weight="bold" />}
                      {meeting.parseState === 'finalized' && <CheckCircle className="mr-1 h-3 w-3" weight="fill" />}
                      {meeting.parseState}
                    </Badge>
                    <span className="text-sm text-muted-foreground sm:hidden">
                      {format(new Date(meeting.date), "MMM d")}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {format(new Date(meeting.date), "MMM d, yyyy")}
                </span>
              </CardHeader>
              <CardContent className="pb-3 px-4 md:px-6">
                <p className="text-sm text-foreground line-clamp-2 leading-snug">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-4 text-sm text-muted-foreground flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" weight="duotone" />
                  {meeting.attendeeCount || 0} attendees
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" weight="bold" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
