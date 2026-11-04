import { isValid, parse as parseDate } from "date-fns";
import { compact, parse } from "parse-gedcom";
import { z } from "zod";

const GEDCOM_DATE_FORMAT = "d LLL y";
const referenceDate = new Date();

const xrefSchema = (prefix: "@F" | "@I") =>
  z.string().transform((value) => value.replace(prefix, "").replace("@", ""));

/** GEDCOM dates can be partial (`1950`); only complete dates are kept. */
const dateSchema = z
  .string()
  .default("")
  .transform((value) => {
    const date = parseDate(value, GEDCOM_DATE_FORMAT, referenceDate);

    return isValid(date) ? date : undefined;
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
      birth: data["BIRTH/DATE"],
      death: data["DEATH/DATE"],
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
    marriage: data["MARRIAGE/DATE"],
    parents: [data["@HUSBAND"], data["@WIFE"]].filter((id) => id !== undefined),
  }));

const compactRootSchema = z.object({ children: z.array(z.unknown()) });

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

  // Each schema only matches its own record type, so other nodes are skipped.
  const individuals = children.flatMap((child) => {
    const node = individualNodeSchema.safeParse(child);

    return node.success ? [node.data] : [];
  });

  const families = children.flatMap((child) => {
    const node = familyNodeSchema.safeParse(child);

    return node.success ? [node.data] : [];
  });

  return {
    families,
    familiesById: new Map(families.map((family) => [family.id, family])),
    individuals,
    individualsById: new Map(
      individuals.map((individual) => [individual.id, individual])
    ),
  };
};
