/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tsconfigPaths from "vite-tsconfig-paths"
import path from "path"

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/platform": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/sales": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/insight": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/inventory": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/integration": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/customer": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/catalog": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ".vitest/setup",
    include: ["**/*.test.{ts,tsx}"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})
