import type { Client } from "discord.js";
import { services } from "./services";

/**
 * Durable task scheduler: modules register handlers for task kinds, and one
 * 30s scan drains due rows from Postgres. Tasks survive restarts; nothing is
 * cached in memory, so RAM stays flat.
 */
export type TaskHandler = (payload: Record<string, unknown>, client: Client) => Promise<void>;

const handlers = new Map<string, TaskHandler>();

/** Called at module load by the feature that owns the task kind. */
export function registerTaskHandler(kind: string, handler: TaskHandler): void {
  handlers.set(kind, handler);
}

const SCAN_INTERVAL_MS = 30_000;
const SCAN_BATCH = 25;
const PURGE_EVERY_TICKS = 120; // ~1 hour
const RETENTION_DAYS = 30;

let timer: ReturnType<typeof setInterval> | null = null;
let ticks = 0;

async function drainDue(client: Client): Promise<void> {
  try {
    const due = await services.listDueTasks(SCAN_BATCH);
    for (const task of due) {
      const handler = handlers.get(task.kind);
      if (!handler) {
        await services.markTaskFailed(task.id, `No handler registered for kind "${task.kind}"`);
        continue;
      }
      try {
        await handler(task.payload ?? {}, client);
        await services.markTaskDone(task.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[mem] scheduler: task ${task.kind}/${task.id} failed:`, error);
        await services.markTaskFailed(task.id, message);
      }
    }
  } catch (error) {
    console.error("[mem] scheduler scan failed:", error);
  }
}

/** Starts the single scan interval; safe to call once on ClientReady. */
export function startScheduler(client: Client): void {
  if (timer) return;
  void drainDue(client); // catch anything that came due while offline
  timer = setInterval(() => {
    void drainDue(client);
    if (++ticks % PURGE_EVERY_TICKS === 0) {
      void services
        .purgeTasks(RETENTION_DAYS)
        .catch((error) => console.warn("[mem] scheduler purge failed:", error));
    }
  }, SCAN_INTERVAL_MS);
  console.log(`[mem] scheduler: scan every ${SCAN_INTERVAL_MS / 1_000}s (batch ${SCAN_BATCH}, ${handlers.size} kind(s))`);
}
