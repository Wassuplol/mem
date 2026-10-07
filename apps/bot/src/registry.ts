import { ModuleRegistry } from "@mem/core";
import { moderationModule } from "./modules/moderation";
import { pingModule } from "./modules/ping";
import { utilityModule } from "./modules/utility";

export const registry = new ModuleRegistry();
for (const feature of [pingModule, moderationModule, utilityModule]) {
  registry.register(feature);
}
