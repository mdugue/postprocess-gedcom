import { describe, expect, test } from "bun:test";

import { parseGedcom } from "@/lib/gedcom";
import { GEDCOM_FIXTURE, toBuffer } from "@/test/fixture";

describe("parseGedcom", () => {
  const gedcom = parseGedcom(toBuffer(GEDCOM_FIXTURE));

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
    expect(bernd?.birthRaw).toBe("1950");
    expect(anna?.birthRaw).toBeUndefined();
    expect(bernd?.death?.getDate()).toBe(7);
  });

  test("links families to parents and children", () => {
    const family = gedcom.familiesById.get("1");
    expect(family?.parents).toEqual(["2", "1"]);
    expect(family?.children).toEqual(["3"]);
    expect(family?.marriage?.getFullYear()).toBe(1975);
  });

  test("rejects files without any records", () => {
    expect(() => parseGedcom(toBuffer(""))).toThrow();
    expect(() => parseGedcom(toBuffer("0 HEAD\n0 TRLR\n"))).toThrow(
      "keine Personen oder Familien"
    );
  });

  test("rejects malformed records instead of dropping them", () => {
    expect(() =>
      parseGedcom(
        toBuffer(
          "0 HEAD\n0 INDI\n1 NAME Ohne /Id/\n0 @I2@ INDI\n1 NAME Mit /Id/\n0 TRLR\n"
        )
      )
    ).toThrow("ohne ID");
  });

  test("ignores NUL padding from Family Tree Maker", () => {
    const { individuals } = parseGedcom(
      toBuffer(
        "0 HEAD\n0 @I1@ INDI\n1 NAME Anna /Muster/\n1 TITL Graf\0\0\0\n1 SEX W\n0 TRLR\n"
      )
    );

    expect(individuals[0]?.name).toBe("Anna Muster");
    expect(individuals[0]?.sex).toBe("W");
  });

  test("keeps NUL bytes that belong to UTF-16 text", () => {
    const source = "\uFEFF0 HEAD\n0 @I1@ INDI\n1 NAME Anna /Muster/\n0 TRLR\n";

    const utf16 = Uint16Array.from(source, (char) => char.codePointAt(0) ?? 0);

    expect(parseGedcom(utf16.buffer).individuals[0]?.name).toBe("Anna Muster");
  });

  test("reads files in older encodings", () => {
    const source =
      "0 HEAD\n1 CHAR ANSI\n0 @I1@ INDI\n1 NAME Jürgen /Müller/\n0 TRLR\n";

    const windows1252 = Uint8Array.from(
      source,
      (char) => char.codePointAt(0) ?? 0
    );

    expect(parseGedcom(windows1252.buffer).individuals[0]?.name).toBe(
      "Jürgen Müller"
    );
  });
});
