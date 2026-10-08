import { ModuleRegistry } from "@mem/core";
import { apikeysModule } from "./modules/apikeys";
import { giveawaysModule } from "./modules/giveaways";
import { helpModule } from "./modules/help";
import { levelingModule } from "./modules/leveling";
import { loggingModule } from "./modules/logging";
import { moderationModule } from "./modules/moderation";
import { modtoolsModule } from "./modules/modtools";
import { pingModule } from "./modules/ping";
import { pollsModule } from "./modules/polls";
import { remindersModule } from "./modules/reminders";
import { rolesModule } from "./modules/roles";
import { temprolesModule } from "./modules/temproles";
import { automodModule } from "./modules/automod";
import { musicModule } from "./modules/music";
import { securityModule } from "./modules/security";
import { ticketsModule } from "./modules/tickets";
import { verificationModule } from "./modules/verification";
import { utilityModule } from "./modules/utility";
import { welcomeModule } from "./modules/welcome";

export const registry = new ModuleRegistry();
for (const feature of [
  pingModule,
  moderationModule,
  modtoolsModule,
  utilityModule,
  loggingModule,
  welcomeModule,
  helpModule,
  pollsModule,
  rolesModule,
  remindersModule,
  giveawaysModule,
  temprolesModule,
  apikeysModule,
  levelingModule,
  ticketsModule,
  securityModule,
  automodModule,
  verificationModule,
  musicModule,
]) {
  registry.register(feature);
}
