import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/songtsam-auto-opening-demo/",
  plugins: [react()],
});
