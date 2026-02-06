import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkle, FloppyDisk, ArrowLeft, CaretDown, CaretUp, 
  Users, Clock, MapPin, Camera, Upload, Microphone, 
  ArrowsClockwise, Copy, X, Check, User, Buildings, WarningCircle,
  ListChecks, Plus, Lightning
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCreateMeeting, useExtractMeeting, useAppConfig } from "@/lib/hooks";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, extractActionsFromText, type ExtractedAction } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlan } from "@/hooks/use-plan";
import { UsageBadge, UpgradePrompt } from "@/components/upgrade-prompt";

function useVirtualKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const viewport = window.visualViewport;
    
    const handleResize = () => {
      const windowHeight = window.innerHeight;
      const viewportHeight = viewport.height;
      const heightDiff = windowHeight - viewportHeight;
      
      if (heightDiff > 100) {
        setKeyboardHeight(heightDiff);
        setIsKeyboardVisible(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);
    
    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}

export default function CapturePage() {
  const [, setLocation] = useLocation();
  const { user } = useStore();
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const extractMeeting = useExtractMeeting();
  const { data: config } = useAppConfig();
  const { 
    canUseAiExtraction, 
    canUseTranscription, 
    usage, 
    isFree,
    getRemainingAiExtractions,
    getRemainingTranscriptionMinutes,
    refetch: refetchPlan
  } = usePlan();

  const aiEnabled = config?.features?.aiEnabled !== false;
  const canExtract = aiEnabled && canUseAiExtraction();
  const canTranscribe = canUseTranscription();

  const [title, setTitle] = useState(`Meeting — ${format(new Date(), "MMM d")}`);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocationValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<{ text: string; confidence?: number; warnings?: string[] } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [insertMode, setInsertMode] = useState<"replace" | "append">("append");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transcriptionLoading, setTranscriptionLoading] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionResult, setTranscriptionResult] = useState<{ text: string; confidence?: number } | null>(null);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [showTranscriptionPreview, setShowTranscriptionPreview] = useState(false);
  const [transcriptionInsertMode, setTranscriptionInsertMode] = useState<"replace" | "append">("append");
  const audioInputRef = useRef<HTMLInputElement>(null);

  const isCapacitorAvailable = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
  const { keyboardHeight, isKeyboardVisible } = useVirtualKeyboard();
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const [showReviewActions, setShowReviewActions] = useState(false);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [isAddingToReminders, setIsAddingToReminders] = useState(false);
  
  const detectedActions = useMemo(() => extractActionsFromText(notes), [notes]);
  const hasDetectedActions = detectedActions.length > 0;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
    }
  }, [notes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsHeaderSticky(container.scrollTop > 10);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const saveAttendees = async (meetingId: string) => {
    if (!attendees.trim()) return;
    const names = attendees.split(',').map(n => n.trim()).filter(n => n.length > 0);
    for (const name of names) {
      try {
        await fetch(`/api/meetings/${meetingId}/attendees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
      } catch (e) {
        console.error('Failed to add attendee:', name);
      }
    }
  };

  const handleExtract = async () => {
    if (!notes.trim()) {
      toast({ title: "No notes", description: "Please add some notes first.", variant: "destructive" });
      return;
    }
    
    if (!canExtract) {
      toast({ 
        title: "AI extraction limit reached", 
        description: "Upgrade to Pro for unlimited extractions.", 
        variant: "destructive" 
      });
      setLocation("/app/settings?tab=subscription");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const meeting = await createMeeting.mutateAsync({
        userId: user.id,
        title,
        date: new Date(date),
        rawNotes: notes,
        parseState: 'draft',
        workspaceId: null,
      });
      
      await saveAttendees(meeting.id);
      await extractMeeting.mutateAsync(meeting.id);
      
      toast({ title: "Processing...", description: "AI is extracting actions." });
      refetchPlan();
      
      setTimeout(() => {
        setIsSubmitting(false);
        setLocation(`/meeting/${meeting.id}`);
      }, 500);
    } catch (error: any) {
      setIsSubmitting(false);
      if (error?.response?.status === 403 && error?.response?.data?.limitType) {
        toast({ 
          title: "Limit reached", 
          description: "Upgrade to Pro for unlimited access.", 
          variant: "destructive" 
        });
        refetchPlan();
      } else {
        toast({ title: "Error", description: "Failed to create meeting", variant: "destructive" });
      }
    }
  };

  const handleSaveDraft = async () => {
    try {
      const meeting = await createMeeting.mutateAsync({
        userId: user.id,
        title,
        date: new Date(date),
        rawNotes: notes,
        parseState: 'draft',
        workspaceId: null,
      });
      await saveAttendees(meeting.id);
      toast({ title: "Saved draft", description: "Meeting saved without extraction." });
      setLocation("/meetings");
    } catch (error) {
      toast({ title: "Error", description: "Failed to save meeting", variant: "destructive" });
    }
  };

  const hasDetails = attendees || time || location;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setOcrError("Unsupported format. Use JPG or PNG.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError("Image too large. Please use a smaller photo (max 10MB).");
      return;
    }

    await runOcr(file);
  };

  const runOcr = async (file: File) => {
    setOcrLoading(true);
    setOcrError(null);
    setOcrResult(null);
    setOcrProgress(0);

    const progressInterval = setInterval(() => {
      setOcrProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/ocr?userId=${user.id}`, {
        method: "POST",
        body: formData,
      });

      setOcrProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "OCR failed");
      }

      const result = await response.json();
      setOcrResult(result);
      setShowOcrPreview(true);
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : "OCR failed. Try again or type notes manually.");
    } finally {
      clearInterval(progressInterval);
      setOcrProgress(0);
      setOcrLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleInsertOcrText = () => {
    if (!ocrResult?.text) return;
    
    if (insertMode === "replace") {
      setNotes(ocrResult.text);
    } else {
      setNotes(prev => prev ? `${prev}\n\n${ocrResult.text}` : ocrResult.text);
    }
    
    setShowOcrPreview(false);
    setOcrResult(null);
    toast({ title: "Text inserted", description: "Handwritten notes added to meeting notes." });
  };

  const handleCopyOcrText = async () => {
    if (!ocrResult?.text) return;
    await navigator.clipboard.writeText(ocrResult.text);
    toast({ title: "Copied", description: "Text copied to clipboard." });
  };

  const handleDiscardOcr = () => {
    setShowOcrPreview(false);
    setOcrResult(null);
    setOcrError(null);
  };

  const handleTakePhoto = async () => {
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await CapCamera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      if (!photo.base64String) {
        toast({ title: "Camera error", description: "No photo captured", variant: "destructive" });
        return;
      }
      const base64Response = await fetch(`data:image/jpeg;base64,${photo.base64String}`);
      const blob = await base64Response.blob();
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
      await runOcr(file);
    } catch (error: any) {
      console.error('Camera error:', error);
      if (error?.message?.includes('cancelled')) {
        return;
      }
      toast({ title: "Camera error", description: "Failed to take photo. Please try uploading instead.", variant: "destructive" });
    }
  };

  const runTranscription = async (file: File) => {
    setTranscriptionLoading(true);
    setTranscriptionError(null);
    setTranscriptionProgress(0);

    const progressInterval = setInterval(() => {
      setTranscriptionProgress(prev => Math.min(prev + 8, 90));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch(`/api/transcribe?userId=${user.id}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }

      const result = await response.json();
      setTranscriptionProgress(100);
      
      if (result.text && result.text !== '[No speech detected]') {
        setTranscriptionResult(result);
        setShowTranscriptionPreview(true);
      } else {
        setTranscriptionError('No speech detected in the audio. Try a clearer recording.');
      }
    } catch (error) {
      setTranscriptionError(error instanceof Error ? error.message : 'Transcription failed. Try again.');
    } finally {
      clearInterval(progressInterval);
      setTranscriptionProgress(0);
      setTranscriptionLoading(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleAudioFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!canTranscribe) {
      setTranscriptionError('Monthly transcription limit reached. Upgrade to Pro for more minutes.');
      return;
    }

    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('audio/')) {
      setTranscriptionError('Unsupported format. Use MP3, WAV, M4A, or WebM.');
      return;
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setTranscriptionError('File too large. Maximum size is 25MB.');
      return;
    }

    await runTranscription(file);
    refetchPlan();
  };

  const handleInsertTranscription = () => {
    if (!transcriptionResult?.text) return;
    
    if (transcriptionInsertMode === 'replace') {
      setNotes(transcriptionResult.text);
    } else {
      setNotes(prev => prev ? `${prev}\n\n${transcriptionResult.text}` : transcriptionResult.text);
    }
    
    setShowTranscriptionPreview(false);
    setTranscriptionResult(null);
    toast({ title: 'Transcription inserted', description: 'Audio transcription added to meeting notes.' });
  };

  const handleCopyTranscription = async () => {
    if (!transcriptionResult?.text) return;
    await navigator.clipboard.writeText(transcriptionResult.text);
    toast({ title: 'Copied', description: 'Transcription copied to clipboard.' });
  };

  const handleDiscardTranscription = () => {
    setShowTranscriptionPreview(false);
    setTranscriptionResult(null);
    setTranscriptionError(null);
  };

  const isLoading = ocrLoading || transcriptionLoading;

  return (
    <div ref={containerRef} className="flex flex-col h-[calc(100vh-4rem)] md:h-screen overflow-y-auto">
      <div 
        ref={headerRef}
        className={cn(
          "sticky top-0 z-40 transition-all duration-300 px-4 py-3",
          isHeaderSticky ? "glass-panel border-b border-border" : "bg-transparent"
        )}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/meetings")} 
              className="rounded-full h-10 w-10 shrink-0" 
              data-testid="button-back"
              aria-label="Go back to meetings"
            >
              <ArrowLeft className="h-5 w-5" weight="bold" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-black text-gradient-light">Capture</h1>
          </div>

          <div className="flex gap-3">
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="flex-1 bg-muted border-border rounded-xl h-11 text-base px-4 text-foreground placeholder:text-muted-foreground focus:bg-accent focus:border-ring"
              placeholder="Meeting title..."
              data-testid="input-title"
            />
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-36 bg-muted border-border rounded-xl h-11 text-base px-3 text-foreground focus:bg-accent focus:border-ring"
              data-testid="input-date"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 pb-32">
        <div className="max-w-3xl mx-auto space-y-4">
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <button 
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-toggle-details"
              >
                {detailsOpen ? <CaretUp className="h-3.5 w-3.5" weight="bold" /> : <CaretDown className="h-3.5 w-3.5" weight="bold" />}
                {hasDetails ? (
                  <span className="text-primary">Details added</span>
                ) : (
                  <span>Add attendees, time, location</span>
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="glass-panel rounded-xl p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" weight="duotone" />
                    Attendees (comma separated)
                  </Label>
                  <Input 
                    placeholder="Alice, Bob, Charlie..." 
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    className="bg-muted border-border rounded-xl h-10 text-sm px-3 text-foreground placeholder:text-muted-foreground focus:bg-accent"
                    data-testid="input-attendees"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" weight="duotone" />
                      Time
                    </Label>
                    <Input 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-muted border-border rounded-xl h-10 text-sm px-3 text-foreground focus:bg-accent"
                      data-testid="input-time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" weight="duotone" />
                      Location
                    </Label>
                    <Input 
                      placeholder="Room / Link"
                      value={location}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="bg-muted border-border rounded-xl h-10 text-sm px-3 text-foreground placeholder:text-muted-foreground focus:bg-accent"
                      data-testid="input-location"
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="input-ocr-file"
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioFileSelect}
            className="hidden"
            data-testid="input-audio-file"
          />

          <div 
            className={cn(
              "flex items-center gap-2 transition-all duration-200",
              isKeyboardVisible && isTextareaFocused 
                ? "fixed left-0 right-0 z-50 px-4 py-2 glass-panel border-t border-border" 
                : ""
            )}
            style={isKeyboardVisible && isTextareaFocused ? { bottom: keyboardHeight } : {}}
          >
            <span className="text-xs text-muted-foreground">Import:</span>

            {isCapacitorAvailable && (
              <button
                onClick={handleTakePhoto}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-primary hover:text-primary hover:bg-accent transition-all disabled:opacity-50"
                data-testid="button-take-photo"
                title="Take photo of handwritten notes"
              >
                <Camera className="h-4 w-4" weight="duotone" />
                Camera
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-primary hover:text-primary hover:bg-accent transition-all disabled:opacity-50"
              data-testid="button-upload-photo"
              title="Upload photo of handwritten notes"
            >
              <Upload className="h-4 w-4" weight="duotone" />
              Photo
            </button>

            <button
              onClick={() => audioInputRef.current?.click()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-primary hover:text-primary hover:bg-accent transition-all disabled:opacity-50"
              data-testid="button-upload-audio"
              title="Upload audio recording"
            >
              <Microphone className="h-4 w-4" weight="duotone" />
              Audio
            </button>

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
                <span>{ocrLoading ? 'Reading...' : 'Transcribing...'}</span>
              </div>
            )}
          </div>

          {(ocrLoading || transcriptionLoading) && (
            <Progress value={ocrLoading ? ocrProgress : transcriptionProgress} className="h-1" />
          )}

          {(ocrError || transcriptionError) && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              <WarningCircle className="h-4 w-4 shrink-0 mt-0.5" weight="duotone" />
              <div>
                <p>{ocrError || transcriptionError}</p>
                <button 
                  onClick={() => { setOcrError(null); setTranscriptionError(null); }}
                  className="text-xs text-red-300 hover:underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="relative">
            <div 
              className="absolute inset-0 p-4 pointer-events-none overflow-hidden rounded-2xl"
              style={{ lineHeight: '1.75' }}
              aria-hidden="true"
            >
              <pre className="whitespace-pre-wrap break-words text-base font-sans text-transparent m-0">
                {notes.split('\n').map((line, index) => {
                  const isActionLine = /^\s*(Action|TODO|Task):\s*/i.test(line);
                  return (
                    <span key={index}>
                      {isActionLine ? (
                        <span className="bg-amber-400/20 rounded px-1 -mx-1">{line}</span>
                      ) : (
                        line
                      )}
                      {index < notes.split('\n').length - 1 ? '\n' : ''}
                    </span>
                  );
                })}
              </pre>
            </div>
            
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Type or paste your meeting notes here...

• What was discussed?
• What decisions were made?
• What are the next steps?
• Who is responsible for what?

Tip: Lines starting with 'Action:', 'TODO:', or 'Task:' will be highlighted!"
              className="w-full min-h-[300px] p-4 bg-muted border border-border rounded-2xl text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-ring focus:bg-accent transition-all relative"
              style={{ lineHeight: '1.75', background: 'transparent' }}
              data-testid="input-notes"
              onFocus={() => setIsTextareaFocused(true)}
              onBlur={() => setIsTextareaFocused(false)}
            />
          </div>

          {hasDetectedActions && (
            <button
              onClick={() => {
                setSelectedActions(new Set(detectedActions.map((_, i) => i)));
                setShowReviewActions(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition-all w-full justify-center"
              data-testid="button-review-actions"
            >
              <ListChecks className="h-5 w-5" weight="duotone" />
              <span className="font-medium">Review {detectedActions.length} Detected Action{detectedActions.length !== 1 ? 's' : ''}</span>
            </button>
          )}
        </div>
      </div>

      <div 
        className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 glass-panel border-t border-border px-4 py-3"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
      >
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSubmitting || !notes.trim()}
            className="flex-1 h-12 rounded-xl"
            data-testid="button-save-draft"
          >
            <FloppyDisk className="h-5 w-5 mr-2" weight="duotone" />
            Save Draft
          </Button>
          
          <Button
            onClick={handleExtract}
            disabled={isSubmitting || !notes.trim() || !aiEnabled}
            className="flex-[2] h-12 rounded-xl btn-gradient"
            data-testid="button-extract"
          >
            {isSubmitting ? (
              <ArrowsClockwise className="h-5 w-5 mr-2 animate-spin" weight="bold" />
            ) : (
              <Sparkle className="h-5 w-5 mr-2" weight="duotone" />
            )}
            {aiEnabled ? "Extract Actions" : "AI Disabled"}
          </Button>
        </div>
      </div>

      <Dialog open={showOcrPreview} onOpenChange={setShowOcrPreview}>
        <DialogContent className="glass-panel border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Extracted Text</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review the text extracted from your handwritten notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto p-3 bg-muted rounded-xl border border-border text-sm text-foreground whitespace-pre-wrap">
              {ocrResult?.text}
            </div>
            
            {ocrResult?.confidence && (
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round(ocrResult.confidence)}%
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setInsertMode("append")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                  insertMode === "append" 
                    ? "bg-accent text-primary border border-primary" 
                    : "text-muted-foreground border border-border"
                )}
              >
                Append to notes
              </button>
              <button
                onClick={() => setInsertMode("replace")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                  insertMode === "replace" 
                    ? "bg-accent text-primary border border-primary" 
                    : "text-muted-foreground border border-border"
                )}
              >
                Replace notes
              </button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleDiscardOcr} className="flex-1">
                <X className="h-4 w-4 mr-2" weight="bold" />
                Discard
              </Button>
              <Button variant="ghost" onClick={handleCopyOcrText} className="flex-1">
                <Copy className="h-4 w-4 mr-2" weight="duotone" />
                Copy
              </Button>
              <Button onClick={handleInsertOcrText} className="flex-1 btn-gradient">
                <Check className="h-4 w-4 mr-2" weight="bold" />
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTranscriptionPreview} onOpenChange={setShowTranscriptionPreview}>
        <DialogContent className="glass-panel border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Transcribed Audio</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Review the transcription from your audio recording
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto p-3 bg-muted rounded-xl border border-border text-sm text-foreground whitespace-pre-wrap">
              {transcriptionResult?.text}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTranscriptionInsertMode("append")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                  transcriptionInsertMode === "append" 
                    ? "bg-accent text-primary border border-primary" 
                    : "text-muted-foreground border border-border"
                )}
              >
                Append to notes
              </button>
              <button
                onClick={() => setTranscriptionInsertMode("replace")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                  transcriptionInsertMode === "replace" 
                    ? "bg-accent text-primary border border-primary" 
                    : "text-muted-foreground border border-border"
                )}
              >
                Replace notes
              </button>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleDiscardTranscription} className="flex-1">
                <X className="h-4 w-4 mr-2" weight="bold" />
                Discard
              </Button>
              <Button variant="ghost" onClick={handleCopyTranscription} className="flex-1">
                <Copy className="h-4 w-4 mr-2" weight="duotone" />
                Copy
              </Button>
              <Button onClick={handleInsertTranscription} className="flex-1 btn-gradient">
                <Check className="h-4 w-4 mr-2" weight="bold" />
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewActions} onOpenChange={setShowReviewActions}>
        <DialogContent className="glass-panel border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-amber-400" weight="duotone" />
              Review Detected Actions
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select the actions you want to add to your Reminders list
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {detectedActions.map((action, index) => (
                <div 
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                    selectedActions.has(index)
                      ? "bg-amber-500/20 border-amber-500/30"
                      : "bg-muted border-border hover:bg-accent"
                  )}
                  onClick={() => {
                    const newSelected = new Set(selectedActions);
                    if (newSelected.has(index)) {
                      newSelected.delete(index);
                    } else {
                      newSelected.add(index);
                    }
                    setSelectedActions(newSelected);
                  }}
                >
                  <Checkbox
                    checked={selectedActions.has(index)}
                    onCheckedChange={(checked) => {
                      const newSelected = new Set(selectedActions);
                      if (checked) {
                        newSelected.add(index);
                      } else {
                        newSelected.delete(index);
                      }
                      setSelectedActions(newSelected);
                    }}
                    className="mt-0.5 border-amber-400/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        action.keyword === 'Action' && "bg-accent text-primary",
                        action.keyword === 'TODO' && "bg-sky-500/20 text-sky-300",
                        action.keyword === 'Task' && "bg-emerald-500/20 text-emerald-300"
                      )}>
                        {action.keyword}
                      </span>
                      <span className="text-xs text-muted-foreground">Line {action.lineNumber}</span>
                    </div>
                    <p className="text-sm text-foreground">{action.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                onClick={() => setSelectedActions(new Set(detectedActions.map((_, i) => i)))}
                className="hover:text-foreground transition-colors"
              >
                Select all
              </button>
              <span>{selectedActions.size} of {detectedActions.length} selected</span>
              <button
                onClick={() => setSelectedActions(new Set())}
                className="hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setShowReviewActions(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (selectedActions.size === 0) {
                    toast({ title: "No actions selected", variant: "destructive" });
                    return;
                  }
                  
                  setIsAddingToReminders(true);
                  
                  try {
                    const actionsToAdd = detectedActions.filter((_, i) => selectedActions.has(i));
                    
                    for (const action of actionsToAdd) {
                      await fetch('/api/reminders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          userId: user.id,
                          text: action.text,
                          bucket: 'today',
                          priority: 'normal',
                        }),
                      });
                    }
                    
                    toast({ 
                      title: `Added ${actionsToAdd.length} action${actionsToAdd.length !== 1 ? 's' : ''} to Reminders`,
                      description: "Check your Reminders to see them"
                    });
                    setShowReviewActions(false);
                    setSelectedActions(new Set());
                  } catch (error) {
                    toast({ title: "Failed to add actions", variant: "destructive" });
                  } finally {
                    setIsAddingToReminders(false);
                  }
                }}
                disabled={selectedActions.size === 0 || isAddingToReminders}
                className="flex-1 btn-gradient"
                data-testid="button-add-to-reminders"
              >
                {isAddingToReminders ? (
                  <ArrowsClockwise className="h-4 w-4 mr-2 animate-spin" weight="bold" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" weight="bold" />
                )}
                Add to Reminders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
