import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge, SeverityBadge } from "@/components/ui/status-badge";
import { Loader2, ArrowLeft, CheckCircle, FileText, Calendar, Download, AlertTriangle, HelpCircle, Pencil, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMeeting, useActionItemsForMeeting, useDecisionsForMeeting, useRisksForMeeting, useQuestionsForMeeting, useUpdateMeeting, useExportCalendar } from "@/lib/hooks";
import { ActionEditSheet } from "@/components/action-edit-sheet";
import type { ActionItem } from "@shared/schema";

type TabType = 'summary' | 'actions' | 'decisions' | 'risks' | 'clarify';

export default function ExtractionPage() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const id = params?.id || "";
  const { data: meeting, isLoading: meetingLoading } = useMeeting(id);
  const { data: actions = [], isLoading: actionsLoading } = useActionItemsForMeeting(id);
  const { data: decisions = [] } = useDecisionsForMeeting(id);
  const { data: risks = [] } = useRisksForMeeting(id);
  const { data: questions = [] } = useQuestionsForMeeting(id);
  const updateMeeting = useUpdateMeeting();
  const exportCalendar = useExportCalendar();

  const [exportOpen, setExportOpen] = useState(false);
  const [includeActionItems, setIncludeActionItems] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

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

  const handleActionTap = (action: ActionItem) => {
    setSelectedAction(action);
    setEditSheetOpen(true);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'actions', label: 'Actions', count: actions.length },
    { id: 'decisions', label: 'Decisions', count: decisions.length },
    { id: 'risks', label: 'Risks', count: risks.length },
    { id: 'clarify', label: 'Clarify', count: questions.length },
  ];

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
        <div className="sticky top-0 bg-stone-50/95 backdrop-blur z-10 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-stone-200">
          <div className="flex items-center gap-3 py-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")} className="rounded-full h-11 w-11 shrink-0" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate text-slate-800">{meeting.title}</h1>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <StatusBadge status={meeting.parseState} size="sm" />
                {meeting.date && <span>{new Date(meeting.date).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-1.5 pb-3 overflow-x-auto no-scrollbar md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-teal-500 text-white'
                    : 'bg-white text-stone-600 border border-stone-200'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-stone-100'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 pt-4">
          <div className={`${activeTab === 'summary' ? 'block' : 'hidden md:block'}`}>
            <Card className="bg-white border-stone-200 rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-slate-800">Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6">
                <div className="bg-stone-50 p-4 rounded-xl text-base leading-relaxed text-slate-700">
                  {meeting.summary || "No summary generated yet."}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'actions' ? 'block' : 'hidden md:block'}`}>
            <Card className="bg-white border-stone-200 rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  Action Items
                  {actions.length > 0 && (
                    <Badge variant="secondary" className="rounded-full">{actions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {actions.length === 0 ? (
                  <p className="text-center py-6 text-stone-500 text-base">No action items extracted yet.</p>
                ) : (
                  actions.map((item: ActionItem) => (
                    <button
                      key={item.id}
                      onClick={() => handleActionTap(item)}
                      className="w-full text-left card-interactive p-4 space-y-3 tap-highlight"
                      data-testid={`action-card-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-base leading-relaxed text-slate-800 flex-1">{item.text}</p>
                        <Pencil className="h-4 w-4 text-stone-400 shrink-0 mt-1" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.ownerName && (
                          <div className="flex items-center gap-1.5 text-sm text-stone-600">
                            <User className="h-3.5 w-3.5" />
                            <span>{item.ownerName}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-1.5 text-sm text-stone-600">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <StatusBadge status={item.status} size="sm" />
                        {(item.confidenceOwner ?? 1) < 0.7 && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-orange-50 text-orange-600 border-orange-200">
                            <AlertTriangle className="h-3 w-3" />
                            Low confidence
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'decisions' ? 'block' : 'hidden md:block'}`}>
            <Card className="bg-white border-stone-200 rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-500" />
                  Decisions
                  {decisions.length > 0 && (
                    <Badge variant="secondary" className="rounded-full">{decisions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {decisions.length === 0 ? (
                  <p className="text-center py-6 text-stone-500 text-base">No decisions extracted.</p>
                ) : (
                  decisions.map((decision: any) => (
                    <div 
                      key={decision.id} 
                      className="border border-stone-200 rounded-xl p-4 bg-emerald-50/50"
                      data-testid={`decision-${decision.id}`}
                    >
                      <p className="text-base text-slate-800">{decision.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'risks' ? 'block' : 'hidden md:block'}`}>
            <Card className="bg-white border-stone-200 rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Risks
                  {risks.length > 0 && (
                    <Badge variant="secondary" className="rounded-full">{risks.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {risks.length === 0 ? (
                  <p className="text-center py-6 text-stone-500 text-base">No risks identified.</p>
                ) : (
                  risks.map((risk: any) => (
                    <div 
                      key={risk.id} 
                      className={`border rounded-xl p-4 transition-colors ${
                        risk.severity === 'high' ? 'bg-rose-50/50 border-rose-200' :
                        risk.severity === 'medium' ? 'bg-amber-50/50 border-amber-200' :
                        'bg-stone-50 border-stone-200'
                      }`}
                      data-testid={`risk-${risk.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base text-slate-800 flex-1">{risk.text}</p>
                        <SeverityBadge severity={risk.severity} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'clarify' ? 'block' : 'hidden md:block'}`}>
            <Card className="bg-white border-stone-200 rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  Clarifying Questions
                  {questions.length > 0 && (
                    <Badge variant="secondary" className="rounded-full">{questions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {questions.length === 0 ? (
                  <p className="text-center py-6 text-stone-500 text-base">No clarifying questions needed.</p>
                ) : (
                  questions.map((question: any) => (
                    <div 
                      key={question.id} 
                      className="border border-blue-200 rounded-xl p-4 bg-blue-50/50 space-y-3"
                      data-testid={`question-${question.id}`}
                    >
                      <p className="text-base text-slate-800">{question.text}</p>
                      {question.options && question.options.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option: string, idx: number) => (
                            <button
                              key={idx}
                              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 active:bg-blue-200 transition-colors"
                              data-testid={`question-option-${question.id}-${idx}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="hidden md:flex gap-3 pt-2 flex-wrap">
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full border-stone-300 h-11" data-testid="button-export-calendar">
                  <Calendar className="mr-2 h-4 w-4" />
                  Export .ics
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl">
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
              <Button variant="default" onClick={handleFinalize} className="rounded-full bg-teal-500 hover:bg-teal-600 h-11" data-testid="button-finalize">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finalize
              </Button>
            )}
            <Button variant="outline" onClick={handleViewDrafts} className="rounded-full border-stone-300 h-11" data-testid="button-drafts">
              <FileText className="mr-2 h-4 w-4" />
              View Drafts
            </Button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-stone-200 p-4 pb-safe z-50">
        <div className="flex items-center gap-3">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 px-4 rounded-xl border-stone-300" data-testid="button-export-mobile">
                <Calendar className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-t-3xl sm:rounded-3xl fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-slate-800 text-lg">Export to Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <p className="text-base text-stone-600">
                  Export this meeting as an .ics file.
                </p>
                
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl gap-4">
                  <div className="flex-1">
                    <Label className="text-base text-slate-700">Include action items</Label>
                    <p className="text-sm text-stone-500 mt-1">Add tasks with due dates</p>
                  </div>
                  <Switch 
                    checked={includeActionItems} 
                    onCheckedChange={setIncludeActionItems}
                  />
                </div>

                <Button 
                  onClick={handleExport} 
                  disabled={exportCalendar.isPending}
                  className="w-full rounded-2xl bg-teal-500 hover:bg-teal-600 h-12 text-base"
                >
                  {exportCalendar.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-5 w-5" />
                  )}
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            size="lg" 
            className="flex-1 text-base h-12 rounded-xl bg-teal-500 hover:bg-teal-600 shadow-lg shadow-teal-500/20" 
            onClick={handleViewDrafts}
            data-testid="button-generate-drafts-mobile"
          >
            <FileText className="mr-2 h-5 w-5" />
            Generate Drafts
          </Button>
        </div>
      </div>

      <ActionEditSheet
        item={selectedAction}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />
    </div>
  );
}
