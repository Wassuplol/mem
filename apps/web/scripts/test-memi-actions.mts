import { parseActions } from "../src/lib/memi-actions.ts";

const cases: Array<{ in: string; wantActions: number; wantHref?: string; wantLabel?: string; cleanMustNotInclude?: string }> = [
  { in: "Hi! I can help. [[action:/dashboard]]", wantActions: 1, wantHref: "/dashboard", wantLabel: "Open the dashboard", cleanMustNotInclude: "[[" },
  { in: "Check this [[action:/servers|Show me my servers]]", wantActions: 1, wantHref: "/servers", wantLabel: "Show me my servers", cleanMustNotInclude: "[[" },
  { in: "[[action:/dashboard|]]", wantActions: 1, wantLabel: "Open the dashboard" },
  { in: "[[action: /docs/api ]]", wantActions: 1, wantHref: "/docs/api", wantLabel: "Open the API docs" },
  { in: "evil [[action:https://evil.com|click]] nope", wantActions: 0, cleanMustNotInclude: "[[action" },
  { in: "broken [[action:/x|a]] [[action:/x|b]]", wantActions: 1 },
  { in: "no tokens here", wantActions: 0 },
  { in: "trailing\n\n[[action:/dashboard]]\n\n", wantActions: 1, cleanMustNotInclude: "[[" },
];

let pass = 0;
for (const c of cases) {
  const { clean, actions } = parseActions(c.in);
  const ok =
    actions.length === c.wantActions &&
    (c.wantHref ? actions[0]?.href === c.wantHref : true) &&
    (c.wantLabel ? actions[0]?.label === c.wantLabel : true) &&
    (c.cleanMustNotInclude ? !clean.includes(c.cleanMustNotInclude) : true) &&
    !clean.includes("[[action");
  console.log(ok ? "PASS" : "FAIL", JSON.stringify(c.in), "->", JSON.stringify({ clean, actions }));
  if (ok) pass += 1;
}
console.log(`${pass}/${cases.length} ${pass === cases.length ? "ALL PASS" : "SOME FAILED"}`);
if (pass !== cases.length) process.exitCode = 1;
