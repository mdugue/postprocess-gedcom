import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Table as ShadTable,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import RulesEditor from "@/RulesEditor"
import {
  CellContext,
  Column,
  ColumnFiltersState,
  Row,
  Table,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import * as Comlink from "comlink"
import { format, isValid, parseISO } from "date-fns"
import { FileDownIcon, TrashIcon, UndoIcon } from "lucide-react"
import React, { useCallback, useMemo, useState } from "react"
import "./App.css"
import { Button } from "./components/ui/button"
import { Input } from "./components/ui/input"
import FileDrop from "./FileDrop"
import SortAscending from "./Icons/SortAscending"
import SortDescending from "./Icons/SortDescending"
import PaginationControls from "./PaginationControls"
import { readFile } from "./readFile"
import { Family, Individual } from "./worker"

const dataWorker = Comlink.wrap<import("./worker").WorkerType>(
  new Worker(new URL("./worker", import.meta.url), { type: "module" })
)

const individualColumnHelper = createColumnHelper<Individual>()
const familyColumnHelper = createColumnHelper<Family>()

type RecordKind = "individuals" | "families"

type EntryTransform<T> =
  | { type: "delete"; hint: string }
  | { type: "update"; data: T; hint: string }

type IndividualUpdate = Partial<Individual>
/** `null` clears a date. Stored as `yyyy-MM-dd` so the JSON file stays readable. */
type FamilyUpdate = {
  marriage?: string | null
}

type IndividualTransform = EntryTransform<IndividualUpdate>
type FamilyTransform = EntryTransform<FamilyUpdate>

type TransformationFile = {
  individuals?: Record<string, IndividualTransform>
  families?: Record<string, FamilyTransform>
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "inherit",
  fontWeight: "inherit",
  textDecoration: "inherit",
  textDecorationColor: "inherit",
  textDecorationStyle: "inherit",
  textDecorationThickness: "inherit",
  textDecorationLine: "inherit",
}

function App() {
  const [rootData, setRootData] = useState<{
    individuals: Individual[]
    idToIndividualMap: { [id: string]: Individual }
    families: Family[]
  }>()
  const [individualTransformations, setIndividualTransformations] = useState<
    Record<string, IndividualTransform>
  >({})
  const [familyTransformations, setFamilyTransformations] = useState<
    Record<string, FamilyTransform>
  >({})
  const [recordKind, setRecordKind] = useState<RecordKind>("individuals")

  const onGedcomDrop = useCallback((acceptedFiles: Blob[]) => {
    acceptedFiles.forEach(async (file) => {
      const data = await dataWorker.loadData(file)

      setRootData(data)
    })
  }, [])
  const onTransformationDrop = useCallback(
    (acceptedFiles: Blob[]) => {
      acceptedFiles.forEach(async (file) => {
        const newTransformationsString = await readFile(file)
        const newTransformations = JSON.parse(
          newTransformationsString
        ) as TransformationFile
        setIndividualTransformations(newTransformations.individuals ?? {})
        setFamilyTransformations(newTransformations.families ?? {})
      })
    },
    []
  )

  const sortByBirth = useCallback(
    (a: Row<Individual>, b: Row<Individual>) =>
      (a.original.birth?.getTime() || 0) - (b.original.birth?.getTime() || 0),
    []
  )

  const sortByDeath = useCallback(
    (a: Row<Individual>, b: Row<Individual>) =>
      (a.original.death?.getTime() || 0) - (b.original.death?.getTime() || 0),
    []
  )

  const [individualPagination, setIndividualPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [familyPagination, setFamilyPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [individualColumnFilters, setIndividualColumnFilters] =
    useState<ColumnFiltersState>([])
  const [familyColumnFilters, setFamilyColumnFilters] =
    useState<ColumnFiltersState>([])

  const updateIndividual = useCallback(
    (id: string, data: IndividualUpdate, hint: string) => {
      setIndividualTransformations((current) => ({
        ...current,
        [id]: mergeUpdate(current[id], data, hint),
      }))
    },
    []
  )

  const updateFamily = useCallback(
    (id: string, data: FamilyUpdate, hint: string) => {
      setFamilyTransformations((current) => ({
        ...current,
        [id]: mergeUpdate(current[id], data, hint),
      }))
    },
    []
  )

  const personName = useCallback(
    (id: string) => rootData?.idToIndividualMap[id]?.name ?? id,
    [rootData]
  )

  const familyHint = useCallback(
    (family: Family) => {
      const parents = family.parents.map(personName).join(" & ")
      const date =
        family.marriage && isValid(family.marriage)
          ? format(family.marriage, "yyyy-MM-dd")
          : "ohne Datum"
      return `${parents || `Familie ${family.id}`}, ${date}`
    },
    [personName]
  )

  const defaultCellInput = useCallback(
    (cell: CellContext<Individual, any>, overrideValue?: string) => {
      return (
        <input
          defaultValue={overrideValue || cell.getValue()}
          style={inputStyle}
          onChange={(e) => {
            const id = cell.row.original.id

            updateIndividual(
              id,
              { [cell.column.id]: e.target.value },
              `${
                cell.row.original.name
              }, ${cell.row.original.birth?.toDateString()}`
            )
          }}
        />
      )
    },
    [updateIndividual]
  )

  const individualColumns = useMemo(
    () => [
      { header: "id", accessorKey: "id", size: 64 },
      individualColumnHelper.accessor("name", {
        header: "Name",
        size: 400,
        cell: (cell) => {
          const transformationsToApply =
            individualTransformations[cell.row.original.id]
          if (
            transformationsToApply?.type === "update" &&
            transformationsToApply.data.name
          )
            return defaultCellInput(cell, transformationsToApply?.data.name)
          return defaultCellInput(cell)
        },
        filterFn: "includesString" as const,
      }),
      {
        header: "Geschlecht",
        accessorKey: "sex",
      },
      individualColumnHelper.accessor("birth", {
        header: "birth",
        cell: (info) => info.getValue()?.toLocaleDateString() || " – ",
        sortingFn: sortByBirth,
      }),
      individualColumnHelper.accessor("death", {
        header: "death",
        cell: (info) => info.getValue()?.toLocaleDateString() || " – ",
        sortingFn: sortByDeath,
      }),
      {
        header: "families head",
        accessorKey: "headOfFamilies",
      },
      individualColumnHelper.display({
        header: "actions",
        cell: (data) => (
          <span>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                setIndividualTransformations((current) => ({
                  ...current,
                  [data.row.original.id]: {
                    type: "delete",
                    hint: `${
                      data.row.original.name
                    }, ${data.row.original.birth?.toDateString()}`,
                  },
                }))
              }}
            >
              <TrashIcon />
            </Button>
          </span>
        ),
      }),
    ],
    [defaultCellInput, individualTransformations, sortByBirth, sortByDeath]
  )

  const familyColumns = useMemo(
    () => [
      { header: "id", accessorKey: "id", size: 64 },
      familyColumnHelper.accessor(
        (family) => family.parents.map(personName).join(", "),
        {
          id: "parents",
          header: "Eltern",
          size: 280,
          filterFn: "includesString",
        }
      ),
      familyColumnHelper.accessor(
        (family) => family.children.map(personName).join(", "),
        {
          id: "children",
          header: "Kinder",
          size: 360,
          filterFn: "includesString",
        }
      ),
      familyColumnHelper.accessor("marriage", {
        header: "Hochzeit",
        size: 180,
        enableColumnFilter: false,
        sortingFn: (a, b) =>
          (a.original.marriage?.getTime() || 0) -
          (b.original.marriage?.getTime() || 0),
        cell: (cell) => {
          const pending = familyTransformations[cell.row.original.id]
          const override =
            pending?.type === "update" && "marriage" in pending.data
              ? pending.data.marriage
              : undefined
          return (
            <input
              type="date"
              style={inputStyle}
              value={toDateInputValue(
                override !== undefined ? override : cell.getValue()
              )}
              onChange={(e) => {
                updateFamily(
                  cell.row.original.id,
                  { marriage: e.target.value === "" ? null : e.target.value },
                  familyHint(cell.row.original)
                )
              }}
            />
          )
        },
      }),
      familyColumnHelper.display({
        header: "actions",
        cell: (data) => (
          <span>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                setFamilyTransformations((current) => ({
                  ...current,
                  [data.row.original.id]: {
                    type: "delete",
                    hint: familyHint(data.row.original),
                  },
                }))
              }}
            >
              <TrashIcon />
            </Button>
          </span>
        ),
      }),
    ],
    [familyHint, familyTransformations, personName, updateFamily]
  )

  const individualTable = useReactTable({
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    columns: individualColumns,
    data: rootData?.individuals || emptyIndividuals,
    defaultColumn: {
      cell: defaultCellInput,
    },
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setIndividualPagination,
    state: {
      pagination: individualPagination,
      columnFilters: individualColumnFilters,
    },
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setIndividualColumnFilters,
  })

  const familyTable = useReactTable({
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    columns: familyColumns,
    data: rootData?.families || emptyFamilies,
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setFamilyPagination,
    state: {
      pagination: familyPagination,
      columnFilters: familyColumnFilters,
    },
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setFamilyColumnFilters,
  })

  const transformationCount =
    Object.keys(individualTransformations).length +
    Object.keys(familyTransformations).length

  return (
    <div className="gap-4 m-8">
      {/* {rootData?.individuals && (
        <div>
          <RulesEditor individuals={rootData.individuals} />
        </div>
      )} */}
      <h1 className="col-span-4 text-4xl font-bold">Transform Gedcom</h1>
      <ResizablePanelGroup direction="horizontal" className="w-full mt-4">
        <ResizablePanel defaultSize={75}>
          <div className="flex flex-col gap-4">
            {rootData == null ? (
              <FileDrop
                title="Add GEDCOM file here"
                onDrop={onGedcomDrop}
                accept={{ "text/ged": [".ged"] }}
              />
            ) : (
              <div className="">
                <div className="relative w-full overflow-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant={
                        recordKind === "individuals" ? "default" : "outline"
                      }
                      onClick={() => setRecordKind("individuals")}
                    >
                      Personen
                    </Button>
                    <Button
                      variant={recordKind === "families" ? "default" : "outline"}
                      onClick={() => setRecordKind("families")}
                    >
                      Familien
                    </Button>
                  </div>
                  {recordKind === "individuals" ? (
                    <DataTable
                      table={individualTable}
                      transformations={individualTransformations}
                    />
                  ) : (
                    <DataTable
                      table={familyTable}
                      transformations={familyTransformations}
                    />
                  )}
                </div>
              </div>
            )}

            {recordKind === "individuals" ? (
              <Pager table={individualTable} />
            ) : (
              <Pager table={familyTable} />
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-4" />
        <ResizablePanel>
          <div>
            <div className="grid gap-4">
              <h2 className="text-xl mt-4 font-bold">
                Applied Transformations ({transformationCount})
              </h2>
              <div className="grid gap-1 sticky top-1 text-gray-600">
                {Object.entries(individualTransformations).map(
                  ([id, transform]) => (
                    <TransformationCard
                      key={`individual-${id}`}
                      title={
                        rootData?.idToIndividualMap[id]?.name ??
                        `keine Person mit id ${id}`
                      }
                      id={id}
                      missing={rootData?.idToIndividualMap[id] == null}
                      transform={transform}
                      previousValues={rootData?.idToIndividualMap[id]}
                      onUndo={() =>
                        setIndividualTransformations((current) =>
                          omitKey(current, id)
                        )
                      }
                    />
                  )
                )}
                {Object.entries(familyTransformations).map(
                  ([id, transform]) => {
                    const family = rootData?.families.find(
                      (candidate) => candidate.id === id
                    )
                    return (
                      <TransformationCard
                        key={`family-${id}`}
                        title={
                          family
                            ? family.parents.map(personName).join(" & ") ||
                              `Familie ${family.id}`
                            : `keine Familie mit id ${id}`
                        }
                        id={id}
                        kind="Familie"
                        missing={family == null}
                        transform={transform}
                        previousValues={
                          family
                            ? {
                                marriage: toDateInputValue(family.marriage),
                              }
                            : undefined
                        }
                        onUndo={() =>
                          setFamilyTransformations((current) =>
                            omitKey(current, id)
                          )
                        }
                      />
                    )
                  }
                )}
              </div>
              <FileDrop
                title="Add transformation file here"
                onDrop={onTransformationDrop}
                accept={{ "text/gedTransform": [".gedTransform"] }}
              />
            </div>
          </div>
          <div className="fixed bottom-4 right-4">
            <Button
              variant="default"
              onClick={() => {
                const deleteKeysMap: { [key: string]: boolean } = {}
                Object.entries(individualTransformations).forEach(
                  ([key, transform]) => {
                    if (transform?.type === "delete") deleteKeysMap[key] = true
                  }
                )

                const t = [
                  {
                    content: JSON.stringify({
                      individuals: individualTransformations,
                      families: familyTransformations,
                    }),
                    title: "transformations",
                    type: "gedTransform",
                  },
                  {
                    content: JSON.stringify({
                      individuals: rootData?.individuals
                        .map((individual) => {
                          if (deleteKeysMap[individual.id]) return null
                          const manipulation =
                            individualTransformations[individual.id]
                          if (manipulation?.type === "update")
                            return {
                              ...individual,
                              ...manipulation.data,
                            }
                          return individual
                        })
                        .filter(filterFalsy)
                        .map((individual) => {
                          const { birth, death } = individual
                          return {
                            ...individual,
                            birth:
                              birth && isValid(birth)
                                ? format(birth, "yyyy-MM-dd")
                                : undefined,
                            death:
                              death && isValid(death)
                                ? format(death, "yyyy-MM-dd")
                                : undefined,
                          }
                        }),
                      families: rootData?.families
                        .filter(
                          (family) =>
                            familyTransformations[family.id]?.type !== "delete"
                        )
                        .map((family) => {
                          const manipulation = familyTransformations[family.id]
                          const marriage =
                            manipulation?.type === "update" &&
                            "marriage" in manipulation.data
                              ? manipulation.data.marriage
                              : family.marriage
                          return {
                            ...family,
                            marriage: formatExportedDate(marriage),
                            children: family.children.filter(
                              (childId) => !deleteKeysMap[childId]
                            ),
                            parents: family.parents.filter(
                              (parentId) => !deleteKeysMap[parentId]
                            ),
                          }
                        }),
                    }),
                    title: "data",
                    type: "json",
                  },
                ]
                t.forEach(({ content, title, type }) => {
                  const blobConfig = new Blob([content], {
                    type: "text/json;charset=utf-8",
                  })
                  // Convert Blob to URL
                  const blobUrl = URL.createObjectURL(blobConfig)

                  // Create an a element with blobl URL
                  const now = new Date()
                  const anchorTransforms = document.createElement("a")
                  anchorTransforms.href = blobUrl
                  anchorTransforms.target = "_blank"
                  anchorTransforms.download = `${title}-${now.toLocaleDateString()}-${now.toLocaleTimeString()}.${type}`
                  anchorTransforms.click()
                  URL.revokeObjectURL(blobUrl)
                })
              }}
            >
              <FileDownIcon className="size-4 mr-2" />
              Download all
            </Button>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

function DataTable<T extends { id: string }>({
  table,
  transformations,
}: {
  table: Table<T>
  transformations: Record<string, { type: "delete" | "update" }>
}) {
  return (
    <ShadTable
      style={{
        width: table.getCenterTotalSize(),
      }}
    >
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow id={headerGroup.id} key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                id={header.id}
                key={header.id}
                className="relative"
                style={{ width: header.getSize() }}
              >
                <button
                  type="button"
                  className="flex items-center capitalize"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext()
                  )}
                  <span className="pl-1">
                    {header.column.getIsSorted() === "desc" ? (
                      <SortDescending />
                    ) : header.column.getIsSorted() === "asc" ? (
                      <SortAscending />
                    ) : (
                      <></>
                    )}
                  </span>
                </button>
                <div
                  className="bg-gray-100 w-1 rounded h-full basis-4 absolute right-0 top-0 cursor-col-resize"
                  onDoubleClick={() => header.column.resetSize()}
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                />
                {header.column.getCanFilter() ? (
                  <div>
                    <Filter column={header.column} table={table} />
                  </div>
                ) : null}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => {
          const change = transformations[row.original.id]
          const isDeleted = change?.type === "delete"
          const isUpdated = change?.type === "update"
          return (
            <TableRow
              id={row.id}
              key={row.id}
              className={` ${
                isDeleted && "border-red-400 text-gray-400 bg-red-50/50"
              } ${isUpdated && "border-green-400 text-green-700 bg-green-50/50"}`}
            >
              {row.getVisibleCells().map((cell) => {
                return (
                  <TableCell id={cell.id} key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })}
      </TableBody>
    </ShadTable>
  )
}

function Pager<T>({ table }: { table: Table<T> }) {
  return (
    <PaginationControls
      pageCount={table.getPageCount()}
      canNextPage={table.getCanNextPage()}
      canPreviousPage={table.getCanPreviousPage()}
      gotoPage={table.setPageIndex}
      nextPage={table.nextPage}
      pageIndex={table.getState().pagination.pageIndex}
      pageSize={table.getState().pagination.pageSize}
      previousPage={table.previousPage}
      setPageSize={table.setPageSize}
    />
  )
}

function Filter({
  column,
  table,
}: {
  column: Column<any, unknown>
  table: Table<any>
}) {
  const firstValue = table
    .getPreFilteredRowModel()
    .flatRows[0]?.getValue(column.id)

  const columnFilterValue = column.getFilterValue()

  /* const sortedUniqueValues = React.useMemo(
    () =>
      typeof firstValue === "number"
        ? []
        : Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column.getFacetedUniqueValues()]
  ) */

  return typeof firstValue === "number" ? (
    <div>
      <div className="flex space-x-2">
        <Input
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? "")}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? "")}
          value={(columnFilterValue as [number, number])?.[0] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [value, old?.[1]])
          }
          placeholder={`Min ${
            column.getFacetedMinMaxValues()?.[0]
              ? `(${column.getFacetedMinMaxValues()?.[0]})`
              : ""
          }`}
        />
        <Input
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? "")}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? "")}
          value={(columnFilterValue as [number, number])?.[1] ?? ""}
          onChange={(value) =>
            column.setFilterValue((old: [number, number]) => [old?.[0], value])
          }
          placeholder={`Max ${
            column.getFacetedMinMaxValues()?.[1]
              ? `(${column.getFacetedMinMaxValues()?.[1]})`
              : ""
          }`}
        />
      </div>
      <div className="h-1" />
    </div>
  ) : (
    <>
      {/* <datalist id={column.id + "list"}>
        {sortedUniqueValues.slice(0, 5000).map((value: any) => (
          <option value={value} key={column.id + value} />
        ))}
      </datalist> */}
      <Input
        type="text"
        value={(columnFilterValue ?? "") as string}
        onChange={(event) => column.setFilterValue(event.target.value)}
        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
        list={column.id + "list"}
      />
      <div className="h-1" />
    </>
  )
}

