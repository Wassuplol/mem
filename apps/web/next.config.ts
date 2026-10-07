import path from "node:path";
import type { NextConfig } from "next";

// monorepo: load the shared root .env (single source of truth for web + bot + db)
try {
  process.loadEnvFile(path.resolve(process.cwd(), "../../.env"));
} catch {
  // no root .env (CI / production env vars come from the platform)
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // compile workspace TS packages with the app (they ship as source)
  transpilePackages: ["@mem/db"],
};

export default nextConfig;
