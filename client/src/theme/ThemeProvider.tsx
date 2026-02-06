import { useLayoutEffect } from "react";
import { useThemeStore } from "./useTheme";
import { applyTheme } from "./theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const mode = useThemeStore((s) => s.mode);

  useLayoutEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode]);

  return <>{children}</>;
}
