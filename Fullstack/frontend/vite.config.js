import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BASE = "/torchxbite/";
const API_TARGET = "http://127.0.0.1:5600";
const stripBase = (path) => path.replace(/^\/torchxbite/, "");

export default defineConfig({
  base: BASE,
  plugins: [react()],

  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/torchxbite/api": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: stripBase,
      },
      "/torchxbite/uploads": {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
        rewrite: stripBase,
      },
      "/torchxbite/socket.io": {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
        secure: false,
        rewrite: stripBase,
      },
    },
  },
});
