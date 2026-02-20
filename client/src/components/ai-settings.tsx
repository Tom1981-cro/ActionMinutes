import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  GearSix, Sparkle, Globe, TextAa, ListBullets, 
  Faders, FloppyDisk, ArrowCounterClockwise
} from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface AISettings {
  language: string;
  tone: "formal" | "informal" | "neutral";
  summaryLength: "brief" | "standard" | "detailed";
  extractionConfidenceThreshold: number;
  autoExtract: boolean;
  includeConfidenceScores: boolean;
}

const DEFAULT_SETTINGS: AISettings = {
  language: "en",
  tone: "neutral",
  summaryLength: "standard",
  extractionConfidenceThreshold: 0.6,
  autoExtract: false,
  includeConfidenceScores: true,
};

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
];

const TONES = [
  { value: "formal", label: "Formal", description: "Professional language for business contexts" },
  { value: "neutral", label: "Neutral", description: "Balanced tone for general use" },
  { value: "informal", label: "Informal", description: "Casual, conversational style" },
];

const SUMMARY_LENGTHS = [
  { value: "brief", label: "Brief", description: "1-2 sentences, key points only" },
  { value: "standard", label: "Standard", description: "3-4 sentences, balanced overview" },
  { value: "detailed", label: "Detailed", description: "5+ sentences, comprehensive summary" },
];

const STORAGE_KEY = "actionminutes-ai-settings";

export function getAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to parse AI settings", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAISettings(settings: AISettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save AI settings", e);
  }
}

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (settings: AISettings) => void;
}

export function AISettingsDialog({ open, onOpenChange, onSave }: AISettingsDialogProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AISettings>(() => getAISettings());

  useEffect(() => {
    if (open) {
      setSettings(getAISettings());
    }
  }, [open]);

  const handleSave = () => {
    saveAISettings(settings);
    onSave?.(settings);
    toast({ title: "AI settings saved" });
    onOpenChange(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Sparkle className="h-5 w-5 text-primary" weight="fill" />
            AI Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4 text-primary" weight="duotone" />
              Output Language
            </Label>
            <Select
              value={settings.language}
              onValueChange={(value) => setSettings({ ...settings, language: value })}
            >
              <SelectTrigger className="bg-muted border-border text-foreground" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Summaries and extracted items will be written in this language
            </p>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-foreground">
              <TextAa className="h-4 w-4 text-primary" weight="duotone" />
              Writing Tone
            </Label>
            <div className="grid gap-2">
              {TONES.map((tone) => (
                <button
                  key={tone.value}
                  onClick={() => setSettings({ ...settings, tone: tone.value as AISettings["tone"] })}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all",
                    settings.tone === tone.value
                      ? "bg-accent border-primary/50"
                      : "bg-muted border-border hover:bg-accent"
                  )}
                  data-testid={`button-tone-${tone.value}`}
                >
                  <p className="font-medium text-sm text-foreground">{tone.label}</p>
                  <p className="text-xs text-muted-foreground">{tone.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-foreground">
              <ListBullets className="h-4 w-4 text-primary" weight="duotone" />
              Summary Length
            </Label>
            <div className="grid gap-2">
              {SUMMARY_LENGTHS.map((length) => (
                <button
                  key={length.value}
                  onClick={() => setSettings({ ...settings, summaryLength: length.value as AISettings["summaryLength"] })}
                  className={cn(
                    "text-left p-3 rounded-xl border transition-all",
                    settings.summaryLength === length.value
                      ? "bg-accent border-primary/50"
                      : "bg-muted border-border hover:bg-accent"
                  )}
                  data-testid={`button-length-${length.value}`}
                >
                  <p className="font-medium text-sm text-foreground">{length.label}</p>
                  <p className="text-xs text-muted-foreground">{length.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-foreground">
                <Faders className="h-4 w-4 text-primary" weight="duotone" />
                Confidence Threshold
              </Label>
              <span className="text-sm font-mono text-primary">
                {Math.round(settings.extractionConfidenceThreshold * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.extractionConfidenceThreshold]}
              onValueChange={([value]) => setSettings({ ...settings, extractionConfidenceThreshold: value })}
              min={0.3}
              max={0.9}
              step={0.05}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">
              Items below this confidence level will be flagged for review
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Auto-extract on save</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically extract actions when saving meeting notes
                </p>
              </div>
              <Switch
                checked={settings.autoExtract}
                onCheckedChange={(checked) => setSettings({ ...settings, autoExtract: checked })}
                data-testid="switch-auto-extract"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Show confidence scores</Label>
                <p className="text-xs text-muted-foreground">
                  Display AI confidence levels on extracted items
                </p>
              </div>
              <Switch
                checked={settings.includeConfidenceScores}
                onCheckedChange={(checked) => setSettings({ ...settings, includeConfidenceScores: checked })}
                data-testid="switch-confidence-scores"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-reset-ai-settings"
          >
            <ArrowCounterClockwise className="h-4 w-4 mr-2" />
            Reset defaults
          </Button>
          <Button onClick={handleSave} className="rounded-xl" data-testid="button-save-ai-settings">
            <FloppyDisk className="h-4 w-4 mr-2" weight="fill" />
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AISettingsButtonProps {
  className?: string;
}

export function AISettingsButton({ className }: AISettingsButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn("text-muted-foreground hover:text-foreground hover:bg-accent", className)}
        data-testid="button-ai-settings"
      >
        <GearSix className="h-4 w-4 mr-2" weight="duotone" />
        AI Settings
      </Button>
      <AISettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
