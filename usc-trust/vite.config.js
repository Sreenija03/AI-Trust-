import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes the build deploy cleanly to Vercel AND GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
