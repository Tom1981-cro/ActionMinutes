import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const template = user.template || "calm-focused";

  useEffect(() => {
    const themeValue = template === "calm-focused" ? "" : template;
    document.documentElement.setAttribute("data-theme", themeValue);
  }, [template]);

  return <>{children}</>;
}
