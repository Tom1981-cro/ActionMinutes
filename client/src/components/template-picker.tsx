import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Users, FirstAid, Microphone, GraduationCap, Briefcase,
  ListBullets, CheckSquare, Notebook, HighlighterCircle, ChatCircle,
  Stethoscope, TrendUp, UserCircle, UserCheck, Newspaper,
  Chalkboard, BookOpen, Target, Handshake, ChartLine,
  SpinnerGap,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, Icon> = {
  FileText,
  Users,
  FirstAid,
  Microphone,
  GraduationCap,
  Briefcase,
  ListBullets,
  CheckSquare,
  Notebook,
  HighlighterCircle,
  ChatCircle,
  Stethoscope,
  TrendUp,
  UserCircle,
  UserCheck,
  Newspaper,
  Chalkboard,
  BookOpen,
  Target,
  Handshake,
  ChartLine,
};

interface TemplatPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templateId: string) => void;
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

export function TemplatePicker({ open, onOpenChange, onSelect, isGenerating }: TemplatPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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

  const filtered = selectedCategory === "all"
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const getIcon = (iconName: string) => {
    const IconComp = ICON_MAP[iconName] || FileText;
    return <IconComp className="h-5 w-5 text-primary" weight="duotone" />;
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComp = ICON_MAP[iconName] || FileText;
    return <IconComp className="h-4 w-4" weight="duotone" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel rounded-2xl max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground">Choose a Template</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a summary template to generate a structured analysis of your transcript.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <SpinnerGap className="h-8 w-8 animate-spin text-primary" weight="bold" />
            <p className="text-muted-foreground mt-3">Generating summary...</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerGap className="h-6 w-6 animate-spin text-primary" weight="bold" />
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" data-testid="template-category-tabs">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className={cn(
                  "cursor-pointer rounded-full shrink-0 transition-colors",
                  selectedCategory === "all" && "bg-primary text-primary-foreground"
                )}
                onClick={() => setSelectedCategory("all")}
                data-testid="tab-category-all"
              >
                All
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.id ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer rounded-full shrink-0 transition-colors flex items-center gap-1.5",
                    selectedCategory === cat.id && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setSelectedCategory(cat.id)}
                  data-testid={`tab-category-${cat.id}`}
                >
                  {getCategoryIcon(cat.icon)}
                  {cat.label}
                </Badge>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-2 pb-2" data-testid="template-list">
              {filtered.map((template) => (
                <button
                  key={template.id}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border border-border bg-muted/50",
                    "hover:bg-accent hover:border-primary/20 transition-all duration-200",
                    "flex items-start gap-3 group cursor-pointer"
                  )}
                  onClick={() => onSelect(template.id)}
                  data-testid={`template-option-${template.id}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    {getIcon(template.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 rounded-full text-xs capitalize">
                    {template.category}
                  </Badge>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">No templates in this category.</p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
