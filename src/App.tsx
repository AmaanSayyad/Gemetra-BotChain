import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import DashboardLayout from "./components/DashboardLayout";
import { LandingPage } from "./components/LandingPage";
import { Header } from "./components/Header";
import { usePhantomPublicKey } from "./hooks/usePhantomPublicKey";
import { AppNavigationProvider, useAppNavigation } from "./hooks/useAppNavigation";

const APP_TABS = [
  "dashboard",
  "employees",
  "bulk-transfer",
  "ai-assistant-chat",
  "ai-assistant-history",
  "settings",
] as const;

function AppShell() {
  const { address, isConnected } = useAccount();
  const phantomPublicKey = usePhantomPublicKey();
  const { activeTab, setActiveTab } = useAppNavigation();
  const hasAppSession =
    Boolean(isConnected && address) || Boolean(phantomPublicKey.trim());
  const inApp = hasAppSession && APP_TABS.includes(activeTab as (typeof APP_TABS)[number]);

  // If the wallet disconnects while inside the app, return to the landing page.
  // Do NOT auto-enter the dashboard on connect — users should read the landing first.
  useEffect(() => {
    if (!hasAppSession && activeTab !== "landing") {
      setActiveTab("landing");
    }
  }, [hasAppSession, activeTab, setActiveTab]);

  const renderActiveComponent = () => {
    if (inApp) {
      const sessionKey =
        (isConnected && address ? address : phantomPublicKey) || "";
      const savedCompanyName = sessionKey
        ? localStorage.getItem(`gemetra_company_name_${sessionKey}`) || "My Company"
        : "My Company";
      return <DashboardLayout companyName={savedCompanyName} />;
    }
    return <LandingPage />;
  };

  return (
    <div className="min-h-screen min-w-0 bg-white relative">
      <div className="relative z-10 min-w-0">
        {!hasAppSession && activeTab !== "landing" && (
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isWalletConnected={hasAppSession}
            walletAddress={address ?? phantomPublicKey ?? ""}
            onGetStarted={() => {}}
            user={null}
          />
        )}

        <main className="relative min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={inApp ? "dashboard" : "landing"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="min-w-0"
            >
              {renderActiveComponent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppNavigationProvider>
      <AppShell />
    </AppNavigationProvider>
  );
}

export default App;
