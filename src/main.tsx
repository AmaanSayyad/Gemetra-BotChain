import "./polyfills";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { SolanaProviders } from "./solana/SolanaProviders";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

// Create QueryClient for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Render app with Query provider
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SolanaProviders>
        <App />
      </SolanaProviders>
    </QueryClientProvider>
  </React.StrictMode>
);
