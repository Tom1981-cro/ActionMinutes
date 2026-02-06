export type ThemeId = "aurora" | "paper" | "grid" | "clay" | "terminal";
export type Mode = "light" | "dark";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  bestFor: string;
  preview: {
    primary: string;
    accent: string;
    bg: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: "aurora",
    name: "Aurora Minimal",
    description: "Premium, calm, background-only gradient; crisp cards.",
    bestFor: "Best default theme",
    preview: { primary: "#a78bfa", accent: "#818cf8", bg: "#0f0e1a" },
  },
  {
    id: "paper",
    name: "Studio Paper",
    description: "Editorial notebook vibe; warm surfaces; great for writing.",
    bestFor: "Notes / Journal heavy users",
    preview: { primary: "#c084fc", accent: "#a78bfa", bg: "#171311" },
  },
  {
    id: "grid",
    name: "Monochrome Grid",
    description: "Scan-first enterprise precision; minimal color; aligned metadata.",
    bestFor: "Inbox / Reminders power use",
    preview: { primary: "#818cf8", accent: "#6366f1", bg: "#0e0e18" },
  },
  {
    id: "clay",
    name: "Warm Clay",
    description: "Friendly tactile softness; warm neutrals; approachable.",
    bestFor: "Personal productivity",
    preview: { primary: "#f472b6", accent: "#fb923c", bg: "#171210" },
  },
  {
    id: "terminal",
    name: "Terminal Luxe",
    description: "Graphite + neon accents; power-user dark without gimmicks.",
    bestFor: "Late-night / power users",
    preview: { primary: "#c084fc", accent: "#22d3ee", bg: "#08081a" },
  },
];

export const DEFAULT_THEME: ThemeId = "aurora";
export const STORAGE_KEYS = {
  theme: "am.theme",
  mode: "am.mode",
} as const;
