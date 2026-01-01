import { useEffect } from "react";
import { useStore } from "@/lib/store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const template = user.template || "calm-focused";

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", template);
    document.body.setAttribute("data-theme", template);
  }, [template]);

  return <>{children}</>;
}
