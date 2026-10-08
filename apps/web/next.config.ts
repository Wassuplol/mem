import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// monorepo: load the shared root .env (single source of truth for web + bot + db)
const rootEnv = path.resolve(process.cwd(), "../../.env");
try {
  process.loadEnvFile(rootEnv);
} catch {
  // no root .env (CI / production env vars come from the platform)
}
// The host shell can inject a FOREIGN DISCORD_TOKEN (another app's token) which
// would shadow ours — force the repo .env value so the web server always talks
// to THIS bot. Production deployments without a .env keep platform env vars.
if (existsSync(rootEnv)) {
  const match = /^DISCORD_TOKEN\s*=\s*(.+)$/m.exec(readFileSync(rootEnv, "utf8"));
  if (match?.[1]) process.env.DISCORD_TOKEN = match[1].trim().replace(/^["']|["']$/g, "");
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
