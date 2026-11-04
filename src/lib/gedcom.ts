import { isValid, parse as parseDate } from "date-fns";
import { readGedcom } from "read-gedcom";

const GEDCOM_DATE_FORMAT = "d LLL y";
const referenceDate = new Date();

export interface Individual {
  birth: Date | undefined;
  birthRaw: string | undefined;
  death: Date | undefined;
  deathRaw: string | undefined;
  headOfFamilies: string[];
  id: string;
  name: string;
  sex: string | undefined;
}

export interface Family {
  children: string[];
  id: string;
  marriage: Date | undefined;
  marriageRaw: string | undefined;
  parents: string[];
}

export interface Gedcom {
  families: Family[];
  familiesById: ReadonlyMap<string, Family>;
  individuals: Individual[];
  individualsById: ReadonlyMap<string, Individual>;
}

type XrefPrefix = "@F" | "@I";

const stripXref = (prefix: XrefPrefix, value: string) =>
  value.replace(prefix, "").replace("@", "");

const stripXrefs = (prefix: XrefPrefix, values: string[]) =>
  values.map((value) => stripXref(prefix, value));

/** Fails on malformed records, since skipping them would drop them from the export. */
const recordId = (prefix: XrefPrefix, pointer: string | null | undefined) => {
  if (pointer === null || pointer === undefined || pointer === "") {
    throw new Error("Die Datei enthält einen Eintrag ohne ID.");
  }

  return stripXref(prefix, pointer);
};

/**
 * GEDCOM dates can be imprecise (`1950`, `ABT 1900`). Those have no exact date,
 * so the source text is kept to show and export instead of losing it.
 */
const readDate = (value: string | null | undefined) => {
  const date = parseDate(value ?? "", GEDCOM_DATE_FORMAT, referenceDate);

  return isValid(date)
    ? { date, raw: undefined }
    : { date: undefined, raw: value ?? undefined };
};

/** Takes the raw bytes, since the library detects the encoding of older files. */
export const parseGedcom = (source: ArrayBuffer): Gedcom => {
  const root = readGedcom(source);

  const individuals = root
    .getIndividualRecord()
    .arraySelect()
    .map((record): Individual => {
      const name = (record.getName().value()[0] ?? "").replaceAll("/", "");
      const birth = readDate(record.getEventBirth().getDate().value()[0]);
      const death = readDate(record.getEventDeath().getDate().value()[0]);

      return {
        birth: birth.date,
        birthRaw: birth.raw,
        death: death.date,
        deathRaw: death.raw,
        headOfFamilies: stripXrefs(
          "@F",
          record.getSpouseFamilyLink().valueNonNull()
        ),
        id: recordId("@I", record.pointer()[0]),
        name: name === "" ? "no name" : name,
        sex: record.getSex().value()[0] ?? undefined,
      };
    });

  const families = root
    .getFamilyRecord()
    .arraySelect()
    .map((record): Family => {
      const marriage = readDate(record.getEventMarriage().getDate().value()[0]);

      return {
        children: stripXrefs("@I", record.getChild().valueNonNull()),
        id: recordId("@F", record.pointer()[0]),
        marriage: marriage.date,
        marriageRaw: marriage.raw,
        parents: stripXrefs("@I", [
          ...record.getHusband().valueNonNull().slice(0, 1),
          ...record.getWife().valueNonNull().slice(0, 1),
        ]),
      };
    });

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
