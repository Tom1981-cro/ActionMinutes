import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Waveform, SpinnerGap, MagicWand, ListChecks, ChatTeardropDots, 
  Tag, SmileyMeh, SmileyWink, SmileySad, ArrowRight, Clock,
  User, CalendarBlank, Download, CaretDown, CaretUp
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Transcript = {
  id: string;
  title: string | null;
  text: string;
  language: string | null;
  duration: number | null;
  provider: string | null;
  keywords: string[] | null;
  createdAt: string;
};

type TranscriptSummary = {
  id: string;
  summary: string;
  decisions: string[];
  sentiment: string;
  sentimentScore: number;
  topKeywords: string[];
  createdAt: string;
};

type TranscriptTask = {
  id: string;
  text: string;
  assignee: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  keywords: string[];
};

export default function TranscriptsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  const { data: transcripts = [], isLoading } = useQuery<Transcript[]>({
    queryKey: ["/api/transcripts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/transcripts?userId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch transcripts");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/transcripts/summary", selectedTranscript],
    queryFn: async () => {
      if (!selectedTranscript || !user?.id) return null;
      const res = await fetch(`/api/transcripts/${selectedTranscript}/summary?userId=${user.id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: !!selectedTranscript && !!user?.id,
  });

  const summarizeMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      const res = await fetch(`/api/transcripts/${transcriptId}/summarize?userId=${user?.id}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Summarization failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts/summary", selectedTranscript] });
      toast({ title: "Summary generated", description: "AI analysis complete!" });
    },
    onError: (error: Error) => {
      toast({ title: "Summarization failed", description: error.message, variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: any }) => {
      const res = await fetch(`/api/transcript-tasks/${taskId}?userId=${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transcripts/summary", selectedTranscript] });
      toast({ title: "Task updated" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return <SmileyWink className="h-5 w-5 text-emerald-400" weight="duotone" />;
      case "negative": return <SmileySad className="h-5 w-5 text-red-400" weight="duotone" />;
      default: return <SmileyMeh className="h-5 w-5 text-amber-400" weight="duotone" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
      case "negative": return "text-red-400 bg-red-500/20 border-red-500/30";
      case "mixed": return "text-amber-400 bg-amber-500/20 border-amber-500/30";
      default: return "text-white/60 bg-white/10 border-white/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500/20 text-red-300 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "medium": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default: return "bg-white/10 text-white/60 border-white/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerGap className="h-8 w-8 animate-spin text-violet-500" weight="bold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-black tracking-tight text-gradient-light">Transcripts</h1>
        <p className="text-white/50 text-base">Audio transcriptions with AI-powered summaries.</p>
      </div>

      {transcripts.length === 0 ? (
        <div className="py-12 text-center glass-panel rounded-2xl border-dashed border-white/20">
          <div className="mx-auto h-16 w-16 bg-violet-500/20 rounded-2xl flex items-center justify-center mb-4">
            <Waveform className="h-8 w-8 text-violet-400" weight="duotone" />
          </div>
          <p className="text-white/70 text-base">No transcripts yet.</p>
          <p className="text-white/40 text-sm mt-1">Record audio in the Capture page to create transcripts.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white/80">Your Transcripts</h2>
            {transcripts.map((transcript) => (
              <Card 
                key={transcript.id}
                className={cn(
                  "glass-panel cursor-pointer transition-all rounded-2xl",
                  selectedTranscript === transcript.id 
                    ? "ring-2 ring-violet-500 shadow-lg shadow-violet-500/20" 
                    : "hover:translate-y-[-2px] hover:shadow-lg"
                )}
                onClick={() => setSelectedTranscript(transcript.id)}
                data-testid={`card-transcript-${transcript.id}`}
              >
                <CardHeader className="pb-2 px-4 pt-4">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg text-white">
                      {transcript.title || "Untitled Recording"}
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0 bg-violet-500/20 text-violet-300 border-violet-500/30 rounded-full">
                      {transcript.provider || "audio"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-white/50">
                    <span className="flex items-center gap-1">
                      <CalendarBlank className="h-4 w-4" />
                      {format(new Date(transcript.createdAt), "MMM d, yyyy")}
                    </span>
                    {transcript.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.round(transcript.duration / 60)}m
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60 line-clamp-2 flex-1">
                      {transcript.text.slice(0, 150)}...
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedTranscript(expandedTranscript === transcript.id ? null : transcript.id);
                      }}
                      data-testid={`button-expand-${transcript.id}`}
                    >
                      {expandedTranscript === transcript.id ? (
                        <CaretUp className="h-4 w-4" />
                      ) : (
                        <CaretDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {expandedTranscript === transcript.id && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm text-white/70 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {transcript.text}
                      </p>
                      {transcript.keywords && transcript.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {transcript.keywords.slice(0, 8).map((kw, i) => (
                            <Badge key={i} variant="outline" className="text-xs rounded-full">
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white/80">AI Summary</h2>
            {!selectedTranscript ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <MagicWand className="h-12 w-12 text-violet-400/50 mx-auto mb-3" weight="duotone" />
                <p className="text-white/50">Select a transcript to view or generate its AI summary.</p>
              </div>
            ) : summaryLoading ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <SpinnerGap className="h-8 w-8 animate-spin text-violet-500 mx-auto" weight="bold" />
                <p className="text-white/50 mt-3">Loading summary...</p>
              </div>
            ) : !summaryData?.summary ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <MagicWand className="h-12 w-12 text-violet-400/50 mx-auto mb-3" weight="duotone" />
                <p className="text-white/60 mb-4">No summary generated yet.</p>
                <Button
                  onClick={() => summarizeMutation.mutate(selectedTranscript)}
                  disabled={summarizeMutation.isPending}
                  className="btn-gradient rounded-xl"
                  data-testid="button-generate-summary"
                >
                  {summarizeMutation.isPending ? (
                    <>
                      <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <MagicWand className="mr-2 h-4 w-4" weight="bold" />
                      Generate AI Summary
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-white/5 rounded-xl p-1" data-testid="summary-tabs">
                  <TabsTrigger value="summary" className="rounded-lg data-[state=active]:bg-violet-500/20" data-testid="tab-summary">
                    <ChatTeardropDots className="mr-2 h-4 w-4" />
                    Summary
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-violet-500/20" data-testid="tab-tasks">
                    <ListChecks className="mr-2 h-4 w-4" />
                    Tasks
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="rounded-lg data-[state=active]:bg-violet-500/20" data-testid="tab-insights">
                    <Tag className="mr-2 h-4 w-4" />
                    Insights
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4">
                  <Card className="glass-panel rounded-2xl">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        {getSentimentIcon(summaryData.summary.sentiment)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={cn("rounded-full", getSentimentColor(summaryData.summary.sentiment))} data-testid="badge-sentiment">
                              {summaryData.summary.sentiment} ({(summaryData.summary.sentimentScore * 100).toFixed(0)}%)
                            </Badge>
                          </div>
                          <p className="text-white/80 leading-relaxed" data-testid="text-summary">{summaryData.summary.summary}</p>
                        </div>
                      </div>

                      {summaryData.summary.decisions && summaryData.summary.decisions.length > 0 && (
                        <div className="pt-4 border-t border-white/10">
                          <h4 className="text-sm font-semibold text-white/70 mb-2">Key Decisions</h4>
                          <ul className="space-y-2">
                            {summaryData.summary.decisions.map((decision: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                                <ArrowRight className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                                {decision}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => summarizeMutation.mutate(selectedTranscript)}
                          disabled={summarizeMutation.isPending}
                          data-testid="button-regenerate-summary"
                        >
                          {summarizeMutation.isPending ? (
                            <SpinnerGap className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <MagicWand className="mr-2 h-3 w-3" />
                          )}
                          Regenerate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <Card className="glass-panel rounded-2xl">
                    <CardContent className="p-5">
                      {(!summaryData.tasks || summaryData.tasks.length === 0) ? (
                        <p className="text-white/50 text-center py-4">No action items extracted.</p>
                      ) : (
                        <ul className="space-y-3">
                          {summaryData.tasks.map((task: TranscriptTask) => (
                            <li 
                              key={task.id} 
                              className={cn(
                                "p-3 rounded-xl bg-white/5 border border-white/10",
                                task.status === "completed" && "opacity-60"
                              )}
                              data-testid={`task-item-${task.id}`}
                            >
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={task.status === "completed"}
                                  onCheckedChange={(checked) => {
                                    updateTaskMutation.mutate({
                                      taskId: task.id,
                                      updates: { status: checked ? "completed" : "pending" }
                                    });
                                  }}
                                  className="mt-1"
                                  data-testid={`checkbox-task-${task.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-sm text-white/80",
                                    task.status === "completed" && "line-through"
                                  )}>
                                    {task.text}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Badge variant="outline" className={cn("text-xs rounded-full", getPriorityColor(task.priority))}>
                                      {task.priority}
                                    </Badge>
                                    {task.assignee && (
                                      <span className="flex items-center gap-1 text-xs text-white/50">
                                        <User className="h-3 w-3" />
                                        {task.assignee}
                                      </span>
                                    )}
                                    {task.dueDate && (
                                      <span className="flex items-center gap-1 text-xs text-white/50">
                                        <CalendarBlank className="h-3 w-3" />
                                        {format(new Date(task.dueDate), "MMM d")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Select
                                  value={task.status}
                                  onValueChange={(value) => {
                                    updateTaskMutation.mutate({
                                      taskId: task.id,
                                      updates: { status: value }
                                    });
                                  }}
                                >
                                  <SelectTrigger className="w-[120px] h-8 text-xs rounded-lg" data-testid={`select-status-${task.id}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="mt-4">
                  <Card className="glass-panel rounded-2xl">
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white/70 mb-3">Top Keywords</h4>
                        <div className="flex flex-wrap gap-2">
                          {summaryData.summary.topKeywords?.map((keyword: string, i: number) => (
                            <Badge 
                              key={i} 
                              variant="outline" 
                              className="rounded-full bg-violet-500/10 text-violet-300 border-violet-500/30"
                            >
                              <Tag className="mr-1 h-3 w-3" />
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h4 className="text-sm font-semibold text-white/70 mb-3">Sentiment Analysis</h4>
                        <div className="flex items-center gap-4">
                          {getSentimentIcon(summaryData.summary.sentiment)}
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-white/60">Overall Tone</span>
                              <span className="text-white/80 capitalize">{summaryData.summary.sentiment}</span>
                            </div>
                            <Progress 
                              value={(summaryData.summary.sentimentScore + 1) * 50} 
                              className="h-2 bg-white/10"
                            />
                            <div className="flex justify-between text-xs text-white/40 mt-1">
                              <span>Negative</span>
                              <span>Neutral</span>
                              <span>Positive</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h4 className="text-sm font-semibold text-white/70 mb-2">Export Options</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => window.open(`/api/transcripts/${selectedTranscript}/export/txt?userId=${user?.id}`, '_blank')}
                            data-testid="button-export-txt"
                          >
                            <Download className="mr-2 h-3 w-3" />
                            TXT
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg"
                            onClick={() => window.open(`/api/transcripts/${selectedTranscript}/export/srt?userId=${user?.id}`, '_blank')}
                            data-testid="button-export-srt"
                          >
                            <Download className="mr-2 h-3 w-3" />
                            SRT
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
