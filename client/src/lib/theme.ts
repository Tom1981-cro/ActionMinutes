export type TemplateId = 
  | "calm-focused"
  | "cupertino-glass"
  | "titanium-minimal"
  | "vibrant-enterprise"
  | "slate-professional"
  | "focus-light";

export interface ThemeConfig {
  id: TemplateId;
  name: string;
  cssVariables: Record<string, string>;
}

export const themes: Record<TemplateId, ThemeConfig> = {
  "calm-focused": {
    id: "calm-focused",
    name: "Calm & Focused",
    cssVariables: {
      "--theme-bg": "250 250 249",
      "--theme-card": "255 255 255",
      "--theme-primary": "20 184 166",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "20 184 166",
      "--theme-muted": "245 245 244",
      "--theme-border": "231 229 228",
      "--theme-radius": "1rem",
      "--theme-font": "'Outfit', sans-serif",
    },
  },
  "cupertino-glass": {
    id: "cupertino-glass",
    name: "Cupertino Glass",
    cssVariables: {
      "--theme-bg": "249 250 251",
      "--theme-card": "255 255 255",
      "--theme-primary": "0 122 255",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "0 122 255",
      "--theme-muted": "243 244 246",
      "--theme-border": "229 231 235",
      "--theme-radius": "0.75rem",
      "--theme-font": "'Inter', sans-serif",
    },
  },
  "titanium-minimal": {
    id: "titanium-minimal",
    name: "Titanium Minimal",
    cssVariables: {
      "--theme-bg": "255 255 255",
      "--theme-card": "255 255 255",
      "--theme-primary": "24 24 27",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "24 24 27",
      "--theme-muted": "250 250 250",
      "--theme-border": "228 228 231",
      "--theme-radius": "0.375rem",
      "--theme-font": "'Inter', sans-serif",
    },
  },
  "vibrant-enterprise": {
    id: "vibrant-enterprise",
    name: "Vibrant Enterprise",
    cssVariables: {
      "--theme-bg": "255 255 255",
      "--theme-card": "255 255 255",
      "--theme-primary": "99 102 241",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "139 92 246",
      "--theme-muted": "238 242 255",
      "--theme-border": "226 232 240",
      "--theme-radius": "0.5rem",
      "--theme-font": "'Inter', sans-serif",
    },
  },
  "slate-professional": {
    id: "slate-professional",
    name: "Slate Professional",
    cssVariables: {
      "--theme-bg": "248 250 252",
      "--theme-card": "255 255 255",
      "--theme-primary": "37 99 235",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "37 99 235",
      "--theme-muted": "241 245 249",
      "--theme-border": "226 232 240",
      "--theme-radius": "0.375rem",
      "--theme-font": "system-ui, sans-serif",
    },
  },
  "focus-light": {
    id: "focus-light",
    name: "Focus Light",
    cssVariables: {
      "--theme-bg": "255 255 255",
      "--theme-card": "255 255 255",
      "--theme-primary": "0 0 0",
      "--theme-primary-foreground": "255 255 255",
      "--theme-accent": "0 0 0",
      "--theme-muted": "250 250 250",
      "--theme-border": "243 244 246",
      "--theme-radius": "0.5rem",
      "--theme-font": "'Inter', sans-serif",
    },
  },
};

export function applyTheme(templateId: TemplateId) {
  const theme = themes[templateId];
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  document.body.setAttribute("data-theme", templateId);
}

export function getTheme(templateId: string): ThemeConfig {
  return themes[templateId as TemplateId] || themes["calm-focused"];
}
