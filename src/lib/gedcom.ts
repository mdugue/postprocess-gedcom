import { isValid, parse as parseDate } from "date-fns";
import { compact, parse } from "parse-gedcom";
import { z } from "zod";

const GEDCOM_DATE_FORMAT = "d LLL y";
const referenceDate = new Date();

const xrefSchema = (prefix: "@F" | "@I") =>
  z.string().transform((value) => value.replace(prefix, "").replace("@", ""));

/**
 * GEDCOM dates can be imprecise (`1950`, `ABT 1900`). Those have no exact date,
 * so the source text is kept to show and export instead of losing it.
 */
const dateSchema = z
  .string()
  .default("")
  .transform((value) => {
    const date = parseDate(value, GEDCOM_DATE_FORMAT, referenceDate);

    return isValid(date)
      ? { date, raw: undefined }
      : { date: undefined, raw: value === "" ? undefined : value };
  });

const individualNodeSchema = z
  .object({
    data: z.object({
      "+@FAMILY_SPOUSE": z.array(xrefSchema("@F")).default([]),
      "@FAMILY_SPOUSE": xrefSchema("@F").optional(),
      "BIRTH/DATE": dateSchema,
      "DEATH/DATE": dateSchema,
      NAME: z.string().default(""),
      SEX: z.string().optional(),
      xref_id: xrefSchema("@I"),
    }),
    type: z.literal("INDI"),
  })
  .transform(({ data }) => {
    const name = data.NAME.replaceAll("/", "");

    return {
      birth: data["BIRTH/DATE"].date,
      birthRaw: data["BIRTH/DATE"].raw,
      death: data["DEATH/DATE"].date,
      deathRaw: data["DEATH/DATE"].raw,
      headOfFamilies: [
        data["@FAMILY_SPOUSE"],
        ...data["+@FAMILY_SPOUSE"],
      ].filter((id) => id !== undefined),
      id: data.xref_id,
      name: name === "" ? "no name" : name,
      sex: data.SEX,
    };
  });

const familyNodeSchema = z
  .object({
    data: z.object({
      "+@CHILD": z.array(xrefSchema("@I")).default([]),
      "@CHILD": xrefSchema("@I").optional(),
      "@HUSBAND": xrefSchema("@I").optional(),
      "@WIFE": xrefSchema("@I").optional(),
      "MARRIAGE/DATE": dateSchema,
      xref_id: xrefSchema("@F"),
    }),
    type: z.literal("FAM"),
  })
  .transform(({ data }) => ({
    children: [data["@CHILD"], ...data["+@CHILD"]].filter(
      (id) => id !== undefined
    ),
    id: data.xref_id,
    marriage: data["MARRIAGE/DATE"].date,
    marriageRaw: data["MARRIAGE/DATE"].raw,
    parents: [data["@HUSBAND"], data["@WIFE"]].filter((id) => id !== undefined),
  }));

const compactRootSchema = z.object({
  children: z.array(z.looseObject({ type: z.string() })),
});

/** Fails on malformed records, since skipping them would drop them from the export. */
const parseRecords = <T extends z.ZodType>(schema: T, records: unknown[]) => {
  const result = z.array(schema).safeParse(records);

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
};

export type Individual = z.output<typeof individualNodeSchema>;

export type Family = z.output<typeof familyNodeSchema>;

export interface Gedcom {
  families: Family[];
  familiesById: ReadonlyMap<string, Family>;
  individuals: Individual[];
  individualsById: ReadonlyMap<string, Individual>;
}

export const parseGedcom = (source: string): Gedcom => {
  const { children } = compactRootSchema.parse(compact(parse(source)));

  const individuals = parseRecords(
    individualNodeSchema,
    children.filter(({ type }) => type === "INDI")
  );

  const families = parseRecords(
    familyNodeSchema,
    children.filter(({ type }) => type === "FAM")
  );

  // A loaded GEDCOM replaces the drop target, so an empty one would be a dead end.
  if (individuals.length === 0 && families.length === 0) {
    throw new Error("Die Datei enthält keine Personen oder Familien.");
  }

  return {
    families,
    familiesById: new Map(families.map((family) => [family.id, family])),
    individuals,
    individualsById: new Map(
      individuals.map((individual) => [individual.id, individual])
    ),
  };
};
