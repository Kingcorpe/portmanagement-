import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (value: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | null>(null);

const DEMO_MODE_KEY = "practiceOS_demoMode";

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem(DEMO_MODE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(DEMO_MODE_KEY, isDemoMode.toString());
  }, [isDemoMode]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode(prev => {
      const newValue = !prev;
      // Clear all cached queries to prevent stale demo/real data mixing
      queryClient.clear();
      // Navigate to home page to ensure clean state
      window.location.href = "/";
      return newValue;
    });
  }, []);
  
  const setDemoMode = useCallback((value: boolean) => {
    setIsDemoMode(value);
    // Clear all cached queries to prevent stale demo/real data mixing
    queryClient.clear();
    // Navigate to home page to ensure clean state
    window.location.href = "/";
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
