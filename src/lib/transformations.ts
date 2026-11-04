import { format, isValid, parse } from "date-fns";
import { z } from "zod";

import type { Family, Gedcom, Individual } from "@/lib/gedcom";

const ISO_DATE_FORMAT = "yyyy-MM-dd";
const DISPLAY_DATE_FORMAT = "dd.MM.yyyy";
const DISPLAY_DATE_INPUT_FORMAT = "d.M.yyyy";
const COMPLETE_DISPLAY_DATE = /^\d{1,2}\.\d{1,2}\.\d{4}$/u;
const NO_VALUE = "—";

export type EntryTransform<T> =
  | { hint: string; type: "delete" }
  | { data: T; hint: string; type: "update" };

const entryTransformSchema = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion("type", [
    z.object({ hint: z.string(), type: z.literal("delete") }),
    z.object({ data, hint: z.string(), type: z.literal("update") }),
  ]);

/**
 * Only plain attributes are editable; `null` clears a date. IDs and family links are references
 * between records, so any other key in an older file is dropped on import.
 */
const individualUpdateSchema = z.object({
  birth: z.iso.date().nullish(),
  death: z.iso.date().nullish(),
  name: z.string().optional(),
  sex: z.string().optional(),
});

const familyUpdateSchema = z.object({ marriage: z.iso.date().nullish() });

const transformationsSchema = z.object({
  families: z
    .record(z.string(), entryTransformSchema(familyUpdateSchema))
    .default({}),
  individuals: z
    .record(z.string(), entryTransformSchema(individualUpdateSchema))
    .default({}),
});

export type IndividualUpdate = z.infer<typeof individualUpdateSchema>;

export type FamilyUpdate = z.infer<typeof familyUpdateSchema>;

export type IndividualTransform = EntryTransform<IndividualUpdate>;

export type FamilyTransform = EntryTransform<FamilyUpdate>;

export type Transformations = z.infer<typeof transformationsSchema>;

export const emptyTransformations: Transformations = {
  families: {},
  individuals: {},
};

/** Throws a readable error when the content is not a transformation file. */
export const parseTransformationFile = (source: string): Transformations => {
  const result = transformationsSchema.safeParse(JSON.parse(source));

  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }

  return result.data;
};

export const mergeUpdate = <T extends object>(
  current: EntryTransform<T> | undefined,
  data: T,
  hint: string
): EntryTransform<T> => ({
  data: { ...(current?.type === "update" ? current.data : undefined), ...data },
  hint,
  type: "update",
});

export const omitKey = <T>(record: Record<string, T>, key: string) =>
  Object.fromEntries(
    Object.entries(record).filter(([candidate]) => candidate !== key)
  );

export const toDisplayDate = (date: Date) => format(date, DISPLAY_DATE_FORMAT);

/** Only complete input counts, so `01.01.19` does not become the year 19. */
export const parseDisplayDate = (text: string) => {
  const date = parse(text, DISPLAY_DATE_INPUT_FORMAT, new Date());

  return COMPLETE_DISPLAY_DATE.test(text) && isValid(date) ? date : undefined;
};

export const formatIsoDate = (date: Date) => format(date, ISO_DATE_FORMAT);

export const toIsoDate = (date: Date | undefined) =>
  date && formatIsoDate(date);

/** The edited date if the update touches it, otherwise the original one. */
export const effectiveDate = <K extends string>(
  update: Partial<Record<K, string | null>> | undefined,
  field: K,
  original: Date | undefined
) =>
  update && field in update
    ? (update[field] ?? undefined)
    : toIsoDate(original);

export interface FieldChange {
  field: string;
  from: string;
  to: string;
}

const displayValue = (value: string | null | undefined) =>
  value === null || value === undefined || value === "" ? NO_VALUE : value;

/** Lists the fields an update touches together with their previous values. */
export const describeChanges = <K extends string>(
  fields: readonly K[],
  previous: Partial<Record<K, string | undefined>> | undefined,
  data: Partial<Record<K, string | null>>
): FieldChange[] =>
  fields.flatMap((field) =>
    field in data
      ? [
          {
            field,
            from: displayValue(previous?.[field]),
            to: displayValue(data[field]),
          },
        ]
      : []
  );

const TYPE_LABELS = { delete: "Löschen", update: "Änderung" } as const;

/** Searches everything a transformation card shows, ignoring case. */
export const matchesTransformation = (
  entry: {
    changes: FieldChange[];
    hint: string;
    id: string;
    kind: string;
    title: string;
    type: keyof typeof TYPE_LABELS;
  },
  query: string
) =>
  [
    entry.title,
    entry.id,
    entry.kind,
    entry.hint,
    TYPE_LABELS[entry.type],
    ...entry.changes.flatMap(({ from, to }) => [from, to]),
  ]
    .join("\n")
    .toLowerCase()
    .includes(query.trim().toLowerCase());

const exportIndividual = (
  individual: Individual,
  transform: IndividualTransform | undefined,
  isFamilyDeleted: (id: string) => boolean
) => {
  const update = transform?.type === "update" ? transform.data : undefined;

  return {
    ...individual,
    ...update,
    birth: effectiveDate(update, "birth", individual.birth),
    death: effectiveDate(update, "death", individual.death),
    headOfFamilies: individual.headOfFamilies.filter(
      (id) => !isFamilyDeleted(id)
    ),
  };
};

const exportFamily = (
  family: Family,
  transform: FamilyTransform | undefined,
  isDeleted: (id: string) => boolean
) => ({
  ...family,
  children: family.children.filter((id) => !isDeleted(id)),
  marriage: effectiveDate(
    transform?.type === "update" ? transform.data : undefined,
    "marriage",
    family.marriage
  ),
  parents: family.parents.filter((id) => !isDeleted(id)),
});

/** Applies the transformations and removes references to deleted records. */
export const buildExport = (
  gedcom: Gedcom,
  { families, individuals }: Transformations
) => {
  const isDeleted = (id: string) => individuals[id]?.type === "delete";
  const isFamilyDeleted = (id: string) => families[id]?.type === "delete";

  return {
    families: gedcom.families.flatMap((family) =>
      isFamilyDeleted(family.id)
        ? []
        : [exportFamily(family, families[family.id], isDeleted)]
    ),
    individuals: gedcom.individuals.flatMap((individual) =>
      isDeleted(individual.id)
        ? []
        : [
            exportIndividual(
              individual,
              individuals[individual.id],
              isFamilyDeleted
            ),
          ]
    ),
  };
};

const downloadFile = (content: string, filename: string) => {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/json;charset=utf-8" })
  );

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const downloadAll = (
  gedcom: Gedcom,
  transformations: Transformations
) => {
  const now = new Date();
  const timestamp = `${now.toLocaleDateString()}-${now.toLocaleTimeString()}`;

  downloadFile(
    JSON.stringify(transformations),
    `transformations-${timestamp}.gedTransform`
  );
  downloadFile(
    JSON.stringify(buildExport(gedcom, transformations)),
    `data-${timestamp}.json`
  );
};
