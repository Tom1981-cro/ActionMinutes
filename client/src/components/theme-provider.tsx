import { useEffect } from "react";
import { useStore } from "@/lib/store";
import type { TemplateId } from "@/lib/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const template = (user.template || "calm-focused") as TemplateId;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", template);
  }, [template]);

  return <>{children}</>;
}
