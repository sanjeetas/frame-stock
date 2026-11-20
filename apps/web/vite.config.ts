import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  publicDir: "../../public",
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://localhost:3000", changeOrigin: false } },
  },
});
