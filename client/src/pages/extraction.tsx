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
  Warning, Question, Pencil, User, Clock, SpinnerGap, HighlighterCircle, MagicWand,
  Printer, ShareNetwork, FilePdf
} from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import { useMeeting, useActionItemsForMeeting, useDecisionsForMeeting, useRisksForMeeting, useQuestionsForMeeting, useUpdateMeeting, useExportCalendar, useAppConfig, useGenerateDrafts, useDraftsForMeeting, useTasksBySource, useCreateTasksFromMeeting } from "@/lib/hooks";
import { ActionEditSheet } from "@/components/action-edit-sheet";
import { TextHighlighter, type HighlightedItem } from "@/components/text-highlighter";
import { TemplatePicker } from "@/components/template-picker";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ActionItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

type TabType = 'summary' | 'actions' | 'decisions' | 'risks' | 'clarify' | 'highlight';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  const escaped = escapeHtml(md);
  return escaped
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

interface PrintMeta {
  title: string;
  date?: string;
  time?: string;
  attendees?: string[];
  templateName: string;
}

function buildPrintHtml(meta: PrintMeta, content: string): string {
  const metaItems: string[] = [];
  if (meta.date) metaItems.push(`<span>Date: ${escapeHtml(meta.date)}</span>`);
  if (meta.time) metaItems.push(`<span>Time: ${escapeHtml(meta.time)}</span>`);
  if (meta.attendees?.length) metaItems.push(`<span>Attendees: ${escapeHtml(meta.attendees.join(', '))}</span>`);
  metaItems.push(`<span>Template: ${escapeHtml(meta.templateName)}</span>`);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(meta.title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 18px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; margin-top: 24px; }
  h3 { font-size: 15px; margin-top: 16px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  .meta span { display: block; margin-bottom: 2px; }
  ul, ol { padding-left: 24px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 16px 0; }
  blockquote { border-left: 3px solid #ddd; margin: 12px 0; padding-left: 12px; color: #555; font-style: italic; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtml(meta.title)}</h1>
<div class="meta">${metaItems.join('\n')}</div>
<hr/>
${markdownToHtml(content)}
</body></html>`;
}

export default function ExtractionPage() {
  const [, params] = useRoute("/app/meeting/:id");
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
  const { data: linkedTasks = [], isLoading: tasksLoading } = useTasksBySource('meeting', id);
  const createTasksFromMeeting = useCreateTasksFromMeeting();

  const queryClient = useQueryClient();
  const aiEnabled = config?.features?.aiEnabled !== false;
  const hasDrafts = existingDrafts.length > 0;

  const { user } = useAuth();
  const [exportOpen, setExportOpen] = useState(false);
  const [includeActionItems, setIncludeActionItems] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [manualHighlights, setManualHighlights] = useState<HighlightedItem[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [templateSummary, setTemplateSummary] = useState<{ summary: string; templateName: string; processingTimeMs: number } | null>(null);

  const templateSummarizeMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/meetings/${id}/summarize-template?userId=${user?.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Template summarization failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setTemplateSummary({ summary: data.summary, templateName: data.templateName, processingTimeMs: data.processingTimeMs });
      setTemplatePickerOpen(false);
      toast({ title: "Template summary generated", description: `Generated using "${data.templateName}" template.` });
    },
    onError: (error: Error) => {
      toast({ title: "Template summarization failed", description: error.message, variant: "destructive" });
    },
  });

  if (meetingLoading || actionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-base">
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
          <h2 className="text-xl font-semibold text-foreground text-center">AI Extraction Unavailable</h2>
          <p className="text-muted-foreground text-base text-center max-w-md">
            AI features are currently disabled. This meeting cannot be processed until AI is re-enabled.
          </p>
          <Button variant="outline" onClick={() => setLocation("/meetings")} className="rounded-xl border-border text-foreground hover:bg-accent">
            <ArrowLeft className="mr-2 h-4 w-4" weight="bold" />
            Back to Meetings
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4 px-4">
        <SpinnerGap className="h-12 w-12 animate-spin text-primary" weight="bold" />
        <h2 className="text-xl font-semibold text-foreground text-center">AI is analyzing your notes...</h2>
        <p className="text-muted-foreground text-base text-center">Extracting decisions, actions, and risks.</p>
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

  const handleCreateTasks = async () => {
    try {
      const result = await createTasksFromMeeting.mutateAsync(meeting.id);
      toast({ 
        title: "Tasks created", 
        description: `${result.tasksCreated} task${result.tasksCreated !== 1 ? 's' : ''} added to your task list.` 
      });
    } catch (error: any) {
      toast({ 
        title: "Could not create tasks", 
        description: error?.message || "Please try again.", 
        variant: "destructive" 
      });
    }
  };

  const handleHighlightConfirm = async (items: HighlightedItem[]) => {
    try {
      for (const item of items) {
        if (item.type === "action") {
          await apiRequest("POST", `/api/actions`, {
            meetingId: meeting.id,
            text: item.text,
            ownerName: item.ownerName || null,
            status: "needs_review",
          });
        } else if (item.type === "decision") {
          await apiRequest("POST", `/api/meetings/${meeting.id}/decisions`, {
            text: item.text,
          });
        } else if (item.type === "risk") {
          await apiRequest("POST", `/api/meetings/${meeting.id}/risks`, {
            text: item.text,
            severity: "medium",
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['actions', 'meeting', meeting.id] });
      queryClient.invalidateQueries({ queryKey: ['decisions', 'meeting', meeting.id] });
      queryClient.invalidateQueries({ queryKey: ['risks', 'meeting', meeting.id] });
      toast({
        title: "Items added",
        description: `${items.length} highlighted item${items.length !== 1 ? "s" : ""} added to extraction results.`,
      });
      setManualHighlights([]);
      setActiveTab("actions");
    } catch (error: any) {
      toast({
        title: "Could not add items",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'actions', label: 'Actions', count: actions.length },
    { id: 'decisions', label: 'Decisions', count: decisions.length },
    { id: 'risks', label: 'Risks', count: risks.length },
    { id: 'clarify', label: 'Clarify', count: questions.length },
    { id: 'highlight', label: 'Highlight' },
  ];

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
        <div className="space-y-3 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/meetings")} className="rounded-full h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent" data-testid="button-back" aria-label="Go back to meetings">
              <ArrowLeft className="h-5 w-5" weight="bold" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{meeting.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <StatusBadge status={meeting.parseState} size="sm" />
                {meeting.date && <span>{new Date(meeting.date).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar md:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'btn-gradient text-foreground'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-accent">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 md:space-y-6 pt-4">
          <div className={`${activeTab === 'summary' ? 'block' : 'hidden md:block'} space-y-4`}>
            <Card className="glass-panel rounded-2xl border-2 border-primary/30">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">Summary</CardTitle>
                  <Button
                    size="sm"
                    className="rounded-xl text-xs btn-gradient"
                    onClick={() => setTemplatePickerOpen(true)}
                    disabled={templateSummarizeMutation.isPending}
                    data-testid="button-template-summary"
                  >
                    {templateSummarizeMutation.isPending ? (
                      <SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" weight="bold" />
                    ) : (
                      <MagicWand className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                    )}
                    Summary Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6">
                <div className="bg-muted p-4 rounded-xl text-base leading-relaxed text-foreground">
                  {meeting.summary || "No summary generated yet."}
                </div>
              </CardContent>
            </Card>

            {templateSummary && (
              <Card className="glass-panel rounded-2xl" data-testid="card-template-summary">
                <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                      <MagicWand className="h-4 w-4 text-primary" weight="duotone" />
                      {templateSummary.templateName}
                    </CardTitle>
                    <Badge variant="outline" className="rounded-full text-xs bg-accent border-border">
                      {(templateSummary.processingTimeMs / 1000).toFixed(1)}s
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 md:px-6">
                  <div className="bg-muted p-4 rounded-xl max-h-[500px] overflow-y-auto">
                    <MarkdownRenderer content={templateSummary.summary} />
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs gap-1.5"
                      data-testid="button-export-pdf"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        const meta: PrintMeta = {
                          title: meeting?.title || 'Meeting Summary',
                          date: meeting?.startTime ? new Date(meeting.startTime).toLocaleDateString() : undefined,
                          time: meeting?.startTime ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                          attendees: meeting?.attendees?.map((a: any) => a.name || a.email) || [],
                          templateName: templateSummary.templateName,
                        };
                        const html = buildPrintHtml(meta, templateSummary.summary);
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.onload = () => { printWindow.print(); };
                      }}
                    >
                      <FilePdf className="h-3.5 w-3.5" weight="duotone" />
                      Export PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs gap-1.5"
                      data-testid="button-print-summary"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (!printWindow) return;
                        const meta: PrintMeta = {
                          title: meeting?.title || 'Meeting Summary',
                          date: meeting?.startTime ? new Date(meeting.startTime).toLocaleDateString() : undefined,
                          time: meeting?.startTime ? new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
                          attendees: meeting?.attendees?.map((a: any) => a.name || a.email) || [],
                          templateName: templateSummary.templateName,
                        };
                        const html = buildPrintHtml(meta, templateSummary.summary);
                        printWindow.document.write(html);
                        printWindow.document.close();
                        printWindow.onload = () => { printWindow.print(); };
                      }}
                    >
                      <Printer className="h-3.5 w-3.5" weight="duotone" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs gap-1.5"
                      data-testid="button-copy-summary"
                      onClick={async () => {
                        try {
                          const title = meeting?.title || 'Meeting Summary';
                          const dateLine = meeting?.startTime ? `Date: ${new Date(meeting.startTime).toLocaleDateString()}` : '';
                          const timeLine = meeting?.startTime ? `Time: ${new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '';
                          const attendeeNames = meeting?.attendees?.map((a: any) => a.name || a.email).join(', ');
                          const attendeeLine = attendeeNames ? `Attendees: ${attendeeNames}` : '';
                          const metaLines = [dateLine, timeLine, attendeeLine, `Template: ${templateSummary.templateName}`].filter(Boolean).join('\n');
                          const header = `# ${title}\n${metaLines}\n\n---\n\n`;
                          await navigator.clipboard.writeText(header + templateSummary.summary);
                          toast({ title: "Copied to clipboard", description: "Summary has been copied as markdown." });
                        } catch {
                          toast({ title: "Copy failed", description: "Unable to access clipboard.", variant: "destructive" });
                        }
                      }}
                    >
                      <ShareNetwork className="h-3.5 w-3.5" weight="duotone" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <TemplatePicker
              open={templatePickerOpen}
              onOpenChange={setTemplatePickerOpen}
              onSelect={(templateId) => templateSummarizeMutation.mutate(templateId)}
              isGenerating={templateSummarizeMutation.isPending}
            />
          </div>

          <div className={`${activeTab === 'actions' ? 'block' : 'hidden md:block'}`}>
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    Action Items
                    {actions.length > 0 && (
                      <Badge variant="outline" className="rounded-full bg-accent text-foreground border-border">{actions.length}</Badge>
                    )}
                    {linkedTasks.length > 0 && (
                      <Badge variant="outline" className="rounded-full bg-accent text-primary border-border">
                        {linkedTasks.length} task{linkedTasks.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </CardTitle>
                  {actions.length > 0 && actions.length > linkedTasks.length && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCreateTasks}
                      disabled={createTasksFromMeeting.isPending}
                      className="rounded-full text-xs text-primary hover:bg-accent"
                      data-testid="button-create-tasks"
                    >
                      {createTasksFromMeeting.isPending ? (
                        <SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" weight="bold" />
                      ) : (
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" weight="duotone" />
                      )}
                      Add to Tasks
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {actions.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-base">No action items extracted yet.</p>
                ) : (
                  actions.map((item: ActionItem) => (
                    <button
                      key={item.id}
                      onClick={() => handleActionTap(item)}
                      className="w-full text-left bg-muted hover:bg-accent rounded-xl p-4 space-y-3 transition-colors"
                      data-testid={`action-card-${item.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-base leading-relaxed text-foreground flex-1">{item.text}</p>
                        <Pencil className="h-4 w-4 text-muted-foreground shrink-0 mt-1" weight="duotone" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.ownerName && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <User className="h-3.5 w-3.5" weight="duotone" />
                            <span>{item.ownerName}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" weight="duotone" />
                  Decisions
                  {decisions.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-accent text-foreground border-border">{decisions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {decisions.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-base">No decisions extracted.</p>
                ) : (
                  decisions.map((decision: any) => (
                    <div 
                      key={decision.id} 
                      className="border border-emerald-500/30 rounded-xl p-4 bg-emerald-500/10"
                      data-testid={`decision-${decision.id}`}
                    >
                      <p className="text-base text-foreground">{decision.text}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className={`${activeTab === 'risks' ? 'block' : 'hidden md:block'}`}>
            <Card className="glass-panel rounded-2xl">
              <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Warning className="h-4 w-4 text-amber-400" weight="duotone" />
                  Risks
                  {risks.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-accent text-foreground border-border">{risks.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {risks.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-base">No risks identified.</p>
                ) : (
                  risks.map((risk: any) => (
                    <div 
                      key={risk.id} 
                      className={`border rounded-xl p-4 transition-colors ${
                        risk.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                        risk.severity === 'medium' ? 'bg-amber-500/10 border-amber-500/30' :
                        'bg-muted border-border'
                      }`}
                      data-testid={`risk-${risk.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base text-foreground flex-1">{risk.text}</p>
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
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Question className="h-4 w-4 text-sky-400" weight="duotone" />
                  Clarifying Questions
                  {questions.length > 0 && (
                    <Badge variant="outline" className="rounded-full bg-accent text-foreground border-border">{questions.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 md:px-6 space-y-3">
                {questions.length === 0 ? (
                  <p className="text-center py-6 text-muted-foreground text-base">No clarifying questions needed.</p>
                ) : (
                  questions.map((question: any) => (
                    <div 
                      key={question.id} 
                      className="border border-sky-500/30 rounded-xl p-4 bg-sky-500/10 space-y-3"
                      data-testid={`question-${question.id}`}
                    >
                      <p className="text-base text-foreground">{question.text}</p>
                      {question.options && question.options.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {question.options.map((option: string, idx: number) => (
                            <button
                              key={idx}
                              className="px-4 py-2 rounded-full text-sm font-medium bg-accent border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 active:bg-sky-500/30 transition-colors"
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

          {meeting.notes && (
            <div className={`${activeTab === 'highlight' ? 'block' : 'hidden md:block'}`}>
              <Card className="glass-panel rounded-2xl">
                <CardHeader className="px-4 pt-4 pb-2 md:px-6">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <HighlighterCircle className="h-4 w-4 text-primary" weight="duotone" />
                    Manual Highlight
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 md:px-6">
                  <TextHighlighter
                    text={meeting.notes}
                    highlights={manualHighlights}
                    onHighlightsChange={setManualHighlights}
                    onConfirm={handleHighlightConfirm}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <div className="hidden md:flex gap-3 pt-2 flex-wrap">
            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full border-border text-foreground hover:bg-accent h-11" data-testid="button-export-calendar">
                  <CalendarBlank className="mr-2 h-4 w-4" weight="duotone" />
                  Export .ics
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel sm:max-w-md rounded-3xl border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground text-lg">Export to Calendar</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 mt-4">
                  <p className="text-base text-muted-foreground">
                    Export this meeting as an .ics file that you can import into any calendar app.
                  </p>
                  
                  <div className="flex items-center justify-between p-4 bg-muted rounded-xl gap-4">
                    <div className="flex-1">
                      <Label className="text-base text-foreground">Include action items as tasks</Label>
                      <p className="text-sm text-muted-foreground mt-1">Action items with due dates will be added as separate calendar tasks</p>
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
              <Button variant="outline" onClick={handleViewDrafts} className="rounded-full border-border text-foreground hover:bg-accent h-11" data-testid="button-view-drafts">
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

      <div className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-border p-4 pb-safe z-50">
        <div className="flex items-center gap-3">
          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-12 px-4 rounded-xl border-border text-foreground hover:bg-accent" data-testid="button-export-mobile">
                <CalendarBlank className="h-5 w-5" weight="duotone" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel sm:max-w-md rounded-t-3xl sm:rounded-3xl fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 max-h-[85vh] overflow-y-auto border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground text-lg">Export to Calendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <p className="text-base text-muted-foreground">
                  Export this meeting as an .ics file.
                </p>
                
                <div className="flex items-center justify-between p-4 bg-muted rounded-xl gap-4">
                  <div className="flex-1">
                    <Label className="text-base text-foreground">Include action items</Label>
                    <p className="text-sm text-muted-foreground mt-1">Add tasks with due dates</p>
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
