import type {
  AnySelectMenuInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  ModalSubmitInteraction,
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
  registry: ModuleRegistry;
}

/** A single slash command owned by a module. */
export interface SlashCommand {
  data: AnySlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction, ctx: ModuleContext): Promise<void>;
  /** Optional type-to-search support for string options. */
  autocomplete?(interaction: AutocompleteInteraction, ctx: ModuleContext): Promise<void>;
}

/** UI interactions a module can own (buttons, selects, modals). */
export type ComponentInteraction = ButtonInteraction | AnySelectMenuInteraction | ModalSubmitInteraction;

/** A handler for UI interactions, matched by customId prefix (e.g. "poll:"). */
export interface ComponentHandler {
  /** customId prefix this handler owns; first matching module wins. */
  customIdPrefix: string;
  execute(interaction: ComponentInteraction, ctx: ModuleContext): Promise<void>;
}

/**
 * A gateway event subscription owned by a module.
 * The mapped union keeps `name` and `execute` args paired (type-safe events).
 */
export type ModuleEvent = {
  [K in keyof ClientEvents]: {
    name: K;
    once?: boolean;
    execute: (...args: [...ClientEvents[K], ModuleContext]) => Promise<void> | void;
  };
}[keyof ClientEvents];

/**
 * Manifest describing one feature module.
 * Later phases extend this with jobs, settings schemas and dashboard pages.
 */
export interface ModuleManifest {
  id: string;
  name: string;
  version: string;
  commands?: SlashCommand[];
  events?: ModuleEvent[];
  components?: ComponentHandler[];
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

  events(): ModuleEvent[] {
    return this.list().flatMap((m) => m.events ?? []);
  }

  components(): ComponentHandler[] {
    return this.list().flatMap((m) => m.components ?? []);
  }
}
