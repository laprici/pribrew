import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "pribrew-theme";

/** Lee el tema guardado (default dark) y lo aplica a <html data-theme>. */
export function applyStoredTheme(): Theme {
  const stored = (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) as Theme | null;
  const theme: Theme = stored === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  return theme;
}

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Hook de tema con toggle persistente. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage no disponible */
    }
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}
