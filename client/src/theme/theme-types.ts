export type ThemeId = "default";
export type Mode = "light";

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
    id: "default",
    name: "ActionMinutes",
    description: "Clean, modern productivity design.",
    bestFor: "All users",
    preview: { primary: "#F59E0B", accent: "#F59E0B", bg: "#FFFFFF" },
  },
];

export const DEFAULT_THEME: ThemeId = "default";
export const STORAGE_KEYS = {
  theme: "am.theme",
  mode: "am.mode",
} as const;
