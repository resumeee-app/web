import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import baseTailwindConfig from "./tailwind.config.js";

/**
 * Static files in `public/` that are actually referenced by the standalone landing page.
 */
const LANDING_PUBLIC_FILES = [
  "logo.svg",
  "theme-init.js",
  "icons/favicon-32x32.png",
  "icons/favicon-16x16.png",
  "icons/apple-touch-icon.png",
  "icons/logo-og-1200x630.png",
] as const;

/**
 * Source files scanned by Tailwind CSS for the standalone landing bundle.
 */
const LANDING_TAILWIND_CONTENT = [
  "./landing.html",
  "./src/landing-main.tsx",
  "./src/pages/landing-page.tsx",
  "./src/components/layout/landing-layout.tsx",
  "./src/components/layout/public-shell-parts.tsx",
  "./src/components/layout/skip-link.tsx",
  "./src/components/layout/theme-toggle.tsx",
  "./src/components/layout/resumeee-logo.tsx",
  "./src/components/branches/branch-shared-elements.tsx",
  "./src/components/ui/button.tsx",
  "./src/components/ui/dropdown-menu.tsx",
  "./src/lib/theme-provider.tsx",
  "./src/lib/theme.ts",
  "./src/lib/utils.ts",
];

/**
 * Emits `landing.html` as `dist-landing/index.html` and copies only the minimal
 * required static assets from `public/` into the output directory.
 */
function landingBundlePlugin(): Plugin {
  return {
    name: "landing-static-bundle",
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir ?? path.resolve(__dirname, "dist-landing");
      const publicRoot = path.resolve(__dirname, "public");

      const emittedHtml = path.join(outDir, "landing.html");
      const indexHtml = path.join(outDir, "index.html");
      if (fs.existsSync(emittedHtml)) {
        fs.renameSync(emittedHtml, indexHtml);
      }

      for (const relPath of LANDING_PUBLIC_FILES) {
        const srcPath = path.join(publicRoot, relPath);
        const destPath = path.join(outDir, relPath);
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    },
  };
}

export default defineConfig({
  envDir: __dirname,
  envPrefix: ["VITE_"],
  publicDir: false,
  plugins: [react(), landingBundlePlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          ...baseTailwindConfig,
          content: LANDING_TAILWIND_CONTENT,
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: "dist-landing",
    emptyOutDir: true,
    sourcemap: process.env.VITE_SOURCEMAP === "true",
    rollupOptions: {
      input: path.resolve(__dirname, "landing.html"),
    },
  },
});
