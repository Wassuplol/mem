import { ModuleRegistry } from "@mem/core";
import { helpModule } from "./modules/help";
import { loggingModule } from "./modules/logging";
import { moderationModule } from "./modules/moderation";
import { pingModule } from "./modules/ping";
import { utilityModule } from "./modules/utility";
import { welcomeModule } from "./modules/welcome";

export const registry = new ModuleRegistry();
for (const feature of [pingModule, moderationModule, utilityModule, loggingModule, welcomeModule, helpModule]) {
  registry.register(feature);
}
