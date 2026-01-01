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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Meetings</h1>
          <p className="text-slate-500 text-base">History of your captured minutes.</p>
        </div>
        <Link href="/capture">
          <Button className="w-full sm:w-auto h-12 rounded-lg btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30" data-testid="button-new-meeting">
            <Plus className="mr-2 h-5 w-5" />
            New Meeting
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {meetings.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-base border-2 border-dashed rounded-xl border-gray-300 bg-gray-50">
            No meetings recorded yet. Start by capturing one.
          </div>
        )}
        
        {meetings.map((meeting: any) => (
          <Link key={meeting.id} href={meeting.parseState === 'draft' ? `/capture?id=${meeting.id}` : `/meeting/${meeting.id}`}>
            <Card className="hover:shadow-glow transition-all cursor-pointer group border-gray-200 bg-white hover:border-indigo-200 rounded-xl" data-testid={`card-meeting-${meeting.id}`}>
              <CardHeader className="pb-2 px-4 pt-4 md:px-6 md:pt-5">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-2">
                  <CardTitle className="text-lg leading-snug group-hover:text-indigo-600 transition-colors text-slate-900">{meeting.title}</CardTitle>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <Badge 
                      variant={meeting.parseState === 'finalized' ? 'default' : meeting.parseState === 'processing' ? 'secondary' : 'outline'} 
                      className={`rounded-full shrink-0 ${
                        meeting.parseState === 'finalized' ? 'bg-green-100 text-green-700 border-green-200' : 
                        meeting.parseState === 'processing' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : ''
                      }`}
                    >
                      {meeting.parseState === 'processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {meeting.parseState === 'finalized' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                      {meeting.parseState}
                    </Badge>
                    <span className="text-sm text-slate-500 sm:hidden">
                      {format(new Date(meeting.date), "MMM d")}
                    </span>
                  </div>
                </div>
                <span className="text-sm text-slate-500 hidden sm:block">
                  {format(new Date(meeting.date), "MMM d, yyyy")}
                </span>
              </CardHeader>
              <CardContent className="pb-3 px-4 md:px-6">
                <p className="text-base text-slate-600 line-clamp-2 leading-relaxed">
                  {meeting.summary || meeting.rawNotes || "No notes..."}
                </p>
              </CardContent>
              <CardFooter className="pt-0 px-4 pb-4 md:px-6 md:pb-5 text-sm text-slate-500 flex justify-between items-center">
                <span>{meeting.attendeeCount || 0} attendees</span>
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 text-indigo-500" />
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
