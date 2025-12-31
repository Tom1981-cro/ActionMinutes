import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function MeetingsPage() {
  const { meetings } = useStore();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            No meetings recorded yet. Start by capturing one.
          </div>
        )}
        
        {meetings.map((meeting) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/capture?id=${meeting.id}` : `/meeting/${meeting.id}`}>
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-transparent bg-card hover:border-border border">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={
                    meeting.parseState === 'finalized' ? 'default' : 
                    meeting.parseState === 'processing' ? 'secondary' : 'outline'
                  } className="mb-2">
                    {meeting.parseState === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {meeting.parseState === 'finalized' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {meeting.parseState}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(meeting.date), "MMM d, yyyy")}
                  </span>
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">{meeting.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 text-xs text-muted-foreground flex justify-between items-center">
                <span>{meeting.attendees.length} attendees</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
