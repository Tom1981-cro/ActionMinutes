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
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Meetings</h1>
          <p className="text-stone-500">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button className="rounded-2xl bg-teal-500 hover:bg-teal-600" data-testid="button-new-meeting">
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.length === 0 && (
          <div className="col-span-full py-12 text-center text-stone-500 border-2 border-dashed rounded-3xl border-stone-300 bg-stone-50/50">
            No meetings recorded yet. Start by capturing one.
          </div>
        )}
        
        {meetings.map((meeting: any) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/capture?id=${meeting.id}` : `/meeting/${meeting.id}`}>
            <Card className="h-full hover:shadow-lg transition-all cursor-pointer group border-stone-200 bg-white hover:border-teal-300 rounded-3xl" data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={
                    meeting.parseState === 'finalized' ? 'default' : 
                    meeting.parseState === 'processing' ? 'secondary' : 'outline'
                  } className="mb-2 rounded-full">
                    {meeting.parseState === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {meeting.parseState === 'finalized' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {meeting.parseState}
                  </Badge>
                  <span className="text-xs text-stone-500">
                    {format(new Date(meeting.date), "MMM d, yyyy")}
                  </span>
                </div>
                <CardTitle className="group-hover:text-teal-600 transition-colors text-slate-800">{meeting.title}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-stone-600 line-clamp-3">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 text-xs text-stone-500 flex justify-between items-center">
                <span>{meeting.attendees?.length || 0} attendees</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 text-teal-500" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
