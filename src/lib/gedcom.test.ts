import { describe, expect, test } from "bun:test";

import { parseGedcom } from "@/lib/gedcom";
import { GEDCOM_FIXTURE } from "@/test/fixture";

describe("parseGedcom", () => {
  const gedcom = parseGedcom(GEDCOM_FIXTURE);

  test("reads individuals with normalized ids and names", () => {
    expect(gedcom.individuals.map(({ id, name }) => [id, name])).toEqual([
      ["1", "Anna Muster"],
      ["2", "Bernd Muster"],
      ["3", "Clara Muster"],
    ]);
    expect(gedcom.individualsById.get("1")?.headOfFamilies).toEqual(["1"]);
  });

  test("parses full dates and drops incomplete ones", () => {
    const anna = gedcom.individualsById.get("1");
    const bernd = gedcom.individualsById.get("2");
    expect(anna?.birth?.getFullYear()).toBe(1950);
    expect(anna?.birth?.getMonth()).toBe(2);
    expect(bernd?.birth).toBeUndefined();
    expect(bernd?.death?.getDate()).toBe(7);
  });

  test("links families to parents and children", () => {
    const family = gedcom.familiesById.get("1");
    expect(family?.parents).toEqual(["2", "1"]);
    expect(family?.children).toEqual(["3"]);
    expect(family?.marriage?.getFullYear()).toBe(1975);
  });

  test("rejects files without any records", () => {
    expect(() => parseGedcom("")).toThrow("keine Personen oder Familien");
    expect(() => parseGedcom("0 HEAD\n0 TRLR\n")).toThrow(
      "keine Personen oder Familien"
    );
  });

  test("rejects malformed records instead of dropping them", () => {
    expect(() =>
      parseGedcom("0 INDI\n1 NAME Ohne /Id/\n0 @I2@ INDI\n1 NAME Mit /Id/\n")
    ).toThrow("xref_id");
  });
});
