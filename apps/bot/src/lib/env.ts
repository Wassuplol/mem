import { existsSync } from "node:fs";
import { resolve } from "node:path";

// monorepo: read the shared root .env (works from apps/bot and from the repo root).
// This module MUST be the first import of any entrypoint.
for (const candidate of [resolve(".env"), resolve("../../.env")]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}
