"use client";

import React from "react";

export type Theme = "light" | "dark";

/**
 * Read/toggle the app theme. The initial value is set before paint by the
 * inline script in the root layout; this hook syncs React state to it and
 * persists changes to localStorage.
 */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  const apply = React.useCallback((next: Theme) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("wathiq-theme", next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = React.useCallback(() => {
    apply(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }, [apply]);

  return { theme, toggle, setTheme: apply };
}
