/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_MODEL?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  readonly VITE_PAYMENT_NOTIFICATION_EMAIL?: string;
  readonly VITE_GEMETRA_CORE_ADDRESS?: string;
  readonly VITE_BOTCHAIN_NETWORK?: string;
  readonly VITE_APP_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum?: {
    request: (...args: unknown[]) => Promise<unknown>;
    selectedAddress?: string;
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    isNightly?: boolean;
    isRainbow?: boolean;
    on?: (event: string, fn: (...args: unknown[]) => void) => void;
    removeListener?: (event: string, fn: (...args: unknown[]) => void) => void;
  };
}
