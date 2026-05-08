import solidBetterRefresh from "solid-better-refresh";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import solidSvg from "vite-plugin-solid-svg";

export default defineConfig({
  plugins: [solidPlugin(), solidSvg(), solidBetterRefresh()],
  server: {
    port: 3000,
    // if you're running on a managed host
    // you should probably remove this
    allowedHosts: true,
  },
  build: {
    target: "esnext",
    minify: false,
    cssMinify: false,
    terserOptions: {
      compress: false,
      mangle: false,
    } as never,
  },
});
