import * as Comlink from "comlink"
import { parse } from "date-fns"
import * as parseGedcom from "parse-gedcom"
import { readFile } from "./readFile"

const referenceDate = new Date()

export type Individual = {
  readonly id: string
  readonly name: string
  readonly birth: Date | undefined
  readonly death: Date | undefined
  readonly sex: string | undefined
  readonly headOfFamilies: string[]
}

export type Family = {
  id: string
  parents: string[]
  children: string[]
  marriage?: Date
}

type CompactIndividual = {
  type: "INDI"
  data?: {
    "@FAMILY_SPOUSE"?: string
    "+@FAMILY_SPOUSE"?: string[]
    "BIRTH/DATE"?: string
    "BIRTH/PLACE"?: string
    "DEATH/DATE"?: string
    "DEATH/PLACE"?: string
    "EVENT/PLACE"?: string
    "EVENT/TYPE"?: string
    NAME: string
    REFERENCE: string
    SEX: "M" | "W"
    formal_name: "INDIVIDUAL"
    xref_id: string
  }
  children: Individual
}

type CompactFamily = {
  type: "FAM"
  data?: {
    "+@CHILD"?: string[]
    "+CHILD/_FREL"?: string[]
    "+CHILD/_MREL"?: string[]
    "@CHILD"?: string
    "@HUSBAND"?: string
    "@WIFE"?: string
    "CHILD/_FREL"?: string
    "CHILD/_MREL"?: string
    "MARRIAGE/DATE"?: string
    formal_name: "FAMILY"
    xref_id: string
  }
  children: CompactFamily[]
}

type Parent = { children: (CompactIndividual | CompactFamily)[] }

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value != null
}

const dataWorker = {
  async loadData(file: Blob) {
    const gedcomData = await readFile(file)
    const data = parseGedcom.parse(gedcomData)
    // @ts-expect-error
    const compact: Parent = parseGedcom.compact(data) as Parent

    const individuals: Individual[] = compact.children
      .filter((item): item is CompactIndividual => item.type === "INDI")
      .map((item) => {
        const { data } = item
        if (data == null) return null
        const birth = data["BIRTH/DATE"]
        const death = data["DEATH/DATE"]

        return {
          id: data.xref_id.replace("@I", "").replace("@", ""),
          name: data.NAME.replace(/\//g, "") || "no name",
          birth:
            birth != null ? parse(birth, "d LLL y", referenceDate) : undefined,
          death:
            death != null ? parse(death, "d LLL y", referenceDate) : undefined,
          sex: data.SEX,
          headOfFamilies: [
            data["@FAMILY_SPOUSE"],
            ...(data["+@FAMILY_SPOUSE"] || []),
          ]
            .filter(notEmpty)
            .map((node) => node.replace("@F", "").replace("@", "")),
        } as Individual
      })
      .filter(notEmpty)

    const idToIndividualMap: {
      [id: string]: Individual
    } = individuals.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: curr,
      }),
      {}
    )

    const families: Family[] = compact.children
      .filter((item): item is CompactFamily => item.type === "FAM")
      .map((item) => {
        const { data } = item
        if (data == null) return null
        const marriageDateString = data["MARRIAGE/DATE"]
        return {
          id: data.xref_id.replace("@F", "").replace("@", ""),
          children: [data["@CHILD"], ...(data["+@CHILD"] || [])]
            .filter(notEmpty)
            .map((node) => node.replace("@I", "").replace("@", "")),
          parents: [data["@HUSBAND"], data["@WIFE"]]
            .filter(notEmpty)
            .map((node) => node.replace("@I", "").replace("@", "")),
          marriage: marriageDateString
            ? new Date(marriageDateString)
            : undefined,
        }
      })
      .filter(notEmpty)
    return {
      individuals,
      idToIndividualMap,
      families,
    }
  },
}

export type WorkerType = typeof dataWorker

Comlink.expose(dataWorker)
