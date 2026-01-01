import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { 
  Search, 
  Bug, 
  Lightbulb, 
  Palette, 
  HelpCircle,
  ArrowLeft,
  Mail,
  Globe,
  Monitor,
  Clock,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link} from "wouter";

type Feedback = {
  id: string;
  userId: string | null;
  type: string;
  message: string;
  email: string | null;
  route: string | null;
  viewport: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
};

const typeIcons: Record<string, typeof Bug> = {
  bug: Bug,
  feature: Lightbulb,
  ux: Palette,
  other: HelpCircle,
};

const typeColors: Record<string, string> = {
  bug: "text-red-500 bg-red-50",
  feature: "text-amber-500 bg-amber-50",
  ux: "text-purple-500 bg-purple-50",
  other: "text-stone-500 bg-stone-100",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
};

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useStore();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const { data: feedbackList = [], isLoading, error } = useQuery<Feedback[]>({
    queryKey: ["/api/admin/feedback", search, statusFilter, user.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user.id) params.set("userId", user.id);
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      const response = await fetch(`/api/admin/feedback?${params}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fetch feedback");
      }
      return response.json();
    },
    enabled: !!user.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/admin/feedback/${id}?userId=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus });
    if (selectedFeedback?.id === id) {
      setSelectedFeedback({ ...selectedFeedback, status: newStatus });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="rounded-full h-11 w-11" aria-label="Back to settings">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Feedback</h1>
            <p className="text-stone-500">User feedback submissions</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              type="text"
              placeholder="Search feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl border-stone-200"
              data-testid="input-search-feedback"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] h-11 rounded-xl border-stone-200" data-testid="select-status-filter">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <Card className="bg-white border-stone-200 rounded-2xl">
            <CardContent className="py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium mb-1">Access Denied</p>
              <p className="text-stone-500 text-sm">{(error as Error).message}</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-center py-12 text-stone-500">Loading...</div>
        ) : feedbackList.length === 0 ? (
          <Card className="bg-white border-stone-200 rounded-2xl">
            <CardContent className="py-12 text-center">
              <HelpCircle className="h-12 w-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500">No feedback found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {feedbackList.map((fb) => {
              const TypeIcon = typeIcons[fb.type] || HelpCircle;
              return (
                <Card 
                  key={fb.id} 
                  className="bg-white border-stone-200 rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedFeedback(fb)}
                  data-testid={`card-feedback-${fb.id}`}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className={cn("p-2 rounded-xl", typeColors[fb.type])}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-slate-800 capitalize">{fb.type}</span>
                        <Badge className={cn("text-xs", statusColors[fb.status])}>
                          {fb.status === "in_progress" ? "In Progress" : fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-stone-600 text-sm line-clamp-2">{fb.message}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(fb.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                        {fb.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {fb.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedFeedback && (
            <>
              <SheetHeader className="pb-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", typeColors[selectedFeedback.type])}>
                    {(() => {
                      const Icon = typeIcons[selectedFeedback.type] || HelpCircle;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <SheetTitle className="text-lg text-slate-800 capitalize">{selectedFeedback.type} Report</SheetTitle>
                    <SheetDescription className="text-stone-500">
                      {format(new Date(selectedFeedback.createdAt), "MMMM d, yyyy h:mm a")}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="py-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <Select 
                    value={selectedFeedback.status} 
                    onValueChange={(value) => handleStatusChange(selectedFeedback.id, value)}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl border-stone-200" data-testid="select-detail-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Message</label>
                  <div className="bg-stone-50 p-4 rounded-2xl text-slate-700 text-base whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </div>
                </div>

                {selectedFeedback.email && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-stone-400" />
                      Contact Email
                    </label>
                    <div className="bg-stone-50 p-3 rounded-xl text-slate-700">
                      {selectedFeedback.email}
                    </div>
                  </div>
                )}

                {(selectedFeedback.route || selectedFeedback.viewport || selectedFeedback.userAgent) && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">Diagnostics</label>
                    <div className="bg-stone-50 p-4 rounded-2xl space-y-3">
                      {selectedFeedback.route && (
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-stone-400 mt-0.5" />
                          <div>
                            <div className="text-xs text-stone-400">Route</div>
                            <div className="text-sm text-slate-700">{selectedFeedback.route}</div>
                          </div>
                        </div>
                      )}
                      {selectedFeedback.viewport && (
                        <div className="flex items-start gap-2">
                          <Monitor className="h-4 w-4 text-stone-400 mt-0.5" />
                          <div>
                            <div className="text-xs text-stone-400">Viewport</div>
                            <div className="text-sm text-slate-700">{selectedFeedback.viewport}</div>
                          </div>
                        </div>
                      )}
                      {selectedFeedback.userAgent && (
                        <div className="flex items-start gap-2">
                          <Globe className="h-4 w-4 text-stone-400 mt-0.5" />
                          <div>
                            <div className="text-xs text-stone-400">User Agent</div>
                            <div className="text-xs text-slate-700 break-all">{selectedFeedback.userAgent}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedFeedback.userId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">User ID</label>
                    <div className="bg-stone-50 p-3 rounded-xl text-xs text-stone-500 font-mono">
                      {selectedFeedback.userId}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
