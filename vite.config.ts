import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "NORTH_");
  return {
  plugins: [react()],
  build: {
    modulePreload: false,
    rolldownOptions: {
      output: { minify: { compress: { dropConsole: true, treeshake: { propertyReadSideEffects: false } }, mangle: true, codegen: true } },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "https://north.bodhix.io",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  preview: {
    proxy: {
      "/v1": {
        target: env.NORTH_PREVIEW_API_TARGET || "https://north.bodhix.io",
        changeOrigin: true,
      },
    },
  },
  };
});
