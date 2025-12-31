import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, HelpCircle, RefreshCw, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ExtractionPage() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { meetings, actionItems, finalizeMeeting, generateDrafts, updateActionItem } = useStore();
  const { toast } = useToast();
  
  const id = params?.id;
  const meeting = meetings.find(m => m.id === id);
  const actions = actionItems.filter(a => a.meetingId === id);

  if (!meeting) return <div>Meeting not found</div>;

  if (meeting.parseState === "processing") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">AI is analyzing your notes...</h2>
        <p className="text-muted-foreground">Extracting decisions, actions, and risks.</p>
      </div>
    );
  }

  const handleFinalize = () => {
    finalizeMeeting(meeting.id);
    toast({ title: "Meeting finalized", description: "Outputs are locked." });
  };

  const handleGenerateDrafts = () => {
    generateDrafts(meeting.id);
    setLocation("/drafts");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold truncate max-w-[300px]">{meeting.title}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={
                  meeting.parseState === 'finalized' ? 'default' : 
                  meeting.parseState === 'processing' ? 'secondary' : 'outline'
                } className="mb-2">
                {meeting.parseState}
              </Badge>
              {meeting.date && <span>{new Date(meeting.date).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {meeting.parseState !== 'finalized' && (
            <Button variant="default" onClick={handleFinalize}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize
            </Button>
          )}
          <Button variant="outline" onClick={handleGenerateDrafts}>
            <FileText className="mr-2 h-4 w-4" />
            View Drafts
          </Button>
        </div>
      </div>

      <div className="grid gap-6 max-w-5xl mx-auto">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              className="border-none resize-none bg-muted/30 p-4 text-base leading-relaxed" 
              defaultValue={meeting.summary}
              readOnly={meeting.parseState === 'finalized'}
            />
          </CardContent>
        </Card>

        {/* Decisions */}
        <Card>
          <CardHeader>
            <CardTitle>Decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meeting.decisions?.map((d) => (
              <div key={d.id} className="flex gap-3 items-start p-3 bg-green-50/50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <span className="text-sm">{d.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle>Action Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.map((item) => (
              <div key={item.id} className="group border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors">
                <Input 
                   defaultValue={item.text} 
                   className="font-medium text-base border-none px-0 h-auto focus-visible:ring-0"
                   readOnly={meeting.parseState === 'finalized'}
                   onChange={(e) => updateActionItem(item.id, { text: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center border rounded px-2 py-1 bg-muted/20">
                    <span className="text-xs text-muted-foreground mr-2">Owner</span>
                    <Input 
                      defaultValue={item.ownerName || ""} 
                      placeholder="Unassigned"
                      className="h-5 w-32 border-none p-0 text-sm focus-visible:ring-0 bg-transparent"
                      readOnly={meeting.parseState === 'finalized'}
                      onChange={(e) => updateActionItem(item.id, { ownerName: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center border rounded px-2 py-1 bg-muted/20">
                     <span className="text-xs text-muted-foreground mr-2">Due</span>
                     <Input 
                       type="date"
                       defaultValue={item.dueDate ? item.dueDate.split('T')[0] : ""} 
                       className="h-5 w-auto border-none p-0 text-sm focus-visible:ring-0 bg-transparent"
                       readOnly={meeting.parseState === 'finalized'}
                       onChange={(e) => updateActionItem(item.id, { dueDate: e.target.value })}
                     />
                  </div>
                  {item.confidenceOwner < 0.8 && (
                     <Badge variant="secondary" className="text-amber-600 bg-amber-50">Low Confidence</Badge>
                  )}
                </div>
              </div>
            ))}
            {meeting.parseState !== 'finalized' && (
              <Button variant="ghost" className="w-full border border-dashed">
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Risks */}
        <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-amber-500" />
               Risks / Blockers
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-2">
             {meeting.risks?.map(r => (
               <div key={r.id} className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded border border-amber-100 dark:border-amber-900/30 text-sm">
                 <span className="font-semibold uppercase text-[10px] tracking-wider text-amber-600 mr-2">{r.severity}</span>
                 {r.text}
               </div>
             ))}
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
