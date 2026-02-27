"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  localStorage.setItem("theme_mode", mode);
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme_mode");
    if (saved === "dark" || saved === "light") {
      setMode(saved);
    } else {
      setMode(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(mode);
  }, [mode, mounted]);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-semibold text-white transition hover:bg-white/20"
      title={!mounted ? "Theme" : mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={
        !mounted ? "Theme" : mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
      }
    >
      {!mounted ? "Theme" : mode === "dark" ? "Light" : "Dark"}
    </button>
  );
}
