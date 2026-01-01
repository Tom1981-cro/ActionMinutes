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
  prompt: string;
};

const templates: Template[] = [
  {
    id: "calm-focused",
    name: "Calm & Focused",
    description: "Warm stone tones with teal accents. Outfit font, soft shadows, and generous rounded corners.",
    labelColor: "text-teal-600",
    iconBg: "bg-gradient-to-br from-teal-400 to-teal-600",
    prompt: `Design System: "System 2 Calm & Focused"
1. Backgrounds: bg-stone-50/50 canvas. bg-white cards.
2. Colors: Primary is teal-500. Text is slate-800.
3. Typography: Outfit font. Relaxed tracking.
4. Radius: rounded-2xl consistently.
5. Shadows: Soft shadows (shadow-sm).
6. Iconography: Lucide outline icons.`,
  },
  {
    id: "cupertino-glass",
    name: "Cupertino Glass",
    description: "Native macOS/iOS aesthetic. Frosted glass panels, backdrop blurs, and System Blue accents.",
    labelColor: "text-blue-500",
    iconBg: "bg-gradient-to-b from-[#007AFF] to-[#0055CC]",
    prompt: `Design System: "Cupertino Glass"
1. Backgrounds: Use bg-gray-50 for canvas. Use bg-white/70 backdrop-blur-xl for panels.
2. Colors: Primary Action is #007AFF (System Blue). Text is Slate-900.
3. Shadows: Large, diffuse shadows (shadow-xl shadow-black/5).
4. Radius: rounded-xl consistently.
5. Typography: Inter. Tight tracking headers.
6. Iconography: Use filled icons (SF Symbols style).`,
  },
  {
    id: "titanium-minimal",
    name: "Titanium Minimal",
    description: "Inspired by premium hardware. Raw metal tones, sharp 1px borders, zero color saturation.",
    labelColor: "text-zinc-500",
    iconBg: "bg-gradient-to-br from-zinc-300 via-zinc-100 to-zinc-400",
    prompt: `Design System: "Titanium Minimal"
1. Backgrounds: bg-white main, bg-zinc-50 secondary.
2. Borders: Crucial. border border-zinc-200 on almost all containers.
3. Colors: Monochrome. Primary buttons bg-zinc-900 text-white.
4. Radius: rounded-md (sharp, precise).
5. Typography: Inter. Use tabular-nums for data.
6. Shadows: shadow-sm only. Very flat.`,
  },
  {
    id: "vibrant-enterprise",
    name: "Vibrant Enterprise",
    description: "Modern SaaS aesthetic (Linear/Stripe). Clean white surfaces with indigo-purple gradients.",
    labelColor: "text-indigo-500",
    iconBg: "bg-gradient-to-br from-indigo-500 to-purple-600",
    prompt: `Design System: "Vibrant Enterprise"
1. Backgrounds: bg-white.
2. Accents: Use gradients bg-gradient-to-r from-indigo-500 to-purple-500.
3. Typography: Inter. Headings dark (slate-900) and bold.
4. Cards: bg-white with shadow-lg shadow-indigo-500/10.
5. Icons: Soft colored backgrounds (bg-indigo-50 text-indigo-600).
6. Radius: rounded-lg.`,
  },
  {
    id: "slate-professional",
    name: "Slate Professional",
    description: "Outlook/Office style. Cool grays, dense information layouts. Conservative and trustworthy.",
    labelColor: "text-slate-600",
    iconBg: "bg-slate-700",
    prompt: `Design System: "Slate Professional"
1. Palette: slate-50 backgrounds, slate-200 borders.
2. Primary Color: blue-600 (Classic link blue).
3. Layout: Dense tables with border-b dividers.
4. Radius: rounded-md or rounded-sm.
5. Shadows: None or very subtle shadow-sm.
6. Typography: System font stack. High legibility.`,
  },
  {
    id: "focus-light",
    name: "Focus Light",
    description: "Things 3 / Notion vibe. Pure white, minimal chrome, heavy reliance on whitespace.",
    labelColor: "text-gray-500",
    iconBg: "bg-white",
    iconBorder: "border-2 border-gray-200",
    prompt: `Design System: "Focus Light"
1. Backgrounds: Pure bg-white.
2. Borders: Minimal/Transparent.
3. Colors: stone-500 icons, black text.
4. Radius: rounded-lg.
5. Interactions: Reveal on hover.
6. Iconography: Outline / Stroke style.`,
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

  const handleSelectTemplate = (templateId: string) => {
    if (templateId === currentTemplate) return;
    
    updateLocalUser({ template: templateId });
    updateUser.mutate({ template: templateId }, {
      onSuccess: () => {
        toast({ 
          title: "Template updated", 
          description: `Switched to ${templates.find(t => t.id === templateId)?.name}` 
        });
      },
      onError: () => {
        toast({ 
          title: "Error", 
          description: "Failed to update template", 
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <Card className="bg-white border-stone-200 rounded-2xl">
        <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5">
          <CardTitle className="text-lg text-slate-800">Design Templates</CardTitle>
          <CardDescription className="text-stone-500 text-base">
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
                  onClick={() => handleSelectTemplate(template.id)}
                  className={cn(
                    "relative p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-teal-500 bg-teal-50/50"
                      : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm"
                  )}
                  data-testid={`card-template-${template.id}`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
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
                      <h3 className="font-semibold text-slate-800 mb-1">{template.name}</h3>
                      <p className="text-xs text-stone-500 line-clamp-2">{template.description}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <Badge className="mt-3 bg-teal-100 text-teal-700 border-0">Active</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {currentTemplate && (
        <Card className="bg-slate-900 border-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="px-4 pt-4 pb-3 md:px-6 md:pt-5 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-white">Design Prompt</CardTitle>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => {
                const template = templates.find(t => t.id === currentTemplate);
                if (template) {
                  navigator.clipboard.writeText(template.prompt);
                  toast({ title: "Copied to clipboard" });
                }
              }}
              className="text-teal-400 hover:text-teal-300 hover:bg-slate-800"
              data-testid="button-copy-prompt"
            >
              Copy
            </Button>
          </CardHeader>
          <CardContent className="px-4 pb-4 md:px-6 md:pb-5">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
              {templates.find(t => t.id === currentTemplate)?.prompt}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
