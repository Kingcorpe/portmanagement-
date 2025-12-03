import { useEffect, useState, useCallback } from "react";
import type { Theme } from "@/lib/themes";

const THEME_STORAGE_KEY = "app-theme";
const DEFAULT_THEME: Theme = "futuristic";

// Apply theme immediately to document (before React renders)
function applyThemeToDocument(newTheme: Theme, darkMode: boolean) {
  // Remove all theme classes
  document.documentElement.classList.remove("theme-default", "theme-futuristic", "theme-minimal");
  // Add new theme class
  document.documentElement.classList.add(`theme-${newTheme}`);
  
  // Update dark mode
  document.documentElement.classList.toggle("dark", darkMode);
}

// Initialize theme immediately on load
function initializeTheme() {
  const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || DEFAULT_THEME;
  const savedDarkMode = localStorage.getItem("theme") === "dark";
  applyThemeToDocument(savedTheme, savedDarkMode);
}

// Run initialization immediately
if (typeof document !== "undefined") {
  initializeTheme();
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || DEFAULT_THEME;
  });
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  // Sync state with document on mount
  useEffect(() => {
    applyThemeToDocument(theme, isDark);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyThemeToDocument(newTheme, isDark);
  }, [isDark]);

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    applyThemeToDocument(theme, newDarkMode);
  }, [isDark, theme]);

  return { theme, setTheme, isDark, toggleDarkMode };
}
