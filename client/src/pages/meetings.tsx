import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarBlank, CheckCircle, SpinnerGap, Users, ArrowRight } from "@phosphor-icons/react";
import { format } from "date-fns";
import { useMeetings } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const { data: meetings = [], isLoading } = useMeetings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="h-8 w-8 animate-spin text-violet-500" weight="bold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-gradient-light">Meetings</h1>
          <p className="text-white/50 text-base">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button className="w-full sm:w-auto h-12 rounded-xl btn-gradient" data-testid="button-new-meeting">
            <Plus className="mr-2 h-5 w-5" weight="bold" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {meetings.length === 0 && (
          <div className="py-12 text-center glass-panel rounded-2xl border-dashed border-white/20">
            <div className="mx-auto h-16 w-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-4">
              <CalendarBlank className="h-8 w-8 text-violet-400" weight="duotone" />
            </div>
            <p className="text-white/70 text-base">No meetings recorded yet.</p>
            <p className="text-white/40 text-sm mt-1">Start by capturing one.</p>
          </div>
        )}
        
        {meetings.map((meeting: any) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/capture?id=${meeting.id}` : `/meeting/${meeting.id}`}>
            <Card className="glass-panel hover:translate-y-[-2px] hover:shadow-lg transition-all cursor-pointer group rounded-2xl" data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
                  <CardTitle className="text-lg leading-snug text-white group-hover:text-violet-300 transition-colors">{meeting.title}</CardTitle>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "rounded-full shrink-0",
                        meeting.parseState === 'finalized' && 'bg-transparent text-emerald-400 border-emerald-400/50',
                        meeting.parseState === 'processing' && 'bg-violet-500/20 text-violet-300 border-violet-500/30',
                        meeting.parseState === 'parsed' && 'bg-sky-500/20 text-sky-300 border-sky-500/30',
                        meeting.parseState === 'draft' && 'bg-white/10 text-white/60 border-white/20'
                      )}
                    >
                      {meeting.parseState === 'processing' && <SpinnerGap className="mr-1 h-3 w-3 animate-spin" weight="bold" />}
                      {meeting.parseState === 'finalized' && <CheckCircle className="mr-1 h-3 w-3" weight="fill" />}
                      {meeting.parseState}
                    </Badge>
                    <span className="text-sm text-white/50 sm:hidden">
                      {format(new Date(meeting.date), "MMM d")}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-white/50 hidden sm:block">
                  {format(new Date(meeting.date), "MMM d, yyyy")}
                </span>
              </CardHeader>
              <CardContent className="pb-3 px-4 md:px-6">
                <p className="text-base text-white/70 line-clamp-2 leading-relaxed">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-5 text-sm text-white/50 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" weight="duotone" />
                  {meeting.attendeeCount || 0} attendees
                </span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-violet-400" weight="bold" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
