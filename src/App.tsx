import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import {
  Table as ShadTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import RulesEditor from "@/RulesEditor"
import {
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
import { format, isValid } from "date-fns"
import { FileDownIcon, TrashIcon, UndoIcon } from "lucide-react"
import React, { useCallback, useMemo, useState } from "react"
import { useMap } from "react-use"
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

const columnHelper = createColumnHelper<Individual>()

type TransformIndividual =
  | { type: "delete"; hint: string }
  | { type: "update"; data: Partial<Individual>; hint: string }

function App() {
  const [rootData, setRootData] = useState<{
    individuals: Individual[]
    idToIndividualMap: { [id: string]: Individual }
    families: Family[]
  }>()
  const [
    transformations,
    {
      set: setTransformation,
      remove: removeTransformation,
      reset: resetTransformations,
      setAll: setAllTransformations,
    },
  ] = useMap<{
    [id: string]: TransformIndividual | undefined
  }>()
  const onGedcomDrop = useCallback((acceptedFiles: Blob[]) => {
    acceptedFiles.forEach(async (file) => {
      console.log("loading file")
      const data = await dataWorker.loadData(file)
      console.log("loaded file")
      setRootData(data)
    })
  }, [])
  const onTransformationDrop = useCallback(
    (acceptedFiles: Blob[]) => {
      acceptedFiles.forEach(async (file) => {
        const newTransformationsString = await readFile(file)
        const newTransformations = JSON.parse(newTransformationsString)
        console.log(newTransformations)
        resetTransformations()
        setAllTransformations(newTransformations.individuals)
      })
    },
    [resetTransformations, setAllTransformations]
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

  const columns = useMemo(
    () => [
      { header: "id", accessorKey: "id", size: 64 },
      columnHelper.accessor("name", {
        header: "Name",
        size: 400,
        filterFn: "includesString",
      }),
      {
        header: "Geschlecht",
        accessorKey: "sex",
      },
      columnHelper.accessor("birth", {
        header: "birth",
        cell: (info) => info.getValue()?.toLocaleDateString() || " – ",
        sortingFn: sortByBirth,
      }),
      columnHelper.accessor("death", {
        header: "death",
        cell: (info) => info.getValue()?.toLocaleDateString() || " – ",
        sortingFn: sortByDeath,
      }),
      {
        header: "families head",
        accessorKey: "headOfFamilies",
      },
      columnHelper.display({
        header: "actions",
        cell: (data) => (
          <span>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => {
                setTransformation(data.row.original.id, {
                  type: "delete",
                  hint: `${
                    data.row.original.name
                  }, ${data.row.original.birth?.toDateString()}`,
                })
              }}
            >
              <TrashIcon />
            </Button>
          </span>
        ),
      }),
    ],
    [setTransformation, sortByBirth, sortByDeath]
  )

  const [pagination, setPagination] = useState({
    pageIndex: 0, //initial page index
    pageSize: 10, //default page size
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const updateMe = (id: string, data: { [key: string]: any }, hint: string) => {
    const existingTransformation = transformations[id]
    const existingTransformationData =
      existingTransformation?.type === "update"
        ? existingTransformation.data
        : null

    const newTransformationData: Partial<Individual> = {
      ...existingTransformationData,
      ...data,
    } as const

    setTransformation(id, {
      type: "update",
      data: newTransformationData,
      hint,
    })
  }

  const table = useReactTable({
    enableColumnResizing: true,
    columnResizeMode: "onChange",

    columns,
    data: rootData?.individuals || emptyArray,
    defaultColumn: {
      cell: (cell) => {
        return (
          <input
            defaultValue={cell.getValue()}
            style={{
              width: "100%",
              background: "inherit",
              fontWeight: "inherit",
              textDecoration: "inherit",
              textDecorationColor: "inherit",
              textDecorationStyle: "inherit",
              textDecorationThickness: "inherit",
              textDecorationLine: "inherit",
            }}
            onChange={(e) => {
              console.log("on change", cell.column, cell.column.id)
              const id = cell.row.original.id

              updateMe(
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
    },
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: { pagination, columnFilters },
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
  })

  const { getHeaderGroups, getRowModel } = table

  return (
    <div className="gap-4 m-8">
      {rootData?.individuals && (
        <div>
          <RulesEditor individuals={rootData.individuals} />
        </div>
      )}
      <h1 className="col-span-4 text-4xl font-bold">Transform Gedcom</h1>
      <ResizablePanelGroup direction="horizontal" className="w-full">
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
                  <ShadTable
                    style={{
                      width: table.getCenterTotalSize(),
                    }}
                  >
                    <TableHeader>
                      {
                        // Loop over the header rows
                        getHeaderGroups().map((headerGroup) => (
                          // Apply the header row props
                          <TableRow id={headerGroup.id} key={headerGroup.id}>
                            {
                              // Loop over the headers in each row
                              headerGroup.headers.map((header) => (
                                // Apply the header cell props
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
                                      {header.column.getIsSorted() ===
                                      "desc" ? (
                                        <SortDescending />
                                      ) : header.column.getIsSorted() ===
                                        "asc" ? (
                                        <SortAscending />
                                      ) : (
                                        <></>
                                      )}
                                    </span>
                                  </button>
                                  <div
                                    className="bg-gray-100 w-1 rounded h-full basis-4 absolute right-0 top-0 cursor-col-resize"
                                    {...{
                                      onDoubleClick: () =>
                                        header.column.resetSize(),
                                      onMouseDown: header.getResizeHandler(),
                                      onTouchStart: header.getResizeHandler(),

                                      style: {
                                        transform:
                                          false && header.column.getIsResizing()
                                            ? `translateX(${
                                                (table.options
                                                  .columnResizeDirection ===
                                                "rtl"
                                                  ? -1
                                                  : 1) *
                                                (table.getState()
                                                  .columnSizingInfo
                                                  .deltaOffset ?? 0)
                                              }px)`
                                            : "",
                                      },
                                    }}
                                  />
                                  {header.column.getCanFilter() ? (
                                    <div>
                                      <Filter
                                        column={header.column}
                                        table={table}
                                      />
                                    </div>
                                  ) : null}
                                </TableHead>
                              ))
                            }
                          </TableRow>
                        ))
                      }
                    </TableHeader>
                    <TableBody>
                      {getRowModel().rows.map((row) => {
                        // Prepare the row for display
                        const isDeleted =
                          transformations[row.original.id]?.type === "delete"
                        const isUpdated =
                          transformations[row.original.id]?.type === "update"
                        return (
                          // Apply the row props
                          <TableRow
                            id={row.id}
                            key={row.id}
                            className={` ${
                              isDeleted &&
                              "border-red-400 text-gray-400 bg-red-50/50"
                            } ${
                              isUpdated &&
                              "border-green-400 text-green-700 bg-green-50/50"
                            }`}
                          >
                            {
                              // Loop over the rows cells
                              row.getVisibleCells().map((cell) => {
                                // Apply the cell props
                                return (
                                  <TableCell id={cell.id} key={cell.id}>
                                    {flexRender(
                                      cell.column.columnDef.cell,
                                      cell.getContext()
                                    )}
                                  </TableCell>
                                )
                              })
                            }
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </ShadTable>
                </div>
              </div>
            )}

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
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="mx-4" />
        <ResizablePanel>
          <div>
            <div className="grid gap-4">
              <h2 className="text-xl mt-4 font-bold">
                Applied Transformations
              </h2>
              <div className="grid gap-1 sticky top-1 text-gray-600">
                {Object.entries(transformations).map(([id, type]) => {
                  const individual = rootData?.idToIndividualMap[id]
                  return individual == null ? (
                    <div
                      key={id + type?.toString()}
                      className="shadow rounded-sm p-1 bg-red-50"
                    >
                      <h2>
                        <span className="bg-red-100 text-red-900 px-1 mr-1 rounded text-xs font-bold">
                          warning
                        </span>{" "}
                        no person with id {id} found
                      </h2>
                      <div className="text-gray-400 text-sm p-2 italic">
                        was: {type?.hint}
                      </div>
                      <button
                        onClick={() => removeTransformation(id)}
                        className="hover:bg-gray-50 p-1 rounded"
                      >
                        <UndoIcon />
                      </button>
                    </div>
                  ) : (
                    <div
                      key={id + type?.toString()}
                      className={`shadow rounded-sm p-2 flex flex-col bg-white bg-gradient-to-r from-white ${
                        type?.type === "delete"
                          ? "to-red-50"
                          : type?.type === "update"
                          ? "to-green-50"
                          : ""
                      }`}
                    >
                      <h2>
                        {type?.type === "delete" && (
                          <span className="bg-red-50 text-red-900 px-1 mr-1 rounded text-xs font-bold">
                            delete
                          </span>
                        )}
                        {type?.type === "update" && (
                          <span className="bg-green-50 text-green-900 px-1 mr-1 rounded text-xs font-bold">
                            change
                          </span>
                        )}
                        {individual.name}
                        <span className="text-gray-400 pl-1">
                          {individual.id}
                        </span>
                      </h2>
                      {type?.type === "update" &&
                        Object.entries(type.data).map(([key, newValue]) => (
                          <div className="flex items-center text-xs" key={key}>
                            <div className="text-green-900">
                              {
                                // @ts-expect-error Only for display
                                individual[key]
                              }
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
                            <div className="font-bold">{newValue}</div>
                          </div>
                        ))}
                      <Button
                        className="self-end"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTransformation(id)}
                      >
                        <UndoIcon />
                      </Button>
                    </div>
                  )
                })}
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
                Object.entries(transformations).forEach(([key, transform]) => {
                  if (transform?.type === "delete") deleteKeysMap[key] = true
                })

                const t = [
                  {
                    content: JSON.stringify({ individuals: transformations }),
                    title: "transformations",
                    type: "gedTransform",
                  },
                  {
                    content: JSON.stringify({
                      individuals: rootData?.individuals
                        .map((individual) => {
                          if (deleteKeysMap[individual.id]) return null
                          const manipulation = transformations[individual.id]
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
                      families: rootData?.families.map((family) => ({
                        ...family,
                        marriage:
                          family.marriage && isValid(family.marriage)
                            ? format(family.marriage, "yyyy-MM-dd")
                            : undefined,
                        children: family.children.filter(
                          (childId) => !deleteKeysMap[childId]
                        ),
                        parents: family.parents.filter(
                          (parentId) => !deleteKeysMap[parentId]
                        ),
                      })),
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

const emptyArray: Array<Individual> = []
