import { useEffect, useState, useCallback } from "react";
import type { Theme } from "@/lib/themes";

const THEME_STORAGE_KEY = "app-theme";
const DEFAULT_THEME: Theme = "default";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || DEFAULT_THEME;
    const savedDarkMode = localStorage.getItem("theme") === "dark";
    
    setThemeState(savedTheme);
    setIsDark(savedDarkMode);
    applyTheme(savedTheme, savedDarkMode);
  }, []);

  const applyTheme = useCallback((newTheme: Theme, darkMode: boolean) => {
    // Remove all theme classes
    document.documentElement.classList.remove("theme-default", "theme-futuristic", "theme-minimal");
    // Add new theme class
    document.documentElement.classList.add(`theme-${newTheme}`);
    
    // Update dark mode
    document.documentElement.classList.toggle("dark", darkMode);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme, isDark);
  }, [isDark, applyTheme]);

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    applyTheme(theme, newDarkMode);
  }, [isDark, theme, applyTheme]);

  return { theme, setTheme, isDark, toggleDarkMode };
}
