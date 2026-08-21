import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type AppView = "landing" | "dashboard" | "employees" | "bulk-transfer" | "ai-assistant-chat" | "ai-assistant-history" | "settings";

type AppNavigationValue = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  enterApp: () => void;
  showLanding: () => void;
};

const AppNavigationContext = createContext<AppNavigationValue | null>(null);

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>("landing");

  const enterApp = useCallback(() => {
    setActiveTab("dashboard");
  }, []);

  const showLanding = useCallback(() => {
    setActiveTab("landing");
  }, []);

  const value = useMemo(
    () => ({ activeTab, setActiveTab, enterApp, showLanding }),
    [activeTab, enterApp, showLanding],
  );

  return <AppNavigationContext.Provider value={value}>{children}</AppNavigationContext.Provider>;
}

export function useAppNavigation() {
  const ctx = useContext(AppNavigationContext);
  if (!ctx) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider");
  }
  return ctx;
}

export type { AppView };
