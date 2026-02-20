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
    preview: { primary: "#8B5CF6", accent: "#8B5CF6", bg: "#FFFFFF" },
  },
];

export const DEFAULT_THEME: ThemeId = "default";
export const STORAGE_KEYS = {
  theme: "am.theme",
  mode: "am.mode",
} as const;
