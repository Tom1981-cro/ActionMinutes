import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { useMeetings } from "@/lib/hooks";

export default function MeetingsPage() {
  const { data: meetings = [], isLoading } = useMeetings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Meetings</h1>
          <p className="text-muted-foreground text-base">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button className="w-full sm:w-auto h-12 rounded-2xl bg-primary hover:bg-primary/90 text-base" data-testid="button-new-meeting">
            <Plus className="mr-2 h-5 w-5" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {meetings.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-base border-2 border-dashed rounded-2xl border-border bg-muted/50">
            No meetings recorded yet. Start by capturing one.
          </div>
        )}
        
        {meetings.map((meeting: any) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/capture?id=${meeting.id}` : `/meeting/${meeting.id}`}>
            <Card className="hover:shadow-lg transition-all cursor-pointer group border-border bg-card hover:border-primary rounded-2xl" data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
                  <CardTitle className="text-lg leading-snug group-hover:text-primary transition-colors text-slate-800">{meeting.title}</CardTitle>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <Badge variant={
                      meeting.parseState === 'finalized' ? 'default' : 
                      meeting.parseState === 'processing' ? 'secondary' : 'outline'
                    } className="rounded-full shrink-0">
                      {meeting.parseState === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {meeting.parseState === 'finalized' && <CheckCircle2 className="mr-1 h-3 w-3" />}
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
                <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-5 text-sm text-muted-foreground flex justify-between items-center">
                <span>{meeting.attendees?.length || 0} attendees</span>
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 text-primary" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
