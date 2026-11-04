import { describe, expect, test } from "bun:test";

import { parseGedcom } from "@/lib/gedcom";
import {
  buildExport,
  emptyTransformations,
  matchesTransformation,
  mergeUpdate,
  omitKey,
  parseDisplayDate,
  parseTransformationFile,
  toIsoDate,
} from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";
import { GEDCOM_FIXTURE } from "@/test/fixture";

const gedcom = parseGedcom(GEDCOM_FIXTURE);

describe("buildExport", () => {
  test("formats dates and keeps untouched records", () => {
    const { families, individuals } = buildExport(gedcom, emptyTransformations);
    expect(individuals).toHaveLength(3);
    expect(individuals[0]?.birth).toBe("1950-03-03");
    expect(individuals[1]?.birth).toBeUndefined();
    expect(families[0]?.marriage).toBe("1975-06-12");
  });

  test("applies updates and removes deleted people from families", () => {
    const transformations: Transformations = {
      families: {},
      individuals: {
        "1": { data: { name: "Anna Beispiel" }, hint: "", type: "update" },
        "3": { hint: "", type: "delete" },
      },
    };

    const { families, individuals } = buildExport(gedcom, transformations);
    expect(individuals.map(({ name }) => name)).toEqual([
      "Anna Beispiel",
      "Bernd Muster",
    ]);
    expect(families[0]?.children).toEqual([]);
  });

  test("applies edited and cleared person dates", () => {
    const { individuals } = buildExport(gedcom, {
      families: {},
      individuals: {
        "1": { data: { birth: null }, hint: "", type: "update" },
        "2": { data: { birth: "1950-02-01" }, hint: "", type: "update" },
      },
    });

    expect(individuals[0]?.birth).toBeUndefined();
    expect(individuals[1]?.birth).toBe("1950-02-01");
    expect(individuals[1]?.death).toBe("2001-07-07");
  });

  test("clears a marriage date and removes deleted families", () => {
    const cleared = buildExport(gedcom, {
      families: { "1": { data: { marriage: null }, hint: "", type: "update" } },
      individuals: {},
    });

    expect(cleared.families[0]?.marriage).toBeUndefined();

    const deleted = buildExport(gedcom, {
      families: { "1": { hint: "", type: "delete" } },
      individuals: {},
    });

    expect(deleted.families).toEqual([]);
  });
});

describe("parseTransformationFile", () => {
  test("defaults missing sections", () => {
    expect(parseTransformationFile("{}")).toEqual(emptyTransformations);
  });

  test("round-trips a saved file", () => {
    const saved: Transformations = {
      families: {
        "1": { data: { marriage: "2000-01-01" }, hint: "x", type: "update" },
      },
      individuals: { "2": { hint: "y", type: "delete" } },
    };

    expect(parseTransformationFile(JSON.stringify(saved))).toEqual(saved);
  });

  test("drops reference fields from older files", () => {
    const { individuals } = parseTransformationFile(
      JSON.stringify({
        individuals: {
          "1": {
            data: { headOfFamilies: "9", id: "9", name: "Anna" },
            hint: "",
            type: "update",
          },
        },
      })
    );

    expect(individuals["1"]).toEqual({
      data: { name: "Anna" },
      hint: "",
      type: "update",
    });
  });

  test("rejects invalid dates", () => {
    expect(() =>
      parseTransformationFile(
        '{"families":{"1":{"data":{"marriage":"gestern"},"hint":"","type":"update"}}}'
      )
    ).toThrow("families");
  });

  test("rejects invalid files", () => {
    expect(() => parseTransformationFile("[]")).toThrow();
    expect(() => parseTransformationFile("not json")).toThrow();
    expect(() =>
      parseTransformationFile('{"individuals":{"1":{"type":"rename"}}}')
    ).toThrow("individuals");
  });
});

describe("helpers", () => {
  test("parseDisplayDate accepts only complete, real dates", () => {
    expect(toIsoDate(parseDisplayDate("03.03.1950"))).toBe("1950-03-03");
    expect(toIsoDate(parseDisplayDate("3.3.1712"))).toBe("1712-03-03");

    for (const text of ["", "03.03.", "01.01.19", "31.02.1950", "abc"]) {
      expect(parseDisplayDate(text)).toBeUndefined();
    }
  });

  test("matchesTransformation searches everything a card shows", () => {
    const entry = {
      changes: [{ field: "name", from: "Anna", to: "Hanna" }],
      hint: "Anna, 1950",
      id: "7",
      kind: "Person",
      title: "Anna Muster",
      type: "update" as const,
    };

    for (const query of ["muster", "HANNA", "7", "änderung", " person "]) {
      expect(matchesTransformation(entry, query)).toBe(true);
    }

    expect(matchesTransformation(entry, "löschen")).toBe(false);
  });

  test("mergeUpdate keeps earlier edits and replaces a delete", () => {
    const first = mergeUpdate<Record<string, string>>(
      undefined,
      { a: "1" },
      "h"
    );

    expect(mergeUpdate(first, { b: "2" }, "h")).toEqual({
      data: { a: "1", b: "2" },
      hint: "h",
      type: "update",
    });
    expect(
      mergeUpdate<Record<string, string>>(
        { hint: "h", type: "delete" },
        { b: "2" },
        "h"
      )
    ).toEqual({ data: { b: "2" }, hint: "h", type: "update" });
  });

  test("omitKey removes only the given key", () => {
    expect(omitKey({ a: 1, b: 2 }, "a")).toEqual({ b: 2 });
  });
});
