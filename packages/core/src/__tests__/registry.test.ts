import { describe, expect, it } from "vitest";
import { defineModule, ModuleRegistry, type SlashCommand } from "../index";

const fakeCommand = (name: string): SlashCommand => ({
  data: { name } as never,
  execute: async () => undefined,
});

describe("defineModule", () => {
  it("returns the same manifest (identity helper)", () => {
    const manifest = { id: "x", name: "X", version: "0.0.1" };
    expect(defineModule(manifest)).toBe(manifest);
  });
});

describe("ModuleRegistry", () => {
  it("registers modules and lists them in insertion order", () => {
    const registry = new ModuleRegistry();
    registry.register(defineModule({ id: "a", name: "A", version: "0.0.1" }));
    registry.register(defineModule({ id: "b", name: "B", version: "0.0.1" }));
    expect(registry.list().map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("throws on duplicate module ids", () => {
    const registry = new ModuleRegistry();
    registry.register(defineModule({ id: "dup", name: "Dup", version: "0.0.1" }));
    expect(() =>
      registry.register(defineModule({ id: "dup", name: "Dup2", version: "0.0.1" })),
    ).toThrow(/Duplicate module id/);
  });

  it("flattens commands across modules and skips modules without commands", () => {
    const registry = new ModuleRegistry();
    registry.register(
      defineModule({
        id: "m1",
        name: "M1",
        version: "0.0.1",
        commands: [fakeCommand("one"), fakeCommand("two")],
      }),
    );
    registry.register(defineModule({ id: "m2", name: "M2", version: "0.0.1" }));
    expect(registry.commands().map((c) => c.data.name)).toEqual(["one", "two"]);
  });

  it("flattens module events", () => {
    const registry = new ModuleRegistry();
    registry.register(
      defineModule({
        id: "ev",
        name: "Ev",
        version: "0.0.1",
        events: [{ name: "guildCreate", execute: async () => undefined }],
      }),
    );
    expect(registry.events().map((e) => e.name)).toEqual(["guildCreate"]);
  });
});
