import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { Bug, Lightbulb, Palette, Question } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const feedbackTypes = [
  { value: "bug", label: "Bug", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "Feature", icon: Lightbulb, color: "text-violet-500" },
  { value: "ux", label: "UX Issue", icon: Palette, color: "text-purple-500" },
  { value: "other", label: "Other", icon: Question, color: "text-muted-foreground" },
];

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [location] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();
  
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  const submitFeedback = useMutation({
    mutationFn: async (data: {
      userId?: string;
      type: string;
      message: string;
      email?: string;
      route?: string;
      viewport?: string;
      userAgent?: string;
    }) => {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to submit feedback");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Feedback sent", description: "Thank you for your feedback!" });
      setType("bug");
      setMessage("");
      setEmail("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send feedback", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!message.trim()) {
      toast({ title: "Message required", description: "Please describe your feedback", variant: "destructive" });
      return;
    }

    const diagnostics = includeDiagnostics ? {
      route: location,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
    } : {};

    submitFeedback.mutate({
      userId: user.id || undefined,
      type,
      message: message.trim(),
      email: email.trim() || undefined,
      ...diagnostics,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-w-[calc(100vw-2rem)] rounded-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">Send Feedback</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Help us improve ActionMinutes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 w-full">
          <div className="space-y-2">
            <Label className="text-base text-foreground">Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {feedbackTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-border hover:border-border"
                    )}
                    data-testid={`button-feedback-type-${t.value}`}
                  >
                    <Icon className={cn("h-5 w-5", isSelected ? "text-indigo-600" : t.color)} weight="duotone" />
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-indigo-700" : "text-foreground"
                    )}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-base text-foreground">Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your feedback..."
              className="min-h-[100px] rounded-xl border-border text-base w-full"
              data-testid="input-feedback-message"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base text-foreground">Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-11 rounded-xl border-border w-full"
              data-testid="input-feedback-email"
            />
            <p className="text-xs text-muted-foreground">For follow-up if needed</p>
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label className="text-base text-foreground">Include diagnostics</Label>
              <p className="text-xs text-muted-foreground">Route, viewport size, browser</p>
            </div>
            <Switch
              checked={includeDiagnostics}
              onCheckedChange={setIncludeDiagnostics}
              className="shrink-0"
              data-testid="switch-diagnostics"
            />
          </div>

          {includeDiagnostics && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-xl space-y-1 overflow-hidden">
              <div className="truncate">Route: {location}</div>
              <div className="truncate">Viewport: {typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "N/A"}</div>
              <div className="truncate">Browser: {typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 50) + "..." : "N/A"}</div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2 w-full">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-12 rounded-xl border-border"
            data-testid="button-feedback-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitFeedback.isPending || !message.trim()}
            className="flex-1 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-600"
            data-testid="button-feedback-submit"
          >
            {submitFeedback.isPending ? "Sending..." : "Send Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
