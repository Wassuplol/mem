import type {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

/** Any of the builder shapes discord.js accepts for application commands. */
export type AnySlashCommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

/** Runtime context passed to every command execution. */
export interface ModuleContext {
  client: Client;
}

/** A single slash command owned by a module. */
export interface SlashCommand {
  data: AnySlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction, ctx: ModuleContext): Promise<void>;
}

/**
 * Manifest describing one feature module.
 * Later phases extend this with events, jobs, settings schemas and dashboard pages.
 */
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  commands?: SlashCommand[];
}

/** Identity helper for consistency + inference. */
export function defineModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}

/** Collects modules and answers registry queries for the kernel. */
export class ModuleRegistry {
  #modules = new Map<string, ModuleManifest>();

  register(module: ModuleManifest): void {
    if (this.#modules.has(module.id)) {
      throw new Error(`Duplicate module id: "${module.id}"`);
    }
    this.#modules.set(module.id, module);
  }

  list(): ModuleManifest[] {
    return [...this.#modules.values()];
  }

  commands(): SlashCommand[] {
    return this.list().flatMap((m) => m.commands ?? []);
  }
}
