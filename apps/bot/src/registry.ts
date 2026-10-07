import { ModuleRegistry } from "@mem/core";
import { giveawaysModule } from "./modules/giveaways";
import { helpModule } from "./modules/help";
import { loggingModule } from "./modules/logging";
import { moderationModule } from "./modules/moderation";
import { pingModule } from "./modules/ping";
import { pollsModule } from "./modules/polls";
import { remindersModule } from "./modules/reminders";
import { rolesModule } from "./modules/roles";
import { temprolesModule } from "./modules/temproles";
import { utilityModule } from "./modules/utility";
import { welcomeModule } from "./modules/welcome";

export const registry = new ModuleRegistry();
for (const feature of [
  pingModule,
  moderationModule,
  utilityModule,
  loggingModule,
  welcomeModule,
  helpModule,
  pollsModule,
  rolesModule,
  remindersModule,
  giveawaysModule,
  temprolesModule,
]) {
  registry.register(feature);
}
