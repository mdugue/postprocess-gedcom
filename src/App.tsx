import * as Comlink from "comlink"
import React, { useCallback, useMemo, useState } from "react"
import {
  Cell,
  Column,
  Row,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  getFilteredRowModel,
  ColumnFiltersState,
  Table,
  getFacetedUniqueValues,
} from "@tanstack/react-table"
import { useMap } from "react-use"
import "./App.css"
import Delete from "./Delete"
import FileDrop from "./FileDrop"
import PaginationControls from "./PaginationControls"
import { readFile } from "./readFile"
import SortAscending from "./Icons/SortAscending"
import SortDescending from "./Icons/SortDescending"
import { Individual, Family } from "./worker"
import Sort from "./Icons/Sort"
import { format, isValid } from "date-fns"

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
      const data = await dataWorker.loadData(file)
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
      {
        header: "",
        id: "actions",
        cell: (data: Cell<Individual>) => (
          <span>
            <button
              className="hover:bg-gray-50 p-1 rounded"
              onClick={() => {
                setTransformation(data.row.original.id, {
                  type: "delete",
                  hint: `${
                    data.row.original.name
                  }, ${data.row.original.birth?.toDateString()}`,
                })
              }}
            >
              <Delete />
            </button>
          </span>
        ),
      },
    ],
    [setTransformation, sortByBirth, sortByDeath]
  )

  const [pagination, setPagination] = useState({
    pageIndex: 0, //initial page index
    pageSize: 10, //default page size
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable(
    {
      enableColumnResizing: true,
      columnResizeMode: "onChange",
      updateMe: (id: string, data: { [key: string]: any }, hint: string) => {
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
      },
      columns,
      data: rootData?.individuals || [],
      /* initialState: { pageSize: 20 }, */
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
                const id = cell.row.original.id

                // @ts-expect-error
                cell.updateMe(
                  id,
                  { [String(cell.column.Header)]: e.target.value },
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
    }
    /* useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns */
  )

  const {
    // filter
    /* preGlobalFilteredRows, */
    setGlobalFilter,
    getHeaderGroups,
    getRowModel,
    /* state: { pageIndex, pageSize, globalFilter }, */
  } = table

  return (
    <div className="grid grid-cols-4 gap-4 m-8">
      <h1 className="col-span-4 text-4xl text-purple-400 uppercase font-thin">
        Transform Gedcom
      </h1>
      <div className="grid gap-4 col-span-3">
        <h2 className="text-xl mt-4 text-gray-500">Gedcom data </h2>
        {rootData == null ? (
          <FileDrop
            title="add gedcom file here"
            onDrop={onGedcomDrop}
            accept=".ged"
          />
        ) : (
          <table
            className="bg-white shadow-lg rounded-xl text-gray-600"
            style={{
              width: table.getCenterTotalSize(),
            }}
          >
            <thead>
              {
                // Loop over the header rows
                getHeaderGroups().map((headerGroup) => (
                  // Apply the header row props
                  <tr id={headerGroup.id} key={headerGroup.id}>
                    {
                      // Loop over the headers in each row
                      headerGroup.headers.map((header) => (
                        // Apply the header cell props
                        <th
                          id={header.id}
                          key={header.id}
                          className="py-1 px-2 relative"
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
                            {...{
                              onDoubleClick: () => header.column.resetSize(),
                              onMouseDown: header.getResizeHandler(),
                              onTouchStart: header.getResizeHandler(),

                              style: {
                                transform:
                                  false && header.column.getIsResizing()
                                    ? `translateX(${
                                        (table.options.columnResizeDirection ===
                                        "rtl"
                                          ? -1
                                          : 1) *
                                        (table.getState().columnSizingInfo
                                          .deltaOffset ?? 0)
                                      }px)`
                                    : "",
                              },
                            }}
                          />
                          {header.column.getCanFilter() ? (
                            <div>
                              <Filter column={header.column} table={table} />
                            </div>
                          ) : null}
                        </th>
                      ))
                    }
                  </tr>
                ))
              }
            </thead>
            {/* Apply the table body props */}
            <tbody /* {...getTableBodyProps()} */>
              {getRowModel().rows.map((row, i) => {
                // Prepare the row for display
                /* prepareRow(row) */
                const isDeleted =
                  transformations[row.original.id]?.type === "delete"
                const isUpdated =
                  transformations[row.original.id]?.type === "update"
                return (
                  // Apply the row props
                  <tr
                    id={row.id}
                    key={row.id}
                    className={`border-l-8 border-white ${
                      isDeleted && "border-red-400 text-gray-300"
                    } ${isUpdated && "border-green-400 text-green-700"}`}
                  >
                    {
                      // Loop over the rows cells
                      row.getVisibleCells().map((cell) => {
                        // Apply the cell props
                        return (
                          <td id={cell.id} key={cell.id} className="py-1 px-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        )
                      })
                    }
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <PaginationControls
          canNextPage={table.getCanNextPage()}
          canPreviousPage={table.getCanPreviousPage()}
          setPageSize={table.setPageSize}
          pageCount={table.getPageCount()}
          gotoPage={table.setPageIndex}
          nextPage={table.nextPage}
          pageIndex={table.getState().pagination.pageIndex}
          pageSize={table.getState().pagination.pageSize}
          previousPage={table.previousPage}
        />
      </div>
      <div>
        <div className="grid gap-4">
          <h2 className="text-xl mt-4 text-gray-500">
            applied transformations
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
                    <Delete />
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
                    <span className="text-gray-400 pl-1">{individual.id}</span>
                  </h2>
                  {type?.type === "update" &&
                    Object.entries(type.data).map(([key, newValue]) => (
                      <div className="flex items-center text-xs" key={key}>
                        <div className="text-green-900">
                          {
                            // @ts-expect-error
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
                  <button
                    className="hover:bg-gray-50 p-1 rounded self-end"
                    onClick={() => removeTransformation(id)}
                  >
                    <Delete />
                  </button>
                </div>
              )
            })}
          </div>
          <FileDrop
            title="add transformation file here"
            onDrop={onTransformationDrop}
            accept=".gedTransform"
          />
        </div>
      </div>
      <div className="fixed bottom-4 right-4">
        <button
          className="p-2 bg-purple-600 text-white shadow rounded-md text-center"
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
          download all
        </button>
      </div>
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

  const sortedUniqueValues = React.useMemo(
    () =>
      typeof firstValue === "number"
        ? []
        : Array.from(column.getFacetedUniqueValues().keys()).sort(),
    [column.getFacetedUniqueValues()]
  )

  return typeof firstValue === "number" ? (
    <div>
      <div className="flex space-x-2">
        <DebouncedInput
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
          className="w-24 border shadow rounded"
        />
        <DebouncedInput
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
          className="w-24 border shadow rounded"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : (
    <>
      <datalist id={column.id + "list"}>
        {sortedUniqueValues.slice(0, 5000).map((value: any) => (
          <option value={value} key={value} />
        ))}
      </datalist>
      <DebouncedInput
        type="text"
        value={(columnFilterValue ?? "") as string}
        onChange={(value) => column.setFilterValue(value)}
        placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
        className="w-full border rounded min-w-32 font-medium"
        list={column.id + "list"}
      />
      <div className="h-1" />
    </>
  )
}

// A debounced input react component
function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [value, setValue] = React.useState(initialValue)

  React.useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)

    return () => clearTimeout(timeout)
  }, [value])

  return (
    <input
      {...props}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}

export default App

function filterFalsy<T>(
  value: T
): value is Exclude<T, false | null | undefined | "" | 0> {
  return Boolean(value)
}
