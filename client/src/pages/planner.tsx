import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { useActionItems, useMeetings } from "@/lib/hooks";
import { authenticatedFetch } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  Sun, Moon, CloudSun, CloudRain, CloudSnow, Wind, CloudFog, Cloud, Lightning as LightningBolt, Thermometer,
  MapPin, Circle, CheckCircle, Clock, CalendarBlank, Tray, Target, Users, CaretRight,
  Plus, ArrowRight, Sparkle, Star, Play, ArrowDown, ArrowUp
} from "@phosphor-icons/react";
import { TaskDetailModal } from "@/components/task-detail-modal";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface ActionTask {
  id: string;
  text: string;
  dueDate: string | null;
  ownerName: string | null;
  status: string;
  priority?: string;
  source: 'meeting' | 'quickadd';
  estimatedMinutes?: number;
}

const MAX_URGENT_ITEMS = 3;

export default function PlannerPage() {
  const { user, setFocusTask } = useStore();
  const [, navigate] = useLocation();

  const [promotedIds, setPromotedIds] = useState<Set<string>>(new Set());
  const [demotedIds, setDemotedIds] = useState<Set<string>>(new Set());

  const [modalItem, setModalItem] = useState<{ id: string; type: "meeting" | "reminder" } | null>(null);

  const { data: actions = [], isLoading: actionsLoading } = useActionItems();

  const { data: allMeetings = [], isLoading: meetingsLoading } = useMeetings();

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const todayActions: ActionTask[] = (actions as any[])
    .filter((a: any) => {
      if (a.status === 'done' || a.status === 'completed') return false;
      if (a.deletedAt) return false;
      if (!a.dueDate) return a.status === 'needs_review';
      const due = new Date(a.dueDate);
      return due <= endOfToday;
    })
    .map((a: any) => ({
      id: a.id,
      text: a.text,
      dueDate: a.dueDate,
      ownerName: a.ownerName,
      status: a.status,
      priority: a.priority || 'normal',
      source: a.meetingId ? 'meeting' as const : 'quickadd' as const,
      estimatedMinutes: 30,
    }))
    .sort((a, b) => {
      if (a.status === 'needs_review' && b.status !== 'needs_review') return -1;
      if (a.status !== 'needs_review' && b.status === 'needs_review') return 1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
    });

  const naturalUrgent = todayActions.filter(t =>
    (t.dueDate && new Date(t.dueDate) < startOfToday) || t.priority === 'high' || t.status === 'needs_review'
  );
  const naturalOther = todayActions.filter(t => !naturalUrgent.includes(t));

  const urgentCandidates = [
    ...naturalUrgent.filter(t => !demotedIds.has(t.id)),
    ...naturalOther.filter(t => promotedIds.has(t.id)),
  ];
  const overdueOrUrgent = urgentCandidates.slice(0, MAX_URGENT_ITEMS);
  const urgentOverflow = urgentCandidates.slice(MAX_URGENT_ITEMS);
  const otherTasks = [
    ...naturalOther.filter(t => !promotedIds.has(t.id)),
    ...naturalUrgent.filter(t => demotedIds.has(t.id)),
    ...urgentOverflow,
  ];

  const spent = todayActions.length * 30;
  const capacity = 480;
  const remaining = Math.max(0, capacity - spent);

  const isLoading = actionsLoading || meetingsLoading;

  const handleStartFocus = (taskText: string) => {
    setFocusTask(taskText);
    navigate('/app/focus');
  };

  const handlePromote = (taskId: string) => {
    if (overdueOrUrgent.length >= MAX_URGENT_ITEMS) return;
    setPromotedIds(prev => new Set(prev).add(taskId));
    setDemotedIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const handleDemote = (taskId: string) => {
    setDemotedIds(prev => new Set(prev).add(taskId));
    setPromotedIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const urgentIsFull = overdueOrUrgent.length >= MAX_URGENT_ITEMS;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded-lg" />
          <div className="flex gap-6">
            <div className="w-1/3 h-64 bg-gray-200 rounded-3xl" />
            <div className="w-2/3 h-64 bg-gray-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full" data-testid="planner-page">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {user.name || "there"}
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">{getFormattedDate()}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-[calc(100%-80px)]">
        {/* Time Budget */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center md:w-1/3">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Time Budget</p>
          <p className="text-xs text-gray-400 italic mb-3">Manage your time as financial budget</p>
          <div className="relative w-40 h-40 flex items-center justify-center mb-6">
            <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="74" stroke="#f3f4f6" strokeWidth="12" fill="none" />
              <circle cx="80" cy="80" r="74" stroke="#8b5cf6" strokeWidth="12" fill="none"
                strokeDasharray="465" strokeDashoffset={465 - (spent / capacity) * 465} strokeLinecap="round" />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-light text-gray-900 tracking-tighter">{remaining}</span>
              <span className="text-xs text-gray-500 font-medium">min left</span>
            </div>
          </div>
          <div className="w-full space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Tasks today</span>
              <span className="font-semibold text-gray-900">{todayActions.length}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/inbox')}
            className="w-full mt-4 bg-violet-50 text-violet-700 py-2.5 rounded-xl text-sm font-bold border border-violet-100 hover:bg-violet-100 transition-colors"
            data-testid="button-adjust-capacity"
          >
            Add from Inbox
          </button>
        </div>

        {/* Binary Matrix */}
        <div className="flex flex-col gap-4 md:w-2/3 flex-1">
          {/* Urgent & Important */}
          <div className="bg-gray-900 rounded-3xl p-5 shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-end mb-4 border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white">Urgent & Important</h3>
              <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-1 rounded">
                {overdueOrUrgent.length} / {MAX_URGENT_ITEMS} max
              </span>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
              {overdueOrUrgent.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                  No urgent items — nice work!
                </div>
              ) : (
                overdueOrUrgent.map(t => (
                  <div key={t.id} className="bg-gray-800 p-3.5 rounded-2xl flex justify-between items-center border border-gray-700 group">
                    <button
                      onClick={() => setModalItem({ id: t.id, type: t.source === 'meeting' ? 'meeting' : 'reminder' })}
                      className="text-sm font-medium text-gray-100 text-left flex-1 mr-2 hover:text-white transition-colors"
                      data-testid={`task-urgent-${t.id}`}
                    >
                      {t.text}
                    </button>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-bold bg-gray-700 text-gray-300 px-2 py-1 rounded">{t.estimatedMinutes}m</span>
                      <button
                        onClick={() => handleDemote(t.id)}
                        className="p-1.5 bg-gray-700 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-600 transition-colors"
                        title="Move to Everything Else"
                        data-testid={`demote-${t.id}`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" weight="bold" />
                      </button>
                      <button
                        onClick={() => handleStartFocus(t.text)}
                        className="p-1.5 bg-violet-600 rounded-lg text-white hover:bg-violet-500 transition-colors"
                        data-testid={`focus-urgent-${t.id}`}
                      >
                        <Play className="w-3.5 h-3.5" weight="fill" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Everything Else */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Everything Else</h3>
            <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
              {otherTasks.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
                  All clear for today
                </div>
              ) : (
                <>
                  {otherTasks.map(t => (
                    <div key={t.id} className="bg-gray-50 p-3.5 rounded-2xl flex justify-between items-center border border-gray-100 group">
                      <button
                        onClick={() => setModalItem({ id: t.id, type: t.source === 'meeting' ? 'meeting' : 'reminder' })}
                        className="text-sm font-medium text-gray-700 text-left flex-1 mr-2 hover:text-gray-900 transition-colors"
                        data-testid={`task-other-${t.id}`}
                      >
                        {t.text}
                      </button>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-1 rounded">{t.estimatedMinutes}m</span>
                        <button
                          onClick={() => handlePromote(t.id)}
                          disabled={urgentIsFull}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            urgentIsFull
                              ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                              : "bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-violet-600 hover:border-violet-300"
                          )}
                          title={urgentIsFull ? "Urgent & Important is full (max 3)" : "Move to Urgent & Important"}
                          data-testid={`promote-${t.id}`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" weight="bold" />
                        </button>
                        <button
                          onClick={() => handleStartFocus(t.text)}
                          className="p-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-gray-400 hover:text-violet-600 transition-colors"
                          data-testid={`focus-other-${t.id}`}
                        >
                          <Play className="w-3.5 h-3.5" weight="fill" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalItem && (
        <TaskDetailModal
          open={!!modalItem}
          onClose={() => setModalItem(null)}
          itemId={modalItem.id}
          itemType={modalItem.type}
        />
      )}
    </div>
  );
}
