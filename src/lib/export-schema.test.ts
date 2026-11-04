import { describe, expect, test } from "bun:test";

import { exportJsonSchema, exportSchema } from "@/lib/export-schema";

describe("export schema", () => {
  test("matches the committed JSON Schema", async () => {
    const committed: unknown = await Bun.file("schema/data.schema.json").json();

    expect(committed).toEqual(exportJsonSchema());
  });

  test("rejects data outside the contract", () => {
    const individual = { headOfFamilies: [], id: "1", name: "Anna" };

    expect(
      exportSchema.safeParse({ families: [], individuals: [individual] })
        .success
    ).toBe(true);
    expect(
      exportSchema.safeParse({
        families: [],
        individuals: [{ ...individual, birth: "1950" }],
      }).success
    ).toBe(false);
    expect(
      exportSchema.safeParse({
        families: [],
        individuals: [{ ...individual, extra: true }],
      }).success
    ).toBe(false);
  });
});
