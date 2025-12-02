import { createContext, useContext, useState, ReactNode, useCallback } from "react";
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

  const toggleDemoMode = useCallback(() => {
    const newValue = !isDemoMode;
    // Update localStorage FIRST before redirect
    localStorage.setItem(DEMO_MODE_KEY, newValue.toString());
    // Clear all cached queries to prevent stale demo/real data mixing
    queryClient.clear();
    // Navigate to home page to ensure clean state
    window.location.href = "/";
  }, [isDemoMode]);
  
  const setDemoMode = useCallback((value: boolean) => {
    // Update localStorage FIRST before redirect
    localStorage.setItem(DEMO_MODE_KEY, value.toString());
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
