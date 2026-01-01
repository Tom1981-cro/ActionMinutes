import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUpdateUser } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";

type Template = {
  id: string;
  name: string;
  description: string;
  labelColor: string;
  iconBg: string;
  iconBorder?: string;
};

const templates: Template[] = [
  {
    id: "calm-focused",
    name: "Calm & Focused",
    description: "Warm stone tones with teal accents. Outfit font, soft shadows, and generous rounded corners.",
    labelColor: "text-teal-600",
    iconBg: "bg-gradient-to-br from-teal-400 to-teal-600",
  },
  {
    id: "cupertino-glass",
    name: "Cupertino Glass",
    description: "Native macOS/iOS aesthetic. Frosted glass panels, backdrop blurs, and System Blue accents.",
    labelColor: "text-blue-500",
    iconBg: "bg-gradient-to-b from-[#007AFF] to-[#0055CC]",
  },
  {
    id: "titanium-minimal",
    name: "Titanium Minimal",
    description: "Inspired by premium hardware. Raw metal tones, sharp 1px borders, zero color saturation.",
    labelColor: "text-zinc-500",
    iconBg: "bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-400",
  },
  {
    id: "vibrant-enterprise",
    name: "Vibrant Enterprise",
    description: "Modern SaaS aesthetic (Linear/Stripe). Clean white surfaces with indigo-purple gradients.",
    labelColor: "text-indigo-500",
    iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600",
  },
  {
    id: "slate-professional",
    name: "Slate Professional",
    description: "Outlook/Office style. Cool grays, dense information layouts. Conservative and trustworthy.",
    labelColor: "text-slate-600",
    iconBg: "bg-slate-700",
  },
  {
    id: "focus-light",
    name: "Focus Light",
    description: "Things 3 / Notion vibe. Pure white, minimal chrome, heavy reliance on whitespace.",
    labelColor: "text-gray-500",
    iconBg: "bg-white",
    iconBorder: "border-2 border-gray-200",
  },
];

function AppIcon({ template }: { template: Template }) {
  return (
    <div
      className={cn(
        "w-14 h-14 rounded-[22%] flex items-center justify-center shadow-lg transition-transform hover:scale-105 flex-shrink-0",
        template.iconBg,
        template.iconBorder
      )}
      data-testid={`icon-template-${template.id}`}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        className={cn(
          template.id === "titanium-minimal" ? "stroke-zinc-700" : 
          template.id === "focus-light" ? "stroke-black" : "stroke-white"
        )}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 16L13 21L24 10" />
        <path d="M16 6 A10 10 0 0 1 26 16" opacity="0.4" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function SettingsTemplatesPage() {
  const { user, updateUser: updateLocalUser } = useStore();
  const updateUser = useUpdateUser();
  const { toast } = useToast();
  
  const currentTemplate = user.template || "calm-focused";

  const handleApplyTemplate = (templateId: string) => {
    if (templateId === currentTemplate) return;
    
    updateLocalUser({ template: templateId });
    updateUser.mutate({ template: templateId }, {
      onSuccess: () => {
        toast({ 
          title: "Style applied", 
          description: `Now using ${templates.find(t => t.id === templateId)?.name}` 
        });
      },
      onError: () => {
        updateLocalUser({ template: currentTemplate });
        toast({ 
          title: "Error", 
          description: "Failed to apply style", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
          <CardTitle className="text-lg">Design Templates</CardTitle>
          <CardDescription className="text-base">
            Choose a visual style for your ActionMinutes experience
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((template) => {
              const isSelected = currentTemplate === template.id;
              return (
                <div
                  key={template.id}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 transition-all",
                    isSelected
                      ? "border-primary bg-accent/50"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
                  )}
                  data-testid={`card-template-${template.id}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <AppIcon template={template} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs font-bold uppercase tracking-wider", template.labelColor)}>
                          {template.id === "calm-focused" ? "Default" : "System"}
                        </span>
                      </div>
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    {isSelected ? (
                      <Badge className="bg-primary/10 text-primary border-0">Active</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplyTemplate(template.id)}
                        className="h-9 rounded-xl"
                        data-testid={`button-apply-${template.id}`}
                      >
                        Apply style
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
