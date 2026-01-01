import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Save, ArrowLeft, ChevronDown, ChevronUp, Users, Clock, MapPin, AlertTriangle, Camera, Upload, RefreshCw, Copy, X, Check, FileText, User, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useCreateMeeting, useExtractMeeting, useAppConfig, useWorkspaces } from "@/lib/hooks";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CapturePage() {
  const [, setLocation] = useLocation();
  const { user, currentWorkspaceId } = useStore();
  const { toast } = useToast();
  const createMeeting = useCreateMeeting();
  const extractMeeting = useExtractMeeting();
  const { data: config } = useAppConfig();
  const { data: workspaces = [] } = useWorkspaces();

  const aiEnabled = config?.features?.aiEnabled !== false;

  const [title, setTitle] = useState(`Meeting — ${format(new Date(), "MMM d")}`);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocationValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scope, setScope] = useState<string>(currentWorkspaceId || "personal");

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<{ text: string; confidence?: number; warnings?: string[] } | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  const [insertMode, setInsertMode] = useState<"replace" | "append">("append");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: Capacitor camera - enable when Capacitor is added
  // import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
  const isCapacitorAvailable = false; // Set to true when Capacitor is integrated

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
    
    setIsSubmitting(true);
    
    try {
      const meeting = await createMeeting.mutateAsync({
        userId: user.id,
        title,
        date: new Date(date),
        rawNotes: notes,
        parseState: 'draft',
        workspaceId: scope === "personal" ? undefined : scope,
      });
      
      await saveAttendees(meeting.id);
      await extractMeeting.mutateAsync(meeting.id);
      
      toast({ title: "Processing...", description: "AI is extracting actions." });
      
      setTimeout(() => {
        setIsSubmitting(false);
        setLocation(`/meeting/${meeting.id}`);
      }, 500);
    } catch (error) {
      setIsSubmitting(false);
      toast({ title: "Error", description: "Failed to create meeting", variant: "destructive" });
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
        workspaceId: scope === "personal" ? undefined : scope,
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

    // Validate on client side first
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

    // Simulate progress for UX
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

  const handleRetryOcr = () => {
    fileInputRef.current?.click();
  };

  const handleDiscardOcr = () => {
    setShowOcrPreview(false);
    setOcrResult(null);
    setOcrError(null);
  };

  // TODO: Capacitor camera integration - uncomment when Capacitor is added
  // const handleTakePhoto = async () => {
  //   try {
  //     const photo = await Camera.getPhoto({
  //       quality: 90,
  //       resultType: CameraResultType.Base64,
  //       source: CameraSource.Camera,
  //     });
  //     // Convert base64 to file and run OCR
  //     const base64Response = await fetch(`data:image/jpeg;base64,${photo.base64String}`);
  //     const blob = await base64Response.blob();
  //     const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  //     await runOcr(file);
  //   } catch (error) {
  //     console.error('Camera error:', error);
  //     toast({ title: "Camera error", description: "Failed to take photo", variant: "destructive" });
  //   }
  // };

  return (
    <div className="flex flex-col h-full pb-safe">
      <div className="flex-1 overflow-y-auto pb-28 md:pb-6">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation("/meetings")} 
              className="rounded-full h-11 w-11 shrink-0" 
              data-testid="button-back"
              aria-label="Go back to meetings"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800">New Meeting</h1>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium text-slate-600">Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="bg-gray-50 border-gray-200 rounded-xl h-12 text-base px-4 focus:bg-white"
                placeholder="What's this meeting about?"
                data-testid="input-title"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium text-slate-600">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="bg-gray-50 border-gray-200 rounded-xl h-12 text-base px-4 focus:bg-white"
                data-testid="input-date"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-600">Save to</Label>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <Button
                  type="button"
                  variant={scope === "personal" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScope("personal")}
                  className={`flex-1 h-10 rounded-xl ${scope === "personal" ? 'bg-white shadow-sm text-slate-800' : 'text-gray-500'}`}
                  data-testid="scope-personal"
                >
                  <User className="h-4 w-4 mr-2" />
                  Personal
                </Button>
                {workspaces.length > 0 && (
                  <Select value={scope !== "personal" ? scope : ""} onValueChange={(val) => setScope(val)}>
                    <SelectTrigger 
                      className={`flex-1 h-10 rounded-xl border-0 ${scope !== "personal" ? 'bg-white shadow-sm text-slate-800' : 'bg-transparent text-gray-500'}`}
                      data-testid="scope-workspace"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((ws: any) => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <p className="text-xs text-gray-400">
                {scope === "personal" ? "Only you can see this meeting" : "Visible to workspace members"}
              </p>
            </div>

            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
              <CollapsibleTrigger asChild>
                <button 
                  className="flex items-center justify-between w-full py-2 text-sm text-gray-500 hover:text-slate-700 transition-colors"
                  data-testid="button-toggle-details"
                >
                  <span className="flex items-center gap-2">
                    {hasDetails ? (
                      <span className="text-indigo-600 font-medium">Details added</span>
                    ) : (
                      <>Add details (optional)</>
                    )}
                  </span>
                  {detailsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="attendees" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    Attendees
                  </Label>
                  <p className="text-xs text-gray-400">Separate attendees by comma</p>
                  <Input 
                    id="attendees" 
                    placeholder="Alice, Bob, Charlie..." 
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded-xl h-12 text-base px-4 focus:bg-white"
                    data-testid="input-attendees"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="time" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      Time
                    </Label>
                    <Input 
                      id="time" 
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-gray-50 border-gray-200 rounded-xl h-12 text-base px-4 focus:bg-white"
                      data-testid="input-time"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="location" className="text-sm font-medium text-slate-600 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      Location
                    </Label>
                    <Input 
                      id="location" 
                      placeholder="Room / Link"
                      value={location}
                      onChange={(e) => setLocationValue(e.target.value)}
                      className="bg-gray-50 border-gray-200 rounded-xl h-12 text-base px-4 focus:bg-white"
                      data-testid="input-location"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Handwritten Notes Import Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Import handwritten notes</h3>
                <p className="text-xs text-gray-500">Upload a photo of your notes</p>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-ocr-file"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
                className="flex-1 h-11 rounded-xl border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                data-testid="button-upload-photo"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload photo
              </Button>
              
              {isCapacitorAvailable && (
                <Button
                  variant="outline"
                  onClick={() => {/* TODO: handleTakePhoto() */}}
                  disabled={ocrLoading}
                  className="flex-1 h-11 rounded-xl border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                  data-testid="button-take-photo"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take photo
                </Button>
              )}
            </div>

            {ocrLoading && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-indigo-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Reading handwriting...</span>
                </div>
                <Progress value={ocrProgress} className="h-1.5" />
              </div>
            )}

            {ocrError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p>{ocrError}</p>
                  <p className="text-xs mt-1 text-red-600">Tip: Try brighter light, closer crop, or clearer handwriting.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <Label htmlFor="notes" className="text-base font-semibold text-slate-800">Meeting Notes</Label>
              <span className="text-xs text-gray-400">Paste or type everything</span>
            </div>
            <Textarea 
              id="notes" 
              placeholder="Paste your notes here...

• Action items
• Decisions made  
• Discussion points
• Follow-ups needed

Just dump everything—AI will sort it out." 
              className="min-h-[320px] md:min-h-[360px] font-mono text-base leading-relaxed bg-white p-4 resize-y border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="textarea-notes"
            />
          </div>

          {!aiEnabled && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>AI extraction is currently disabled. You can still save meetings as drafts.</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-3 pt-2">
            <Button 
              size="lg" 
              className="flex-1 text-base h-14 rounded-xl btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
              onClick={handleExtract}
              disabled={isSubmitting || !aiEnabled}
              data-testid="button-extract-desktop"
            >
              {isSubmitting ? (
                "Processing..."
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  {aiEnabled ? "Extract Actions" : "AI Disabled"}
                </>
              )}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={handleSaveDraft}
              className="h-14 rounded-xl border-indigo-200 hover:bg-indigo-50 text-indigo-700"
              data-testid="button-save-draft-desktop"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-4 pb-safe z-50">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button 
            variant="outline" 
            onClick={handleSaveDraft}
            className="h-12 px-4 rounded-xl border-indigo-200 hover:bg-indigo-50 text-indigo-700 shrink-0"
            data-testid="button-save-draft"
          >
            <Save className="h-5 w-5" />
          </Button>
          <Button 
            size="lg" 
            className="flex-1 text-base h-12 rounded-xl btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30 disabled:opacity-50" 
            onClick={handleExtract}
            disabled={isSubmitting || !notes.trim() || !aiEnabled}
            data-testid="button-extract"
          >
            {isSubmitting ? (
              "Processing..."
            ) : !aiEnabled ? (
              "AI Disabled"
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Extract Actions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* OCR Preview Dialog */}
      <Dialog open={showOcrPreview} onOpenChange={setShowOcrPreview}>
        <DialogContent className="max-w-lg mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Extracted Text
            </DialogTitle>
            <DialogDescription>
              Review the text extracted from your handwritten notes
            </DialogDescription>
          </DialogHeader>
          
          {ocrResult && (
            <div className="space-y-4">
              {/* Confidence indicator */}
              {ocrResult.confidence !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Confidence:</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        ocrResult.confidence >= 70 ? 'bg-green-500' : 
                        ocrResult.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${ocrResult.confidence}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${
                    ocrResult.confidence >= 70 ? 'text-green-600' : 
                    ocrResult.confidence >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {ocrResult.confidence}%
                  </span>
                </div>
              )}

              {/* Warnings */}
              {ocrResult.warnings && ocrResult.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                  {ocrResult.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              {/* Text preview */}
              <div className="max-h-64 overflow-y-auto p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
                  {ocrResult.text || "No text detected"}
                </pre>
              </div>

              {/* Insert mode toggle */}
              {notes.trim() && ocrResult.text && (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Insert mode:</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={insertMode === "append" ? "default" : "outline"}
                      onClick={() => setInsertMode("append")}
                      className="h-8 text-xs"
                      data-testid="button-insert-append"
                    >
                      Append
                    </Button>
                    <Button
                      size="sm"
                      variant={insertMode === "replace" ? "default" : "outline"}
                      onClick={() => setInsertMode("replace")}
                      className="h-8 text-xs"
                      data-testid="button-insert-replace"
                    >
                      Replace
                    </Button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleInsertOcrText}
                  disabled={!ocrResult.text}
                  className="flex-1 btn-gradient text-white font-semibold shadow-lg shadow-indigo-500/30"
                  data-testid="button-insert-ocr"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Insert into notes
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyOcrText}
                  disabled={!ocrResult.text}
                  data-testid="button-copy-ocr"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRetryOcr}
                  data-testid="button-retry-ocr"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleDiscardOcr}
                  className="text-gray-500"
                  data-testid="button-discard-ocr"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
