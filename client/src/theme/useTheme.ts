import { create } from "zustand";

interface ThemeState {
  theme: string;
  mode: string;
  setTheme: (theme: string) => void;
  setMode: (mode: string) => void;
  toggleMode: () => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: "default",
  mode: "light",
  setTheme: () => {},
  setMode: () => {},
  toggleMode: () => {},
  resetTheme: () => {},
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
