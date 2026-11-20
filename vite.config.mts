/// <reference types="vitest" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import tsconfigPaths from "vite-tsconfig-paths"
import path from "path"

const productionGateway = "https://api.sapo.makeasy.id.vn"
const gatewayProxy = {
  target: productionGateway,
  changeOrigin: true,
  secure: true
}

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/api": {
        ...gatewayProxy
      },
      "/platform": {
        ...gatewayProxy
      },
      "/sales": {
        ...gatewayProxy
      },
      "/insight": {
        ...gatewayProxy
      },
      "/inventory": {
        ...gatewayProxy
      },
      "/catalog": {
        ...gatewayProxy
      },
      "/static": {
        ...gatewayProxy
      },
      "/integration": {
        ...gatewayProxy
      },
      "/customer": {
        ...gatewayProxy
      },
      "/finance": {
        ...gatewayProxy
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
