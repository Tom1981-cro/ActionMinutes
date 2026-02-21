import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { openSettingsModal } from "@/pages/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkle, FloppyDisk, ArrowLeft, CaretDown, CaretUp, 
  Users, Clock, MapPin, Camera, Upload, Microphone, 
  ArrowsClockwise, Copy, X, Check, User, Buildings, WarningCircle,
  ListChecks, Plus, Lightning, Record, Pause, Stop, Circle, CalendarBlank,
  CheckCircle
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
import { authenticatedFetch } from "@/hooks/use-auth";

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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);

  const queryClient = useQueryClient();
  const { data: emptyMeetings = [] } = useQuery<{ id: string; title: string; date: string; location?: string }[]>({
    queryKey: ["empty-meetings"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/meetings/empty");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user.id,
  });

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

  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingAutoTranscribing, setRecordingAutoTranscribing] = useState(false);
  const [recordingTranscribeProgress, setRecordingTranscribeProgress] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      openSettingsModal("premium");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let meeting;
      if (selectedMeetingId) {
        const res = await authenticatedFetch(`/api/meetings/${selectedMeetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            rawNotes: notes,
            date: new Date(date).toISOString(),
            startTime: time || null,
            location: location || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update meeting");
        meeting = await res.json();
      } else {
        meeting = await createMeeting.mutateAsync({
          userId: user.id,
          title,
          date: new Date(date),
          rawNotes: notes,
          parseState: 'draft',
        });
      }
      
      await saveAttendees(meeting.id);
      await extractMeeting.mutateAsync(meeting.id);
      
      toast({ title: "Processing...", description: "AI is extracting actions." });
      refetchPlan();
      queryClient.invalidateQueries({ queryKey: ["empty-meetings"] });
      
      setTimeout(() => {
        setIsSubmitting(false);
        setLocation(`/app/meeting/${meeting.id}`);
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
      let meeting;
      if (selectedMeetingId) {
        const res = await authenticatedFetch(`/api/meetings/${selectedMeetingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            rawNotes: notes,
            date: new Date(date).toISOString(),
            startTime: time || null,
            location: location || null,
          }),
        });
        if (!res.ok) throw new Error("Failed to update meeting");
        meeting = await res.json();
      } else {
        meeting = await createMeeting.mutateAsync({
          userId: user.id,
          title,
          date: new Date(date),
          rawNotes: notes,
          parseState: 'draft',
        });
      }
      await saveAttendees(meeting.id);
      queryClient.invalidateQueries({ queryKey: ["empty-meetings"] });
      toast({ title: "Saved draft", description: "Meeting saved without extraction." });
      setLocation("/app/meetings");
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

      const response = await fetch(`/api/transcribe?userId=${user.id}&save=true&title=${encodeURIComponent(title || `Transcript ${new Date().toLocaleString()}`)}`, {
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

  const checkRecordingConsent = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/user');
      if (res.ok) {
        const userData = await res.json();
        return !!userData.recordingConsentAt;
      }
      return false;
    } catch {
      return false;
    }
  };

  const saveRecordingConsent = async () => {
    try {
      await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingConsentAt: new Date().toISOString() }),
      });
      setHasConsent(true);
    } catch {
      toast({ title: "Error", description: "Failed to save consent.", variant: "destructive" });
    }
  };

  const handleRecordMeetingClick = async () => {
    if (!canTranscribe) {
      toast({ 
        title: "Transcription limit reached", 
        description: "Upgrade to Pro for more transcription minutes.", 
        variant: "destructive" 
      });
      return;
    }

    if (hasConsent) {
      setShowRecordingModal(true);
      return;
    }

    const consentGiven = await checkRecordingConsent();
    if (!consentGiven) {
      setShowConsentDialog(true);
    } else {
      setHasConsent(true);
      setShowRecordingModal(true);
    }
  };

  const handleConsentAccept = async () => {
    await saveRecordingConsent();
    setShowConsentDialog(false);
    setShowRecordingModal(true);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getSupportedMimeType = () => {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const getFileExtension = (mimeType: string) => {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('mpeg')) return 'mp3';
    return 'webm';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        stream.getTracks().forEach(t => t.stop());
        toast({ title: "Recording not supported", description: "Your browser doesn't support audio recording.", variant: "destructive" });
        return;
      }

      const currentUserId = user?.id;
      if (!currentUserId) {
        stream.getTracks().forEach(t => t.stop());
        toast({ title: "Not signed in", description: "Please sign in to record meetings.", variant: "destructive" });
        return;
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const baseMime = mimeType.split(';')[0];
        const ext = getFileExtension(baseMime);
        const blob = new Blob(chunksRef.current, { type: baseMime });
        if (blob.size < 1000) {
          toast({ title: "Recording too short", description: "Please record for longer.", variant: "destructive" });
          setRecordingState('idle');
          setRecordingTime(0);
          return;
        }

        const file = new File([blob], `recording-${Date.now()}.${ext}`, { type: baseMime });
        setRecordingAutoTranscribing(true);
        setRecordingTranscribeProgress(0);

        const progressInterval = setInterval(() => {
          setRecordingTranscribeProgress(prev => Math.min(prev + 6, 90));
        }, 500);

        try {
          const formData = new FormData();
          formData.append('audio', file);

          const response = await fetch(
            `/api/transcribe?userId=${currentUserId}&save=true&title=${encodeURIComponent(title || `Recording ${new Date().toLocaleString()}`)}`,
            { method: 'POST', body: formData }
          );

          if (!response.ok) {
            let errorMsg = 'Transcription failed';
            try {
              const errorData = await response.json();
              errorMsg = errorData.error || errorMsg;
            } catch {}
            throw new Error(errorMsg);
          }

          const result = await response.json();
          setRecordingTranscribeProgress(100);

          if (result.text && result.text !== '[No speech detected]') {
            setNotes(prev => prev ? `${prev}\n\n${result.text}` : result.text);
            toast({ title: "Recording transcribed", description: "Audio has been transcribed and added to your notes." });
          } else {
            toast({ title: "No speech detected", description: "The recording didn't contain detectable speech.", variant: "destructive" });
          }
        } catch (error) {
          console.error('[Recording transcription error]', error);
          toast({
            title: "Transcription failed",
            description: error instanceof Error ? error.message : "Failed to transcribe recording.",
            variant: "destructive"
          });
        } finally {
          clearInterval(progressInterval);
          setRecordingAutoTranscribing(false);
          setRecordingTranscribeProgress(0);
          setRecordingState('idle');
          setRecordingTime(0);
          setShowRecordingModal(false);
          refetchPlan();
        }
      };

      mediaRecorder.start(1000);
      setRecordingState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        toast({ title: "Microphone access denied", description: "Please allow microphone access in your browser settings.", variant: "destructive" });
      } else {
        console.error('[Recording start error]', error);
        toast({ title: "Recording failed", description: "Could not start recording. Check your microphone.", variant: "destructive" });
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
    setRecordingState('idle');
    setRecordingTime(0);
    setShowRecordingModal(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const isLoading = ocrLoading || transcriptionLoading || recordingAutoTranscribing;

  const formattedDisplayDate = (() => {
    try {
      const d = new Date(date);
      return format(d, "dd/MM/yyyy");
    } catch {
      return date;
    }
  })();

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Capture</h1>
        <p className="text-sm text-gray-500 mt-1">Record meetings and auto-extract actions.</p>
      </div>

      {/* Empty meeting selector */}
      {emptyMeetings.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select 
            value={selectedMeetingId || "new"} 
            onValueChange={(val) => {
              if (val === "new") {
                setSelectedMeetingId(null);
                setTitle(`Meeting — ${format(new Date(), "MMM d")}`);
                setDate(format(new Date(), "yyyy-MM-dd"));
                setNotes("");
                setAttendees("");
                setTime("");
                setLocationValue("");
              } else {
                const meeting = emptyMeetings.find(m => m.id === val);
                if (meeting) {
                  setSelectedMeetingId(meeting.id);
                  setTitle(meeting.title);
                  setDate(format(new Date(meeting.date), "yyyy-MM-dd"));
                  if (meeting.location) setLocationValue(meeting.location);
                }
              }
            }}
          >
            <SelectTrigger className="bg-gray-50 border-gray-200 rounded-xl h-9 text-xs" data-testid="select-existing-meeting">
              <SelectValue placeholder="New meeting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <span className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" weight="bold" />
                  New meeting
                </span>
              </SelectItem>
              {emptyMeetings.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    <CalendarBlank className="h-3.5 w-3.5 text-violet-500" weight="duotone" />
                    {m.title}
                    <span className="text-gray-400 text-xs">
                      ({format(new Date(m.date), "MMM d")})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hidden file inputs */}
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

      {/* Two-panel layout */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* LEFT: Notepad Card */}
        <div className="flex-1 min-w-0">
          <div className="bg-amber-50/70 rounded-3xl border-2 border-dashed border-amber-300/60 p-6 flex flex-col h-full">
            {/* Title row */}
            <div className="flex items-start justify-between mb-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xl font-bold text-gray-900 bg-transparent border-0 outline-none flex-1 mr-3 placeholder:text-gray-400"
                placeholder="Meeting title..."
                data-testid="input-title"
              />
              <span className="text-xs font-semibold text-amber-700 bg-amber-200/60 px-3 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                {formattedDisplayDate}
              </span>
            </div>

            {/* Details toggle */}
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button 
                  className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors mb-3"
                  data-testid="button-toggle-details"
                >
                  {hasDetails ? (
                    <span className="underline">Details added</span>
                  ) : (
                    <span className="underline">Add attendees, time, location...</span>
                  )}
                  {detailsOpen ? <CaretUp className="h-3 w-3" weight="bold" /> : <CaretDown className="h-3 w-3" weight="bold" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pb-3 space-y-3">
                <div className="bg-white/60 rounded-2xl p-4 space-y-3 border border-amber-200/40">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" weight="duotone" />
                      Attendees (comma separated)
                    </Label>
                    <Input 
                      placeholder="Alice, Bob, Charlie..." 
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      className="bg-white border-gray-200 rounded-xl h-10 text-sm"
                      data-testid="input-attendees"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" weight="duotone" />
                        Time
                      </Label>
                      <Input 
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="bg-white border-gray-200 rounded-xl h-10 text-sm"
                        data-testid="input-time"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" weight="duotone" />
                        Location
                      </Label>
                      <Input 
                        placeholder="Room / Link"
                        value={location}
                        onChange={(e) => setLocationValue(e.target.value)}
                        className="bg-white border-gray-200 rounded-xl h-10 text-sm"
                        data-testid="input-location"
                      />
                    </div>
                  </div>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="bg-white border-gray-200 rounded-xl h-10 text-sm"
                    data-testid="input-date"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                onClick={handleRecordMeetingClick}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-50"
                data-testid="button-record-meeting"
              >
                <Record className="h-4 w-4" weight="fill" />
                Record Meeting
              </button>

              {isCapacitorAvailable && (
                <button
                  onClick={handleTakePhoto}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                  data-testid="button-take-photo"
                >
                  <Camera className="h-4 w-4" weight="duotone" />
                  Camera
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                data-testid="button-upload-photo"
              >
                <Upload className="h-4 w-4" weight="duotone" />
                Upload Photo
              </button>

              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                data-testid="button-upload-audio"
              >
                <Microphone className="h-4 w-4" weight="duotone" />
                Upload Audio
              </button>

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-violet-600 font-medium">
                  <ArrowsClockwise className="h-4 w-4 animate-spin" weight="bold" />
                  <span>{ocrLoading ? 'Reading...' : recordingAutoTranscribing ? 'Transcribing recording...' : 'Transcribing...'}</span>
                </div>
              )}
            </div>

            {(ocrLoading || transcriptionLoading) && (
              <Progress value={ocrLoading ? ocrProgress : transcriptionProgress} className="h-1 mb-3" />
            )}

            {(ocrError || transcriptionError) && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 mb-3">
                <WarningCircle className="h-4 w-4 shrink-0 mt-0.5" weight="duotone" />
                <div>
                  <p>{ocrError || transcriptionError}</p>
                  <button 
                    onClick={() => { setOcrError(null); setTranscriptionError(null); }}
                    className="text-xs text-red-400 hover:underline mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Notes textarea */}
            <div className="relative flex-1">
              <div 
                className="absolute inset-0 p-0 pointer-events-none overflow-hidden"
                style={{ lineHeight: '1.75' }}
                aria-hidden="true"
              >
                <pre className="whitespace-pre-wrap break-words text-base font-sans text-transparent m-0">
                  {notes.split('\n').map((line, index) => {
                    const isActionLine = /^\s*(Action|TODO|Task):\s*/i.test(line);
                    return (
                      <span key={index}>
                        {isActionLine ? (
                          <span className="bg-violet-200/50 rounded px-1 -mx-1">{line}</span>
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
                placeholder={`# ${title}

Type or paste your meeting notes here...

What was discussed?
What decisions were made?
What are the next steps?

Tip: Lines starting with 'Action:', 'TODO:', or 'Task:' will be auto-detected!`}
                className="w-full min-h-[300px] p-0 bg-transparent border-0 text-base text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none transition-all relative"
                style={{ lineHeight: '1.75', background: 'transparent' }}
                data-testid="input-notes"
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
              />
            </div>

            {/* Bottom action buttons */}
            <div className="flex gap-3 mt-4 pt-4 border-t border-amber-200/40">
              <button
                onClick={handleSaveDraft}
                disabled={isSubmitting || !notes.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-40"
                data-testid="button-save-draft"
              >
                <FloppyDisk className="h-4 w-4" weight="duotone" />
                Save Draft
              </button>
              
              <button
                onClick={handleExtract}
                disabled={isSubmitting || !notes.trim() || !aiEnabled}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-violet-500 text-white hover:bg-violet-600 transition-colors disabled:opacity-40"
                data-testid="button-extract"
              >
                {isSubmitting ? (
                  <ArrowsClockwise className="h-5 w-5 animate-spin" weight="bold" />
                ) : (
                  <Sparkle className="h-5 w-5" weight="duotone" />
                )}
                {aiEnabled ? "Extract Actions" : "AI Disabled"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Extracted Actions Panel */}
        <div className="lg:w-80 xl:w-96 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-violet-500" weight="duotone" />
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Extracted Actions</span>
              </div>
              {hasDetectedActions && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                  {detectedActions.length} Found
                </span>
              )}
            </div>

            {/* Action cards */}
            <div className="flex-1 space-y-3 overflow-y-auto min-h-0 mb-5">
              {!hasDetectedActions ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                    <ListChecks className="h-7 w-7 text-gray-300" weight="duotone" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">No actions detected yet</p>
                  <p className="text-xs text-gray-300 mt-1 max-w-[200px]">
                    Start typing notes with "Action:", "TODO:", or "Task:" prefixes
                  </p>
                </div>
              ) : (
                detectedActions.map((action, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-2xl p-4 border border-gray-100"
                    data-testid={`extracted-action-${index}`}
                  >
                    <p className="text-sm text-gray-800 font-medium leading-relaxed">{action.text}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded">
                      30m allocated
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Import Actions button */}
            {hasDetectedActions && (
              <button
                onClick={() => {
                  setSelectedActions(new Set(detectedActions.map((_, i) => i)));
                  setShowReviewActions(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-lg shadow-violet-200"
                data-testid="button-review-actions"
              >
                <CheckCircle className="h-5 w-5" weight="fill" />
                Import Actions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* All Dialogs (preserved exactly) */}
      <Dialog open={showOcrPreview} onOpenChange={setShowOcrPreview}>
        <DialogContent className="border-border text-foreground max-w-lg">
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
              <Button onClick={handleInsertOcrText} className="flex-1">
                <Check className="h-4 w-4 mr-2" weight="bold" />
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTranscriptionPreview} onOpenChange={setShowTranscriptionPreview}>
        <DialogContent className="border-border text-foreground max-w-lg">
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
              <Button onClick={handleInsertTranscription} className="flex-1">
                <Check className="h-4 w-4 mr-2" weight="bold" />
                Insert
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <WarningCircle className="h-5 w-5 text-violet-400" weight="duotone" />
              Recording Consent Required
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please review and accept the following before recording
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-xl p-4 text-sm text-foreground space-y-3 max-h-64 overflow-y-auto border border-border">
              <p className="font-semibold">Recording Consent & Legal Disclaimer</p>
              <p>By proceeding, you acknowledge and agree to the following:</p>
              <ul className="list-disc list-outside ml-5 space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">Consent Requirement:</strong> You confirm that all participants in this meeting have been informed of and have consented to being recorded, in accordance with applicable laws and regulations.</li>
                <li><strong className="text-foreground">GDPR Compliance:</strong> Under the General Data Protection Regulation (GDPR), recording conversations requires a lawful basis. You are responsible for ensuring that all necessary consents have been obtained from participants prior to recording.</li>
                <li><strong className="text-foreground">Data Processing:</strong> Audio recordings will be processed by AI services for transcription purposes. The transcribed text will be stored in your account. Audio files are processed temporarily and not stored permanently.</li>
                <li><strong className="text-foreground">Two-Party/All-Party Consent:</strong> Some jurisdictions require all parties to consent to being recorded. It is your responsibility to comply with the recording consent laws applicable in your jurisdiction.</li>
                <li><strong className="text-foreground">Purpose Limitation:</strong> Recordings should only be used for the stated purpose of meeting documentation and should not be shared without the consent of all recorded parties.</li>
                <li><strong className="text-foreground">Data Retention:</strong> You are responsible for managing the retention and deletion of transcribed meeting data in accordance with your organization's data policies.</li>
              </ul>
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">This consent will be recorded in your account settings with a timestamp. You will not be asked again for future recordings.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConsentDialog(false)} className="flex-1" data-testid="button-consent-decline">
                Decline
              </Button>
              <Button onClick={handleConsentAccept} className="flex-1" data-testid="button-consent-accept">
                <Check className="h-4 w-4 mr-2" weight="bold" />
                I Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRecordingModal} onOpenChange={(open) => {
        if (!open && recordingState === 'idle' && !recordingAutoTranscribing) {
          setShowRecordingModal(false);
        }
      }}>
        <DialogContent className="border-border text-foreground max-w-sm" onPointerDownOutside={(e) => {
          if (recordingState !== 'idle' || recordingAutoTranscribing) e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle className="text-foreground text-center">
              {recordingAutoTranscribing ? 'Transcribing...' : 'Record Meeting'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-center">
              {recordingAutoTranscribing 
                ? 'Your recording is being transcribed automatically'
                : recordingState === 'idle' 
                  ? 'Press the red button to start recording' 
                  : recordingState === 'paused' 
                    ? 'Recording paused' 
                    : 'Recording in progress...'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-4xl font-mono font-bold text-foreground tabular-nums" data-testid="text-recording-timer">
              {formatTime(recordingTime)}
            </div>

            {recordingAutoTranscribing ? (
              <div className="w-full space-y-2">
                <Progress value={recordingTranscribeProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">Processing audio...</p>
              </div>
            ) : (
              <>
                {recordingState === 'recording' && (
                  <div className="flex items-center gap-2 text-xs text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Recording
                  </div>
                )}

                <div className="flex items-center gap-4">
                  {recordingState === 'idle' ? (
                    <button
                      onClick={startRecording}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg hover:shadow-xl active:scale-95"
                      data-testid="button-start-recording"
                      aria-label="Start recording"
                    >
                      <Circle className="h-6 w-6 text-white" weight="fill" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={recordingState === 'paused' ? resumeRecording : pauseRecording}
                        className="w-14 h-14 rounded-full bg-muted hover:bg-accent border border-border flex items-center justify-center transition-all"
                        data-testid="button-pause-recording"
                        aria-label={recordingState === 'paused' ? 'Resume recording' : 'Pause recording'}
                      >
                        {recordingState === 'paused' ? (
                          <Record className="h-5 w-5 text-red-400" weight="fill" />
                        ) : (
                          <Pause className="h-5 w-5 text-muted-foreground" weight="fill" />
                        )}
                      </button>

                      <button
                        onClick={stopRecording}
                        className="w-16 h-16 rounded-full bg-foreground hover:bg-foreground/80 flex items-center justify-center transition-all shadow-lg active:scale-95"
                        data-testid="button-stop-recording"
                        aria-label="Stop recording"
                      >
                        <Stop className="h-6 w-6 text-background" weight="fill" />
                      </button>
                    </>
                  )}
                </div>
              </>
            )}

            {recordingState !== 'idle' && !recordingAutoTranscribing && (
              <button
                onClick={cancelRecording}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-cancel-recording"
              >
                Cancel recording
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewActions} onOpenChange={setShowReviewActions}>
        <DialogContent className="border-border text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-violet-400" weight="duotone" />
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
                      ? "bg-violet-50 border-violet-300"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
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
                    className="mt-0.5 border-violet-400/50 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        action.keyword === 'Action' && "bg-violet-100 text-violet-600",
                        action.keyword === 'TODO' && "bg-sky-100 text-sky-600",
                        action.keyword === 'Task' && "bg-emerald-100 text-emerald-600"
                      )}>
                        {action.keyword}
                      </span>
                      <span className="text-xs text-gray-400">Line {action.lineNumber}</span>
                    </div>
                    <p className="text-sm text-gray-800">{action.text}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <button
                onClick={() => setSelectedActions(new Set(detectedActions.map((_, i) => i)))}
                className="hover:text-gray-600 transition-colors"
              >
                Select all
              </button>
              <span>{selectedActions.size} of {detectedActions.length} selected</span>
              <button
                onClick={() => setSelectedActions(new Set())}
                className="hover:text-gray-600 transition-colors"
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
                className="flex-1"
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
