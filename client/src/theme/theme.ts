export type ThemeId = "default";
export type Mode = "light";

export function applyTheme(_theme?: string, _mode?: string) {
  const root = document.documentElement;
  root.classList.add("light");
  root.classList.remove("dark");
  root.style.colorScheme = "light";
}

export function initTheme() {
  applyTheme();
}
