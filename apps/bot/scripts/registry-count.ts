import "../src/lib/env";
import { registry } from "../src/registry";

console.log(
  `${registry.commands().length} commands / ${registry.list().length} modules / ${registry.events().length} events / ${registry.components().length} components`,
);
process.exit(0);
