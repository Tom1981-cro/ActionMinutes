import { create } from "zustand";
import { type ThemeId, type Mode, DEFAULT_THEME, STORAGE_KEYS } from "./theme-types";

interface ThemeState {
  theme: ThemeId;
  mode: Mode;
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  resetTheme: () => void;
}

function getSavedTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved && ["aurora", "paper", "grid", "clay", "terminal"].includes(saved)) {
      return saved as ThemeId;
    }
  } catch {}
  return DEFAULT_THEME;
}

function getSavedMode(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.mode);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

function applyThemeToDOM(theme: ThemeId, mode: Mode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (mode === "light") {
    root.classList.add("light");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.style.colorScheme = "dark";
  }
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: getSavedTheme(),
  mode: getSavedMode(),

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    set({ theme });
    const currentMode = useThemeStore.getState().mode;
    applyThemeToDOM(theme, currentMode);
  },

  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEYS.mode, mode);
    set({ mode });
    const currentTheme = useThemeStore.getState().theme;
    applyThemeToDOM(currentTheme, mode);
  },

  toggleMode: () => {
    const current = useThemeStore.getState();
    const newMode = current.mode === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEYS.mode, newMode);
    set({ mode: newMode });
    applyThemeToDOM(current.theme, newMode);
  },

  resetTheme: () => {
    const defaultMode: Mode =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    localStorage.setItem(STORAGE_KEYS.theme, DEFAULT_THEME);
    localStorage.setItem(STORAGE_KEYS.mode, defaultMode);
    set({ theme: DEFAULT_THEME, mode: defaultMode });
    applyThemeToDOM(DEFAULT_THEME, defaultMode);
  },
}));

export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const resetTheme = useThemeStore((s) => s.resetTheme);
  return { theme, mode, setTheme, setMode, toggleMode, resetTheme };
}
