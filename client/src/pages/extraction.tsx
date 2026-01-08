import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatusBadge, SeverityBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, CheckCircle, FileText, CalendarBlank, DownloadSimple, 
  Warning, Question, Pencil, User, Clock, SpinnerGap 
} from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import { useMeeting, useActionItemsForMeeting, useDecisionsForMeeting, useRisksForMeeting, useQuestionsForMeeting, useUpdateMeeting, useExportCalendar, useAppConfig, useGenerateDrafts, useDraftsForMeeting } from "@/lib/hooks";
import { ActionEditSheet } from "@/components/action-edit-sheet";
import type { ActionItem } from "@shared/schema";

type TabType = 'summary' | 'actions' | 'decisions' | 'risks' | 'clarify';

export default function ExtractionPage() {
  const [, params] = useRoute("/meeting/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: config } = useAppConfig();
  
  const id = params?.id || "";
  const { data: meeting, isLoading: meetingLoading } = useMeeting(id);
  const { data: actions = [], isLoading: actionsLoading } = useActionItemsForMeeting(id);
  const { data: decisions = [] } = useDecisionsForMeeting(id);
  const { data: risks = [] } = useRisksForMeeting(id);
  const { data: questions = [] } = useQuestionsForMeeting(id);
  const updateMeeting = useUpdateMeeting();
  const exportCalendar = useExportCalendar();
  const generateDrafts = useGenerateDrafts();
  const { data: existingDrafts = [] } = useDraftsForMeeting(id);

  const aiEnabled = config?.features?.aiEnabled !== false;
  const hasDrafts = existingDrafts.length > 0;

  const [exportOpen, setExportOpen] = useState(false);
  const [includeActionItems, setIncludeActionItems] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  if (meetingLoading || actionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="h-8 w-8 animate-spin text-violet-500" weight="bold" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/50 text-base">
        Meeting not found
      </div>
    );
  }

  if (meeting.parseState === "processing") {
    if (!aiEnabled) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 px-4">
          <div className="h-16 w-16 bg-amber-500/20 rounded-2xl flex items-center justify-center">
            <Warning className="h-8 w-8 text-amber-400" weight="duotone" />
          </div>
          <h2 className="text-xl font-semibold text-white text-center">AI Extraction Unavailable</h2>
          <p className="text-white/50 text-base text-center max-w-md">
            AI features are currently disabled. This meeting cannot be processed until AI is re-enabled.
          </p>
          <Button variant="outline" onClick={() => setLocation("/meetings")} className="rounded-xl border-white/20 text-white/80 hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" weight="bold" />
            Back to Meetings
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 px-4">
        <SpinnerGap className="h-12 w-12 animate-spin text-violet-500" weight="bold" />
        <h2 className="text-xl font-semibold text-white text-center">AI is analyzing your notes...</h2>
        <p className="text-white/50 text-base text-center">Extracting decisions, actions, and risks.</p>
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

  const handleGenerateDrafts = async () => {
    try {
      await generateDrafts.mutateAsync(meeting.id);
      toast({ title: "Drafts generated", description: "Follow-up emails are ready in Drafts." });
      setLocation("/drafts");
    } catch (error: any) {
      toast({ 
        title: "Generation failed", 
        description: error?.message || "Could not generate drafts. Please try again.", 
        variant: "destructive" 
      });
    }
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
        <div className="sticky top-0 glass-panel backdrop-blur z-10 -mx-4 px-4 md:-mx-8 md:px-8 border-b border-white/10">
          <div className="flex items-center gap-3 py-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")} className="rounded-full h-11 w-11 shrink-0 text-white/60 hover:text-white hover:bg-white/10" data-testid="button-back" aria-label="Go back to meetings">
              <ArrowLeft className="h-5 w-5" weight="bold" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold truncate text-white">{meeting.title}</h1>
              <div className="flex items-center gap-2 text-sm text-white/50">
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
                    ? 'btn-gradient text-white'
                    : 'bg-white/5 text-white/60 border border-white/10'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'
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
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-white">Summary</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6">
                <div className="bg-white/5 p-4 rounded-xl text-base leading-relaxed text-white/80">
                  {meeting.summary || "No summary generated yet."}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'actions' ? 'block' : 'hidden md:block'}`}>
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  Action Items
                  {actions.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-white/10 text-white/70 border-white/20">{actions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {actions.length === 0 ? (
                  <p className="text-center py-6 text-white/50 text-base">No action items extracted yet.</p>
                ) : (
                  actions.map((item: ActionItem) => (
                    <button
                      key={item.id}
                      onClick={() => handleActionTap(item)}
                      className="w-full text-left bg-white/5 hover:bg-white/10 rounded-xl p-4 space-y-3 transition-colors"
                      data-testid={`action-card-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-base leading-relaxed text-white flex-1">{item.text}</p>
                        <Pencil className="h-4 w-4 text-white/40 shrink-0 mt-1" weight="duotone" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.ownerName && (
                          <div className="flex items-center gap-1.5 text-sm text-white/60">
                            <User className="h-3.5 w-3.5" weight="duotone" />
                            <span>{item.ownerName}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-1.5 text-sm text-white/60">
                            <Clock className="h-3.5 w-3.5" weight="duotone" />
                            <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <StatusBadge status={item.status} size="sm" />
                        {(item.confidenceOwner ?? 1) < 0.7 && (
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 border-amber-500/30">
                            <Warning className="h-3 w-3" weight="fill" />
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
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-violet-400" weight="duotone" />
                  Decisions
                  {decisions.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-white/10 text-white/70 border-white/20">{decisions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {decisions.length === 0 ? (
                  <p className="text-center py-6 text-white/50 text-base">No decisions extracted.</p>
                ) : (
                  decisions.map((decision: any) => (
                    <div 
                      key={decision.id} 
                      className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/10"
                      data-testid={`decision-${decision.id}`}
                    >
                      <p className="text-base text-white">{decision.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'risks' ? 'block' : 'hidden md:block'}`}>
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Warning className="h-4 w-4 text-amber-400" weight="duotone" />
                  Risks
                  {risks.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-white/10 text-white/70 border-white/20">{risks.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {risks.length === 0 ? (
                  <p className="text-center py-6 text-white/50 text-base">No risks identified.</p>
                ) : (
                  risks.map((risk: any) => (
                    <div 
                      key={risk.id} 
                      className={`border rounded-xl p-4 transition-colors ${
                        risk.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                        risk.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                        'bg-white/5 border-white/10'
                      }`}
                      data-testid={`risk-${risk.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base text-white flex-1">{risk.text}</p>
                        <SeverityBadge severity={risk.severity} />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'clarify' ? 'block' : 'hidden md:block'}`}>
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                  <Question className="h-4 w-4 text-sky-400" weight="duotone" />
                  Clarifying Questions
                  {questions.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-white/10 text-white/70 border-white/20">{questions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {questions.length === 0 ? (
                  <p className="text-center py-6 text-white/50 text-base">No clarifying questions needed.</p>
                ) : (
                  questions.map((question: any) => (
                    <div 
                      key={question.id} 
                      className="border border-sky-500/30 rounded-xl p-4 bg-sky-500/10 space-y-3"
                      data-testid={`question-${question.id}`}
                    >
                      <p className="text-base text-white">{question.text}</p>
                      {question.options && question.options.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option: string, idx: number) => (
                            <button
                              key={idx}
                              className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 active:bg-sky-500/30 transition-colors"
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
                <Button variant="outline" className="rounded-full border-white/20 text-white/80 hover:bg-white/10 h-11" data-testid="button-export-calendar">
                  <CalendarBlank className="mr-2 h-4 w-4" weight="duotone" />
                  Export .ics
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel sm:max-w-md rounded-3xl border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg">Export to Calendar</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <p className="text-base text-white/60">
                    Export this meeting as an .ics file that you can import into any calendar app.
                  </p>
                  
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl gap-4">
                    <div className="flex-1">
                      <Label className="text-base text-white">Include action items as tasks</Label>
                      <p className="text-sm text-white/50 mt-1">Action items with due dates will be added as separate calendar tasks</p>
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
                    className="w-full rounded-xl btn-gradient h-12 text-base"
                    data-testid="button-download-ics"
                  >
                    {exportCalendar.isPending ? (
                      <SpinnerGap className="mr-2 h-5 w-5 animate-spin" weight="bold" />
                    ) : (
                      <DownloadSimple className="mr-2 h-5 w-5" weight="bold" />
                    )}
                    Download .ics
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {meeting.parseState !== 'finalized' && (
              <Button onClick={handleFinalize} className="rounded-full btn-gradient h-11" data-testid="button-finalize">
                <CheckCircle className="mr-2 h-4 w-4" weight="fill" />
                Finalize
              </Button>
            )}
            {hasDrafts ? (
              <Button variant="outline" onClick={handleViewDrafts} className="rounded-full border-white/20 text-white/80 hover:bg-white/10 h-11" data-testid="button-view-drafts">
                <FileText className="mr-2 h-4 w-4" weight="duotone" />
                View Drafts
              </Button>
            ) : (
              <Button 
                onClick={handleGenerateDrafts} 
                disabled={generateDrafts.isPending || !aiEnabled}
                className="rounded-full btn-gradient h-11" 
                data-testid="button-generate-drafts"
              >
                {generateDrafts.isPending ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" weight="duotone" />
                )}
                Generate Drafts
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 p-4 pb-safe z-50">
        <div className="flex items-center gap-3">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 px-4 rounded-xl border-white/20 text-white/80 hover:bg-white/10" data-testid="button-export-mobile">
                <CalendarBlank className="h-5 w-5" weight="duotone" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel sm:max-w-md rounded-t-3xl sm:rounded-3xl fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 max-h-[85vh] overflow-y-auto border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">Export to Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <p className="text-base text-white/60">
                  Export this meeting as an .ics file.
                </p>
                
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl gap-4">
                  <div className="flex-1">
                    <Label className="text-base text-white">Include action items</Label>
                    <p className="text-sm text-white/50 mt-1">Add tasks with due dates</p>
                  </div>
                  <Switch 
                    checked={includeActionItems} 
                    onCheckedChange={setIncludeActionItems}
                  />
                </div>

                <Button 
                  onClick={handleExport} 
                  disabled={exportCalendar.isPending}
                  className="w-full rounded-xl btn-gradient h-12 text-base"
                >
                  {exportCalendar.isPending ? (
                    <SpinnerGap className="mr-2 h-5 w-5 animate-spin" weight="bold" />
                  ) : (
                    <DownloadSimple className="mr-2 h-5 w-5" weight="bold" />
                  )}
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {hasDrafts ? (
            <Button 
              size="lg" 
              className="flex-1 text-base h-12 rounded-xl btn-gradient" 
              onClick={handleViewDrafts}
              data-testid="button-view-drafts-mobile"
            >
              <FileText className="mr-2 h-5 w-5" weight="duotone" />
              View Drafts
            </Button>
          ) : (
            <Button 
              size="lg" 
              className="flex-1 text-base h-12 rounded-xl btn-gradient" 
              onClick={handleGenerateDrafts}
              disabled={generateDrafts.isPending || !aiEnabled}
              data-testid="button-generate-drafts-mobile"
            >
              {generateDrafts.isPending ? (
                <SpinnerGap className="mr-2 h-5 w-5 animate-spin" weight="bold" />
              ) : (
                <FileText className="mr-2 h-5 w-5" weight="duotone" />
              )}
              Generate Drafts
            </Button>
          )}
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