export default App

function filterFalsy<T>(
  value: T
): value is Exclude<T, false | null | undefined | "" | 0> {
  return Boolean(value)
}

const emptyIndividuals: Array<Individual> = []
const emptyFamilies: Array<Family> = []

function mergeUpdate<T extends object>(
  current: EntryTransform<T> | undefined,
  data: Partial<T>,
  hint: string
): EntryTransform<T> {
  const existingData = current?.type === "update" ? current.data : undefined
  return {
    type: "update",
    data: { ...existingData, ...data } as T,
    hint,
  }
}

function omitKey<T>(record: Record<string, T>, key: string) {
  const next = { ...record }
  delete next[key]
  return next
}

function toDateInputValue(value: Date | string | null | undefined): string {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value
  return isValid(value) ? format(value, "yyyy-MM-dd") : ""
}

function formatExportedDate(
  value: Date | string | null | undefined
): string | undefined {
  if (value == null || value === "") return undefined
  if (typeof value === "string") {
    const parsed = parseISO(value)
    return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : undefined
  }
  return isValid(value) ? format(value, "yyyy-MM-dd") : undefined
}

function displayValue(value: unknown): string {
  if (value == null || value === "") return "—"
  if (value instanceof Date)
    return isValid(value) ? format(value, "yyyy-MM-dd") : "—"
  return String(value)
}

