export interface MemiAction {
  href: string;
  label: string;
}

/**
 * Action tokens are how Memi suggests navigation, e.g.
 *   [[action:/servers|Show me my servers]]
 *
 * The label part is optional - models sometimes drop it (`[[action:/dashboard]]`).
 * We fall back to a sensible default label per page and scrub any malformed
 * leftovers, so raw tokens never leak into the chat UI.
 */
const ACTION_RE = /\[\[\s*action\s*:\s*([^\]|]+?)\s*(?:\|\s*([^\]]*?)\s*)?\]\]/g;
const STRAY_RE = /\[\[\s*action[^\]]*\]\]/gi;

const DEFAULT_LABELS: Record<string, string> = {
  "/": "Back home",
  "/dashboard": "Open the dashboard",
  "/servers": "Show me my servers",
  "/docs/api": "Open the API docs",
};

export function parseActions(text: string): { clean: string; actions: MemiAction[] } {
  const actions: MemiAction[] = [];
  const clean = text
    .replace(ACTION_RE, (_all: string, rawHref: string, rawLabel?: string) => {
      const href = String(rawHref ?? "").trim();
      if (!href.startsWith("/")) return ""; // only same-site paths are navigable
      if (actions.some((a) => a.href === href)) return "";
      const label = String(rawLabel ?? "").trim() || DEFAULT_LABELS[href] || `Open ${href}`;
      actions.push({ href, label });
      return "";
    })
    .replace(STRAY_RE, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, actions };
}
