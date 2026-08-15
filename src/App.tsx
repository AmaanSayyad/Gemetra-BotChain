
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import DashboardLayout from "./components/DashboardLayout";
import { LandingPage } from "./components/LandingPage";
import { Header } from "./components/Header";
import { usePhantomPublicKey } from "./hooks/usePhantomPublicKey";


function App() {
  const { address, isConnected } = useAccount();
  const phantomPublicKey = usePhantomPublicKey();
  const hasAppSession =
    Boolean(isConnected && address) || Boolean(phantomPublicKey.trim());
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("gemetra_active_tab") || "landing";
  });

  // persist active tab
  useEffect(() => {
    localStorage.setItem("gemetra_active_tab", activeTab);
  }, [activeTab]);

  // handle redirects
  useEffect(() => {
    if (hasAppSession && activeTab === "landing") {
      setActiveTab("dashboard");
    } else if (!hasAppSession && !["landing"].includes(activeTab)) {
      setActiveTab("landing");
    }
  }, [hasAppSession, activeTab]);

  const renderActiveComponent = () => {
    if (hasAppSession && ["dashboard", "employees", "bulk-transfer", "ai-assistant-chat", "ai-assistant-history", "settings"].includes(activeTab)) {
      // Load company name from localStorage if available
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
              key={hasAppSession ? "dashboard" : "landing"}
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

export default App;
