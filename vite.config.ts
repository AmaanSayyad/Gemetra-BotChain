import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "node:path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      buffer: resolve(__dirname, "node_modules/buffer"),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ["buffer"],
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'window',
  },
})