import { useLayoutEffect } from "react";
import { useThemeStore } from "./useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (mode === "light") {
      root.classList.add("light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.style.colorScheme = "dark";
    }
  }, [theme, mode]);

  return <>{children}</>;
}
