import { describe, expect, test } from "bun:test";

import {
  canBeChildIn,
  canBeParentIn,
  createLinkGraph,
} from "@/lib/family-links";
import type { LinkedFamily } from "@/lib/family-links";
import { parseGedcom } from "@/lib/gedcom";
import { familyLinkWarnings, personChoices } from "@/lib/link-options";
import { emptyTransformations } from "@/lib/transformations";
import { toBuffer } from "@/test/fixture";

// Oma (1) → Vater (2) → Kind (3), plus an unrelated Gast (4).
const TREE = `0 HEAD
0 @I1@ INDI
1 NAME Oma /Test/
1 BIRT
2 DATE 1 JAN 1920
0 @I2@ INDI
1 NAME Vater /Test/
1 BIRT
2 DATE 1 JAN 1950
0 @I3@ INDI
1 NAME Kind /Test/
1 BIRT
2 DATE 1 JAN 1980
0 @I4@ INDI
1 NAME Gast /Test/
1 BIRT
2 DATE 1 JAN 1990
0 @F1@ FAM
1 WIFE @I1@
1 CHIL @I2@
0 @F2@ FAM
1 HUSB @I2@
1 CHIL @I3@
0 TRLR
`;

const gedcom = parseGedcom(toBuffer(TREE));
const graph = createLinkGraph(gedcom, emptyTransformations);

const familyOf = (id: string): LinkedFamily => {
  const family = graph.familiesById.get(id);

  if (!family) {
    throw new Error(`Familie ${id} fehlt`);
  }

  return family;
};

describe("link rules", () => {
  test("finds ancestors and descendants", () => {
    expect([...graph.ancestors("3")].toSorted()).toEqual(["1", "2"]);
    expect([...graph.descendants("1")].toSorted()).toEqual(["2", "3"]);
  });

  test("a child cannot become a parent of its own ancestors", () => {
    expect(canBeParentIn(graph, "3", familyOf("1"))).toBe(false);
    expect(canBeParentIn(graph, "4", familyOf("1"))).toBe(true);
  });

  test("an ancestor cannot become a child of a descendant", () => {
    expect(canBeChildIn(graph, "1", familyOf("2"))).toBe(false);
    expect(canBeChildIn(graph, "4", familyOf("2"))).toBe(true);
  });

  test("a family keeps at most two parents", () => {
    const full = createLinkGraph(gedcom, {
      families: {
        "2": { data: { parents: ["2", "4"] }, hint: "", type: "update" },
      },
      individuals: {},
    });

    const family = full.familiesById.get("2");

    expect(family && canBeParentIn(full, "1", family)).toBe(false);
    expect(
      family &&
        personChoices(full, gedcom, family, "parents").map(({ id }) => id)
    ).toEqual(["2", "4"]);
  });

  test("deleted people are not offered", () => {
    const withDeleted = createLinkGraph(gedcom, {
      families: {},
      individuals: { "4": { hint: "", type: "delete" } },
    });

    const family = withDeleted.familiesById.get("2");

    expect(
      family &&
        personChoices(withDeleted, gedcom, family, "children").some(
          ({ id }) => id === "4"
        )
    ).toBe(false);
  });
});

describe("link warnings", () => {
  test("warns about a child born before a parent and a second family", () => {
    const transformations = {
      families: {
        "2": {
          data: { children: ["3", "1"] },
          hint: "",
          type: "update" as const,
        },
      },
      individuals: {},
    };

    const warnings = familyLinkWarnings(
      createLinkGraph(gedcom, transformations),
      gedcom,
      transformations,
      "2"
    );

    expect(warnings).toEqual(["Oma Test ist vor Vater Test geboren."]);
  });
});
