"use client";

import { useTheme } from "next-themes";

import { Icons } from "@/components/icons";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-grid place-items-center w-8 h-8 rounded-[6px] transition-colors duration-[120ms] hover:bg-[var(--surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)] cursor-pointer"
      style={{ color: "var(--fg-muted)" }}
    >
      {isDark ? <Icons.Sun size={15} /> : <Icons.Moon size={15} />}
    </button>
  );
}
