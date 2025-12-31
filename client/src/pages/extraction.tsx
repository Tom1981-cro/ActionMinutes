import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, CheckCircle, FileText, Calendar, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMeeting, useActionItemsForMeeting, useUpdateMeeting, useExportCalendar } from "@/lib/hooks";

export default function ExtractionPage() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const id = params?.id || "";
  const { data: meeting, isLoading: meetingLoading } = useMeeting(id);
  const { data: actions = [], isLoading: actionsLoading } = useActionItemsForMeeting(id);
  const updateMeeting = useUpdateMeeting();
  const exportCalendar = useExportCalendar();

  const [exportOpen, setExportOpen] = useState(false);
  const [includeActionItems, setIncludeActionItems] = useState(false);

  if (meetingLoading || actionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stone-500 text-base">
        Meeting not found
      </div>
    );
  }

  if (meeting.parseState === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 px-4">
        <Loader2 className="h-12 w-12 animate-spin text-teal-500" />
        <h2 className="text-xl font-semibold text-slate-800 text-center">AI is analyzing your notes...</h2>
        <p className="text-stone-500 text-base text-center">Extracting decisions, actions, and risks.</p>
      </div>
    );
  }

  const handleFinalize = () => {
    updateMeeting.mutate({ id: meeting.id, updates: { parseState: 'finalized' } });
    toast({ title: "Meeting finalized", description: "Outputs are locked." });
  };

  const handleViewDrafts = () => {
    setLocation("/drafts");
  };

  const handleExport = async () => {
    try {
      await exportCalendar.mutateAsync({ 
        meetingId: meeting.id, 
        options: { includeActionItems } 
      });
      toast({ title: "Calendar exported", description: "Download started." });
      setExportOpen(false);
    } catch (error) {
      toast({ title: "Export failed", description: "Could not generate calendar file.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-col gap-4 sticky top-0 bg-stone-50/95 backdrop-blur z-10 py-3 md:py-4 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")} className="rounded-full h-11 w-11 shrink-0" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-bold truncate text-slate-800">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Badge variant={
                  meeting.parseState === 'finalized' ? 'default' : 
                  meeting.parseState === 'processing' ? 'secondary' : 'outline'
                } className="rounded-full">
                {meeting.parseState}
              </Badge>
              {meeting.date && <span>{new Date(meeting.date).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full border-stone-300 h-11 flex-1 sm:flex-none" data-testid="button-export-calendar">
                <Calendar className="mr-2 h-4 w-4" />
                Export .ics
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-slate-800 text-lg">Export to Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <p className="text-base text-stone-600">
                  Export this meeting as an .ics file that you can import into any calendar app.
                </p>
                
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl gap-4">
                  <div className="flex-1">
                    <Label className="text-base text-slate-700">Include action items as tasks</Label>
                    <p className="text-sm text-stone-500 mt-1">Action items with due dates will be added as separate calendar tasks</p>
                  </div>
                  <Switch 
                    checked={includeActionItems} 
                    onCheckedChange={setIncludeActionItems}
                    data-testid="switch-include-actions"
                  />
                </div>

                <Button 
                  onClick={handleExport} 
                  disabled={exportCalendar.isPending}
                  className="w-full rounded-2xl bg-teal-500 hover:bg-teal-600 h-12 text-base"
                  data-testid="button-download-ics"
                >
                  {exportCalendar.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-5 w-5" />
                  )}
                  Download .ics
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {meeting.parseState !== 'finalized' && (
            <Button variant="default" onClick={handleFinalize} className="rounded-full bg-teal-500 hover:bg-teal-600 h-11 flex-1 sm:flex-none" data-testid="button-finalize">
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize
            </Button>
          )}
          <Button variant="outline" onClick={handleViewDrafts} className="rounded-full border-stone-300 h-11 flex-1 sm:flex-none" data-testid="button-drafts">
            <FileText className="mr-2 h-4 w-4" />
            Drafts
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:gap-6">
        <Card className="bg-white border-stone-200 rounded-2xl">
          <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
            <CardTitle className="text-lg text-slate-800">Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
            <Textarea 
              className="border-none resize-none bg-stone-50 p-4 text-base leading-relaxed rounded-2xl text-slate-700 min-h-[120px]" 
              defaultValue={meeting.summary || "No summary generated yet."}
              readOnly
            />
          </CardContent>
        </Card>

        <Card className="bg-white border-stone-200 rounded-2xl">
          <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
            <CardTitle className="text-lg text-slate-800">Action Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 md:px-6 md:pb-5">
            {actions.length === 0 ? (
              <p className="text-center py-8 text-stone-500 text-base">No action items extracted yet.</p>
            ) : (
              actions.map((item: any) => (
                <div key={item.id} className="group border border-stone-200 rounded-2xl p-4 space-y-3 hover:border-teal-300 transition-colors bg-white" data-testid={`action-${item.id}`}>
                  <p className="font-medium text-base leading-relaxed text-slate-800">{item.text}</p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {item.ownerName && (
                      <div className="flex items-center border border-stone-200 rounded-full px-3 py-1.5 bg-stone-50">
                        <span className="text-xs text-stone-500 mr-2">Owner:</span>
                        <span className="text-slate-700">{item.ownerName}</span>
                      </div>
                    )}
                    {item.dueDate && (
                      <div className="flex items-center border border-stone-200 rounded-full px-3 py-1.5 bg-stone-50">
                        <span className="text-xs text-stone-500 mr-2">Due:</span>
                        <span className="text-slate-700">{new Date(item.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {item.confidenceOwner < 0.8 && (
                      <Badge variant="secondary" className="text-amber-600 bg-amber-50 rounded-full border-amber-200">Low Confidence</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