function TransformationCard({
  title,
  id,
  kind,
  missing,
  transform,
  previousValues,
  onUndo,
}: {
  title: string
  id: string
  kind?: string
  missing: boolean
  transform: EntryTransform<Record<string, unknown>>
  previousValues?: object
  onUndo: () => void
}) {
  if (missing) {
    return (
      <div className="shadow rounded-sm p-1 bg-red-50">
        <h2>
          <span className="bg-red-100 text-red-900 px-1 mr-1 rounded text-xs font-bold">
            warning
          </span>{" "}
          {title}
        </h2>
        <div className="text-gray-400 text-sm p-2 italic">
          was: {transform.hint}
        </div>
        <button onClick={onUndo} className="hover:bg-gray-50 p-1 rounded">
          <UndoIcon />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`shadow rounded-sm p-2 flex flex-col bg-white bg-gradient-to-r from-white ${
        transform.type === "delete"
          ? "to-red-50"
          : transform.type === "update"
          ? "to-green-50"
          : ""
      }`}
    >
      <h2>
        {transform.type === "delete" && (
          <span className="bg-red-50 text-red-900 px-1 mr-1 rounded text-xs font-bold">
            delete
          </span>
        )}
        {transform.type === "update" && (
          <span className="bg-green-50 text-green-900 px-1 mr-1 rounded text-xs font-bold">
            change
          </span>
        )}
        {kind && (
          <span className="bg-gray-100 text-gray-700 px-1 mr-1 rounded text-xs font-bold">
            {kind}
          </span>
        )}
        {title}
        <span className="text-gray-400 pl-1">{id}</span>
      </h2>
      {transform.type === "update" &&
        Object.entries(transform.data).map(([key, newValue]) => (
          <div className="flex items-center text-xs" key={key}>
            <div className="text-green-900">
              {displayValue(
                previousValues?.[key as keyof typeof previousValues]
              )}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="block h-4 w-4 m-1"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
            <div className="font-bold">{displayValue(newValue)}</div>
          </div>
        ))}
      <Button
        className="self-end"
        variant="ghost"
        size="icon"
        onClick={onUndo}
      >
        <UndoIcon />
      </Button>
    </div>
  )
}
