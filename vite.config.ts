import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/songtsam-auto-opening-demo/",
  plugins: [react()],
  server: {
    proxy: {
      "/tool-api": {
        target: "https://test-api.songtsam.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
