import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Users, FirstAid, Microphone, GraduationCap, Briefcase,
  ListBullets, CheckSquare, Notebook, HighlighterCircle, ChatCircle,
  Stethoscope, TrendUp, UserCircle, UserCheck, Newspaper,
  Chalkboard, BookOpen, Target, Handshake, ChartLine,
  SpinnerGap, MagnifyingGlass, Sparkle, Globe, Star,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, Icon> = {
  FileText, Users, FirstAid, Microphone, GraduationCap, Briefcase,
  ListBullets, CheckSquare, Notebook, HighlighterCircle, ChatCircle,
  Stethoscope, TrendUp, UserCircle, UserCheck, Newspaper,
  Chalkboard, BookOpen, Target, Handshake, ChartLine,
};

interface TemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templateId: string, options?: { model?: string; language?: string }) => void;
  isGenerating: boolean;
}

type TemplateData = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
};

type CategoryData = {
  id: string;
  label: string;
  icon: string;
};

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
  { value: "hr", label: "Croatian" },
];

const AI_MODELS = [
  { value: "auto", label: "Auto" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gemini-2.5-flash", label: "Gemini Flash" },
];

export function TemplatePicker({ open, onOpenChange, onSelect, isGenerating }: TemplatePickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiModel, setAiModel] = useState("auto");
  const [language, setLanguage] = useState("auto");

  const { data, isLoading } = useQuery<{ templates: TemplateData[]; categories: CategoryData[] }>({
    queryKey: ["/api/summary-templates"],
    queryFn: async () => {
      const res = await fetch("/api/summary-templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: open,
  });

  const templates = data?.templates ?? [];
  const categories = data?.categories ?? [];

  const filtered = templates.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getIcon = (iconName: string, className?: string) => {
    const IconComp = ICON_MAP[iconName] || FileText;
    return <IconComp className={className || "h-6 w-6 text-primary"} weight="duotone" />;
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComp = ICON_MAP[iconName] || FileText;
    return <IconComp className="h-3.5 w-3.5" weight="duotone" />;
  };

  const handleGenerate = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate, { model: aiModel, language });
    }
  };

  const sidebarItems: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "Recommended", icon: <Star className="h-3.5 w-3.5" weight="duotone" /> },
    ...categories.map((cat) => ({
      id: cat.id,
      label: cat.label,
      icon: getCategoryIcon(cat.icon),
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel rounded-2xl max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-xl font-bold text-foreground">Select a template</DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16">
            <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
            <p className="text-muted-foreground mt-3">Generating summary...</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerGap className="h-6 w-6 animate-spin text-primary" weight="bold" />
          </div>
        ) : (
          <div className="flex flex-col h-[65vh]">
            <div className="flex flex-1 min-h-0">
              <div className="w-40 shrink-0 border-r border-border py-3 overflow-y-auto" data-testid="template-category-sidebar">
                <div className="px-3 pb-3">
                  <div className="relative">
                    <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid="input-search-templates"
                    />
                  </div>
                </div>
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedCategory(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors text-left",
                      selectedCategory === item.id
                        ? "bg-primary/10 text-primary border-r-2 border-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`tab-category-${item.id}`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-4" data-testid="template-list">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filtered.map((template) => (
                    <button
                      key={template.id}
                      className={cn(
                        "text-left p-4 rounded-xl border transition-all duration-200 group cursor-pointer flex flex-col gap-2",
                        selectedTemplate === template.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-sm"
                      )}
                      onClick={() => setSelectedTemplate(template.id)}
                      data-testid={`template-option-${template.id}`}
                    >
                      <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                        {getIcon(template.icon, "h-5 w-5 text-primary")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-12 text-sm">No templates found.</p>
                )}
              </div>
            </div>

            <div className="border-t border-border px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Sparkle className="h-4 w-4 text-primary" weight="duotone" />
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-8 w-[130px] text-xs rounded-lg border-border bg-muted" data-testid="select-ai-model">
                      <SelectValue placeholder="AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" weight="duotone" />
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg border-border bg-muted" data-testid="select-language">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplate || isGenerating}
                className="btn-gradient rounded-xl px-6"
                data-testid="button-generate-template"
              >
                Generate now
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
