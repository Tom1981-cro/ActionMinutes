export type ThemeId = "aurora" | "paper" | "grid" | "clay" | "terminal";
export type Mode = "light" | "dark";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    primary: string;
    accent: string;
    bg: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: "aurora",
    name: "Aurora",
    description: "Crisp gradients with violet glow.",
    preview: { primary: "#8b5cf6", accent: "#d946ef", bg: "#121212" },
  },
  {
    id: "paper",
    name: "Studio Paper",
    description: "Warm editorial surfaces.",
    preview: { primary: "#b45309", accent: "#d97706", bg: "#1c1917" },
  },
  {
    id: "grid",
    name: "Monochrome Grid",
    description: "Enterprise, scan-first layout.",
    preview: { primary: "#3b82f6", accent: "#60a5fa", bg: "#111827" },
  },
  {
    id: "clay",
    name: "Warm Clay",
    description: "Soft, friendly earth tones.",
    preview: { primary: "#ea580c", accent: "#f97316", bg: "#1a1412" },
  },
  {
    id: "terminal",
    name: "Terminal Luxe",
    description: "Graphite + neon accents.",
    preview: { primary: "#22c55e", accent: "#4ade80", bg: "#0a0a0a" },
  },
];

export const DEFAULT_THEME: ThemeId = "aurora";
export const STORAGE_KEYS = {
  theme: "am.theme",
  mode: "am.mode",
} as const;
