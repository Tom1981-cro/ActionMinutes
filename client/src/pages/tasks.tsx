import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, SpinnerGap, CheckCircle, Circle, Trash, 
  ListBullets, Kanban, FunnelSimple, CaretDown, Calendar,
  Lightning, Clock, Tag, FolderSimple, Repeat, MagicWand, 
  ArrowsDownUp
} from "@phosphor-icons/react";
import { format, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  userId: string;
  workspaceId: string | null;
  projectId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  recurrence: string | null;
  recurrenceEndDate: string | null;
  nextOccurrence: string | null;
  sourceType: string | null;
  sourceId: string | null;
  tags: string[];
  estimatedMinutes: number | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  userId: string;
  workspaceId: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  keywords: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ParsedTaskResult {
  title: string;
  dueDate: string | null;
  dueDateText: string | null;
  priority: string;
  priorityDetected: boolean;
  suggestedProjectKeywords: string[];
  recurrence: string | null;
  estimatedMinutes: number | null;
  tags: string[];
  projectSuggestions: { projectId: string; name: string; score: number }[];
}

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "bg-red-500/20 text-red-400 border-red-500/30", order: 0 },
  high: { label: "High", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", order: 1 },
  medium: { label: "Medium", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", order: 2 },
  low: { label: "Low", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", order: 3 },
};

const STATUS_CONFIG = {
  todo: { label: "To Do", color: "bg-slate-500/20 text-slate-300" },
  in_progress: { label: "In Progress", color: "bg-violet-500/20 text-violet-300" },
  done: { label: "Done", color: "bg-emerald-500/20 text-emerald-300" },
};

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

function getDueDateColor(dateStr: string | null): string {
  if (!dateStr) return "text-white/40";
  const date = new Date(dateStr);
  if (isPast(date) && !isToday(date)) return "text-red-400";
  if (isToday(date)) return "text-amber-400";
  if (isTomorrow(date)) return "text-orange-400";
  return "text-white/60";
}

export default function TasksPage() {
  const { user, currentWorkspaceId, workspaces } = useStore();
  const { toast } = useToast();
  
  const activeWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "created">("dueDate");
  
  const [quickAddInput, setQuickAddInput] = useState("");
  const [parsedTask, setParsedTask] = useState<ParsedTaskResult | null>(null);
  const [isParsingTask, setIsParsingTask] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const parseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks", user?.id, currentWorkspaceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentWorkspaceId) params.set("workspaceId", currentWorkspaceId);
      const res = await authenticatedFetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", user?.id, currentWorkspaceId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentWorkspaceId) params.set("workspaceId", currentWorkspaceId);
      const res = await authenticatedFetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const parseTaskMutation = useMutation({
    mutationFn: async (input: string) => {
      const res = await authenticatedFetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input, 
          workspaceId: currentWorkspaceId,
        }),
      });
      if (!res.ok) throw new Error("Failed to parse task");
      return res.json() as Promise<ParsedTaskResult>;
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const res = await authenticatedFetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: currentWorkspaceId || null,
          ...taskData,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setQuickAddInput("");
      setParsedTask(null);
      toast({ title: "Task created" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const res = await authenticatedFetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to complete task");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authenticatedFetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await authenticatedFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: currentWorkspaceId || null,
          name,
          keywords: parsedTask?.suggestedProjectKeywords || [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Project created" });
    },
    onError: () => {
      toast({ title: "Failed to create project", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (quickAddInput.trim().length < 3) {
      setParsedTask(null);
      return;
    }
    
    if (parseTimeoutRef.current) {
      clearTimeout(parseTimeoutRef.current);
    }
    
    setIsParsingTask(true);
    parseTimeoutRef.current = setTimeout(async () => {
      try {
        const result = await parseTaskMutation.mutateAsync(quickAddInput);
        setParsedTask(result);
      } catch (error) {
        console.error("Failed to parse task:", error);
      } finally {
        setIsParsingTask(false);
      }
    }, 300);
    
    return () => {
      if (parseTimeoutRef.current) {
        clearTimeout(parseTimeoutRef.current);
      }
    };
  }, [quickAddInput]);

  const handleQuickAdd = async () => {
    if (!quickAddInput.trim()) return;
    
    const taskData: Partial<Task> = {
      title: parsedTask?.title || quickAddInput.trim(),
      dueDate: parsedTask?.dueDate || null,
      priority: parsedTask?.priority || "medium",
      recurrence: parsedTask?.recurrence || null,
      tags: parsedTask?.tags || [],
      estimatedMinutes: parsedTask?.estimatedMinutes || null,
      projectId: parsedTask?.projectSuggestions?.[0]?.projectId || null,
    };
    
    await createTaskMutation.mutateAsync(taskData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== "all" && task.status !== filterStatus) return false;
    if (filterProject !== "all" && task.projectId !== filterProject) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (sortBy === "priority") {
      const priorityA = PRIORITY_CONFIG[a.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 2;
      const priorityB = PRIORITY_CONFIG[b.priority as keyof typeof PRIORITY_CONFIG]?.order ?? 2;
      return priorityA - priorityB;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const tasksByStatus = {
    todo: sortedTasks.filter(t => t.status === "todo"),
    in_progress: sortedTasks.filter(t => t.status === "in_progress"),
    done: sortedTasks.filter(t => t.status === "done"),
  };

  const getProjectById = (id: string | null) => projects.find(p => p.id === id);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <SpinnerGap className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-white/60 text-sm">Manage your tasks with natural language input</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")}>
            <TabsList className="bg-white/5">
              <TabsTrigger value="list" className="gap-1.5" data-testid="view-list">
                <ListBullets className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5" data-testid="view-kanban">
                <Kanban className="h-4 w-4" />
                Board
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={quickAddInput}
                onChange={(e) => setQuickAddInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a task... Try 'Call client tomorrow at 2pm !high' or 'Review docs every week'"
                className="bg-white/5 border-white/10 h-11 pr-10"
                data-testid="quick-add-input"
              />
              {isParsingTask && (
                <SpinnerGap className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-violet-400" />
              )}
              {parsedTask && !isParsingTask && (
                <MagicWand className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
              )}
            </div>
            <Button 
              onClick={handleQuickAdd} 
              disabled={!quickAddInput.trim() || createTaskMutation.isPending}
              className="h-11 gap-1.5"
              data-testid="add-task-button"
            >
              {createTaskMutation.isPending ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Task
            </Button>
          </div>
          
          {parsedTask && (
            <div className="mt-3 p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MagicWand className="h-4 w-4 text-violet-400" />
                <span className="text-violet-300 font-medium">AI Preview</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsedTask.dueDate && (
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-300 border-sky-500/30 gap-1">
                    <Calendar className="h-3 w-3" />
                    {parsedTask.dueDateText || formatDueDate(parsedTask.dueDate)}
                  </Badge>
                )}
                {parsedTask.priorityDetected && (
                  <Badge variant="outline" className={cn(PRIORITY_CONFIG[parsedTask.priority as keyof typeof PRIORITY_CONFIG]?.color, "gap-1")}>
                    <Lightning className="h-3 w-3" />
                    {PRIORITY_CONFIG[parsedTask.priority as keyof typeof PRIORITY_CONFIG]?.label}
                  </Badge>
                )}
                {parsedTask.recurrence && (
                  <Badge variant="outline" className="bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30 gap-1">
                    <Repeat className="h-3 w-3" />
                    {RECURRENCE_OPTIONS.find(r => r.value === parsedTask.recurrence)?.label}
                  </Badge>
                )}
                {parsedTask.estimatedMinutes && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 gap-1">
                    <Clock className="h-3 w-3" />
                    {parsedTask.estimatedMinutes}m
                  </Badge>
                )}
                {parsedTask.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
                {parsedTask.projectSuggestions.slice(0, 1).map(ps => (
                  <Badge key={ps.projectId} variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/30 gap-1">
                    <FolderSimple className="h-3 w-3" />
                    {ps.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-white/5 border-white/10">
                <FunnelSimple className="h-4 w-4" />
                Status: {filterStatus === "all" ? "All" : STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}
                <CaretDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>All</DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={() => setFilterStatus(key)}>
                  {config.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-white/5 border-white/10">
                <FolderSimple className="h-4 w-4" />
                Project: {filterProject === "all" ? "All" : getProjectById(filterProject)?.name || "None"}
                <CaretDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterProject("all")}>All Projects</DropdownMenuItem>
              <DropdownMenuSeparator />
              {projects.map(project => (
                <DropdownMenuItem key={project.id} onClick={() => setFilterProject(project.id)}>
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: project.color }} />
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 bg-white/5 border-white/10">
              <ArrowsDownUp className="h-4 w-4" />
              Sort: {sortBy === "dueDate" ? "Due Date" : sortBy === "priority" ? "Priority" : "Created"}
              <CaretDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSortBy("dueDate")}>Due Date</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("priority")}>Priority</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("created")}>Created</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {tasksLoading ? (
        <div className="flex items-center justify-center h-40">
          <SpinnerGap className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : viewMode === "list" ? (
        <Card className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
          <CardContent className="p-0">
            {sortedTasks.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <ListBullets className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No tasks yet</h3>
                <p className="text-white/60 text-sm">Add your first task using natural language above</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {sortedTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={getProjectById(task.projectId)}
                    onComplete={() => completeTaskMutation.mutate(task.id)}
                    onUpdate={(updates) => updateTaskMutation.mutate({ id: task.id, updates })}
                    onDelete={() => deleteTaskMutation.mutate(task.id)}
                    onSelect={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
            <Card key={status} className="bg-white/[0.03] border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={cn(STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color)}>
                    {STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}
                  </Badge>
                  <span className="text-white/40 text-sm">{statusTasks.length}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {statusTasks.length === 0 ? (
                  <div className="p-4 text-center text-white/40 text-sm border-2 border-dashed border-white/10 rounded-lg">
                    No tasks
                  </div>
                ) : (
                  statusTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      project={getProjectById(task.projectId)}
                      onComplete={() => completeTaskMutation.mutate(task.id)}
                      onUpdate={(updates) => updateTaskMutation.mutate({ id: task.id, updates })}
                      onDelete={() => deleteTaskMutation.mutate(task.id)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details</DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <TaskEditForm 
              task={selectedTask} 
              projects={projects}
              onSave={(updates) => {
                updateTaskMutation.mutate({ id: selectedTask.id, updates });
                setSelectedTask(null);
              }}
              onCancel={() => setSelectedTask(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskRow({ 
  task, 
  project,
  onComplete, 
  onUpdate, 
  onDelete,
  onSelect,
}: { 
  task: Task;
  project?: Project;
  onComplete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const isDone = task.status === "done";
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors group",
        isDone && "opacity-50"
      )}
    >
      <button
        onClick={isDone ? undefined : onComplete}
        className={cn(
          "flex-shrink-0 text-white/40 hover:text-violet-400 transition-colors",
          isDone && "cursor-default"
        )}
        data-testid={`task-checkbox-${task.id}`}
      >
        {isDone ? (
          <CheckCircle className="h-5 w-5 text-emerald-400" weight="fill" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      
      <div className="flex-1 min-w-0" onClick={onSelect}>
        <div className={cn("text-sm font-medium cursor-pointer", isDone && "line-through text-white/40")}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && (
            <span className={cn("text-xs flex items-center gap-1", getDueDateColor(task.dueDate))}>
              <Calendar className="h-3 w-3" />
              {formatDueDate(task.dueDate)}
            </span>
          )}
          {project && (
            <span className="text-xs flex items-center gap-1 text-white/50">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          )}
          {task.recurrence && (
            <span className="text-xs flex items-center gap-1 text-fuchsia-400">
              <Repeat className="h-3 w-3" />
              {RECURRENCE_OPTIONS.find(r => r.value === task.recurrence)?.label}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color || PRIORITY_CONFIG.medium.color
          )}
        >
          {PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label || "Medium"}
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
              <CaretDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onUpdate({ status: "todo" })}>Mark as To Do</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ status: "in_progress" })}>Mark as In Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdate({ status: "done" })}>Mark as Done</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSelect}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-red-400">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function TaskCard({ 
  task, 
  project,
  onComplete, 
  onUpdate, 
  onDelete,
}: { 
  task: Task;
  project?: Project;
  onComplete: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}) {
  const isDone = task.status === "done";
  
  return (
    <div className={cn(
      "p-3 bg-white/[0.03] border border-white/10 rounded-lg space-y-2",
      isDone && "opacity-50"
    )}>
      <div className="flex items-start gap-2">
        <button
          onClick={isDone ? undefined : onComplete}
          className={cn(
            "flex-shrink-0 mt-0.5 text-white/40 hover:text-violet-400 transition-colors",
            isDone && "cursor-default"
          )}
        >
          {isDone ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" weight="fill" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
        <span className={cn("text-sm font-medium flex-1", isDone && "line-through text-white/40")}>
          {task.title}
        </span>
      </div>
      
      <div className="flex flex-wrap items-center gap-1.5">
        {task.dueDate && (
          <Badge variant="outline" className={cn("text-xs py-0.5", getDueDateColor(task.dueDate), "border-current/30 bg-current/10")}>
            {formatDueDate(task.dueDate)}
          </Badge>
        )}
        {project && (
          <Badge variant="outline" className="text-xs py-0.5 bg-white/5 border-white/10">
            <span className="w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: project.color }} />
            {project.name}
          </Badge>
        )}
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs py-0.5 ml-auto",
            PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.color || PRIORITY_CONFIG.medium.color
          )}
        >
          {PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]?.label?.[0] || "M"}
        </Badge>
      </div>
    </div>
  );
}

function TaskEditForm({
  task,
  projects,
  onSave,
  onCancel,
}: {
  task: Task;
  projects: Project[];
  onSave: (updates: Partial<Task>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [projectId, setProjectId] = useState(task.projectId || "none");
  const [recurrence, setRecurrence] = useState(task.recurrence || "none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      status,
      projectId: projectId === "none" ? null : projectId,
      recurrence: recurrence === "none" ? null : recurrence,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm text-white/60 mb-1 block">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-white/5 border-white/10"
        />
      </div>
      
      <div>
        <label className="text-sm text-white/60 mb-1 block">Description</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-white/5 border-white/10"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-white/60 mb-1 block">Due Date</label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-white/5 border-white/10"
          />
        </div>
        <div>
          <label className="text-sm text-white/60 mb-1 block">Priority</label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-white/60 mb-1 block">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm text-white/60 mb-1 block">Project</label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Project</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <label className="text-sm text-white/60 mb-1 block">Recurrence</label>
        <Select value={recurrence} onValueChange={setRecurrence}>
          <SelectTrigger className="bg-white/5 border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Repeat</SelectItem>
            {RECURRENCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Changes</Button>
      </div>
    </form>
  );
}
