import { z } from "zod";

/** Set instead of the ISO date when the source date is imprecise, like `ABT 1900`. */
const rawDateSchema = z.string().optional();

/** The contract for `data.json`. `schema/data.schema.json` is generated from it. */
export const exportSchema = z
  .strictObject({
    families: z.array(
      z.strictObject({
        children: z.array(z.string()),
        id: z.string(),
        marriage: z.iso.date().optional(),
        marriageRaw: rawDateSchema,
        parents: z.array(z.string()),
      })
    ),
    individuals: z.array(
      z.strictObject({
        birth: z.iso.date().optional(),
        birthRaw: rawDateSchema,
        death: z.iso.date().optional(),
        deathRaw: rawDateSchema,
        headOfFamilies: z.array(z.string()),
        id: z.string(),
        name: z.string(),
        sex: z.string().optional(),
      })
    ),
  })
  .meta({
    description: "Transformierte GEDCOM-Daten, exportiert als data.json.",
    title: "postprocess-gedcom export",
  });

export const exportJsonSchema = () => z.toJSONSchema(exportSchema);
