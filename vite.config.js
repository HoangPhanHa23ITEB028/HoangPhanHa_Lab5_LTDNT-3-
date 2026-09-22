import { defineConfig } from "vite";

const proxyConfig = {
  "/api": {
    target: "http://localhost:3001",
    changeOrigin: true
  }
};

export default defineConfig({
  server: {
    proxy: proxyConfig
  },

  preview: {
    proxy: proxyConfig
  }
});