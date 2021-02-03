import * as Comlink from "comlink"
import { parse } from "date-fns"
import parseGedcom from "parse-gedcom"
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

const dataWorker = {
  async loadData(file: Blob) {
    const gedcomData = await readFile(file)
    const data = parseGedcom.parse(gedcomData)

    const individuals: Individual[] = data
      .filter((item) => item.tag === "INDI")
      .map((item) => {
        const birth = item.tree
          .find((node) => node.tag === "BIRT")
          ?.tree.find((node) => node.tag === "DATE")?.data
        const death = item.tree
          .find((node) => node.tag === "DEAT")
          ?.tree.find((node) => node.tag === "DATE")?.data

        return {
          id: item.pointer.replace("@I", "").replace("@", ""),
          name:
            item.tree
              .find((node) => node.tag === "NAME")
              ?.data.replace(/\//g, "") || "no name",
          birth:
            birth != null ? parse(birth, "d LLL y", referenceDate) : undefined,
          death:
            death != null ? parse(death, "d LLL y", referenceDate) : undefined,
          sex: item.tree.find((node) => node.tag === "SEX")?.data,
          headOfFamilies: item.tree
            .filter((node) => node.tag === "FAMS")
            .map((node) => node.data.replace("@F", "").replace("@", "")),
        } as Individual
      })

    const idToIndividualMap: {
      [id: string]: Individual
    } = individuals.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: curr,
      }),
      {}
    )

    const families: Family[] = data
      .filter((item) => item.tag === "FAM")
      .map((item) => {
        const marriageDateString = item.tree
          .find((node) => node.tag === "MARR")
          ?.tree.find((node) => node.tag === "DATE")?.data
        return {
          id: item.pointer.replace("@F", "").replace("@", ""),
          children: item.tree
            .filter((node) => node.tag === "CHIL")
            .map((node) => node.data.replace("@I", "").replace("@", "")),
          parents: item.tree
            .filter((node) => node.tag === "HUSB" || node.tag === "WIFE")
            .map((node) => node.data.replace("@I", "").replace("@", "")),
          marriage: marriageDateString
            ? new Date(marriageDateString)
            : undefined,
        }
      })
    return {
      individuals,
      idToIndividualMap,
      families,
    }
  },
}

export type WorkerType = typeof dataWorker

Comlink.expose(dataWorker)
