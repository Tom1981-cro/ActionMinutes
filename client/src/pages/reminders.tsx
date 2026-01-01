import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Clock, Plus, Loader2, CheckCircle, Circle, Trash2, Edit2, Calendar, ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const BUCKETS = [
  { value: "today", label: "Today", icon: "🌅" },
  { value: "tomorrow", label: "Tomorrow", icon: "🌄" },
  { value: "next_week", label: "Next Week", icon: "📅" },
  { value: "next_month", label: "Next Month", icon: "📆" },
  { value: "sometime", label: "Sometime", icon: "🌟" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-gray-500" },
  { value: "normal", label: "Normal", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-red-500" },
];

export default function RemindersPage() {
  const { user } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [showNewReminder, setShowNewReminder] = useState(false);
  const [newText, setNewText] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("sometime");
  const [selectedPriority, setSelectedPriority] = useState("normal");
  const [activeBucket, setActiveBucket] = useState("today");
  
  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal/reminders?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load reminders');
      return res.json();
    },
    enabled: !!user.id && user.isAuthenticated,
  });
  
  const createReminder = useMutation({
    mutationFn: async (data: { text: string; bucket: string; priority: string }) => {
      const res = await fetch('/api/personal/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to create reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      setShowNewReminder(false);
      setNewText("");
      setSelectedBucket("sometime");
      setSelectedPriority("normal");
      toast({ title: "Reminder added" });
    },
  });
  
  const toggleComplete = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const res = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted, userId: user.id }),
      });
      if (!res.ok) throw new Error('Failed to update reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
  
  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/personal/reminders/${id}?userId=${user.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete reminder');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: "Reminder deleted" });
    },
  });
  
  const handleSave = () => {
    if (!newText.trim()) {
      toast({ title: "Please enter a reminder", variant: "destructive" });
      return;
    }
    createReminder.mutate({ text: newText, bucket: selectedBucket, priority: selectedPriority });
  };
  
  const getBucketReminders = (bucket: string) => {
    return reminders.filter((r: any) => r.bucket === bucket && !r.isCompleted);
  };
  
  const completedReminders = reminders.filter((r: any) => r.isCompleted);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800">Reminders</h1>
          <p className="text-gray-500 text-base mt-1">Personal tasks and to-dos</p>
        </div>
        <Button 
          onClick={() => setShowNewReminder(true)}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg"
          data-testid="button-new-reminder"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>
      
      <Tabs value={activeBucket} onValueChange={setActiveBucket}>
        <TabsList className="bg-gray-100 p-1 rounded-xl w-full flex overflow-x-auto">
          {BUCKETS.map((bucket) => (
            <TabsTrigger 
              key={bucket.value}
              value={bucket.value}
              className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm min-w-fit px-3"
              data-testid={`tab-${bucket.value}`}
            >
              <span className="mr-1">{bucket.icon}</span>
              <span className="hidden sm:inline">{bucket.label}</span>
              {getBucketReminders(bucket.value).length > 0 && (
                <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 rounded-full px-1.5">
                  {getBucketReminders(bucket.value).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {BUCKETS.map((bucket) => (
          <TabsContent key={bucket.value} value={bucket.value} className="mt-4">
            {getBucketReminders(bucket.value).length === 0 ? (
              <Card className="bg-gray-50/50 border-dashed border-gray-300 rounded-xl">
                <CardContent className="py-8 text-center">
                  <p className="text-gray-500">No reminders for {bucket.label.toLowerCase()}</p>
                  <Button 
                    variant="link" 
                    onClick={() => { setSelectedBucket(bucket.value); setShowNewReminder(true); }}
                    className="mt-2 text-indigo-600"
                  >
                    Add one
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {getBucketReminders(bucket.value).map((reminder: any) => (
                  <Card key={reminder.id} className="bg-white border-gray-200 rounded-xl">
                    <CardContent className="p-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleComplete.mutate({ id: reminder.id, isCompleted: true })}
                        className="shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        data-testid={`complete-${reminder.id}`}
                      >
                        <Circle className="h-5 w-5 text-gray-300 hover:text-indigo-500" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 truncate">{reminder.text}</p>
                        {reminder.priority !== 'normal' && (
                          <span className={`text-xs ${
                            reminder.priority === 'high' ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {reminder.priority} priority
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => deleteReminder.mutate(reminder.id)}
                        className="shrink-0 p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500"
                        data-testid={`delete-${reminder.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {completedReminders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedReminders.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {completedReminders.slice(0, 5).map((reminder: any) => (
              <Card key={reminder.id} className="bg-gray-50 border-gray-200 rounded-xl">
                <CardContent className="p-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleComplete.mutate({ id: reminder.id, isCompleted: false })}
                    className="shrink-0"
                    data-testid={`uncomplete-${reminder.id}`}
                  >
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </button>
                  <p className="flex-1 text-gray-500 line-through truncate">{reminder.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      <Dialog open={showNewReminder} onOpenChange={setShowNewReminder}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">What do you need to remember?</label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g., Call the dentist"
                className="bg-gray-50 border-gray-200 rounded-xl h-12 focus:bg-white"
                data-testid="input-reminder-text"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">When?</label>
                <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                  <SelectTrigger className="rounded-xl" data-testid="select-bucket">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKETS.map((bucket) => (
                      <SelectItem key={bucket.value} value={bucket.value}>
                        {bucket.icon} {bucket.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Priority</label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="rounded-xl" data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className={p.color}>{p.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowNewReminder(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createReminder.isPending}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600"
                data-testid="button-save-reminder"
              >
                {createReminder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Reminder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
