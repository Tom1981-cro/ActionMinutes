import { type ThemeId, type Mode, DEFAULT_THEME, STORAGE_KEYS } from "./theme-types";

function getStoredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved && ["aurora", "paper", "grid", "clay", "terminal"].includes(saved)) {
      return saved as ThemeId;
    }
  } catch {}
  return DEFAULT_THEME;
}

function getStoredMode(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.mode);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

export function applyTheme(theme: ThemeId, mode: Mode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (mode === "light") {
    root.classList.add("light");
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }
}

export function initTheme() {
  const theme = getStoredTheme();
  const mode = getStoredMode();
  applyTheme(theme, mode);
}
