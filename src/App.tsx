import * as Comlink from "comlink"
import React, { useCallback, useMemo, useState } from "react"
import {
  Cell,
  Column,
  Row,
  useBlockLayout,
  useFilters,
  useGlobalFilter,
  usePagination,
  useResizeColumns,
  useSortBy,
  useTable,
} from "react-table"
import { useMap } from "react-use"
/* eslint-disable import/no-webpack-loader-syntax */
// @ts-ignore
import Worker from "worker-loader!./worker" // inline loader
import "./App.css"
import Delete from "./Delete"
import FileDrop from "./FileDrop"
import GlobalSearchFilter from "./GlobalSearchFilter"
import PaginationControls from "./PaginationControls"
import { readFile } from "./readFile"
import SortAscending from "./Icons/SortAscending"
import SortDescending from "./Icons/SortDescending"
import { Individual, Family } from "./worker"
import Sort from "./Icons/Sort"

const DataWorker = new Worker()
const dataWorker = Comlink.wrap<import("./worker").WorkerType>(DataWorker)

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
    () =>
      [
        { Header: "id", accessor: "id", width: 64 },
        {
          Header: "name",
          accessor: "name",
          width: 400,
        },
        {
          Header: "sex",
          accessor: "sex",
          width: 64,
        },
        {
          Header: "birth",
          accessor: "birth",
          Cell: ({ value }) => (value ? value.toLocaleDateString() : " – "),
          sortType: sortByBirth,
        },
        {
          Header: "death",
          accessor: "death",
          Cell: ({ value }) => (value ? value.toLocaleDateString() : " – "),
          sortType: sortByDeath,
        },
        {
          Header: "families head",
          accessor: "headOfFamilies",
        },
        {
          Header: "",
          id: "actions",
          Cell: (data: Cell<Individual>) => (
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
      ] as Column<Individual>[],
    [setTransformation, sortByBirth, sortByDeath]
  )

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    // pagination
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    // filter
    preGlobalFilteredRows,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter },
  } = useTable(
    {
      // @ts-expect-error
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
      initialState: { pageSize: 20 },
      defaultColumn: {
        Cell: (cell: Cell<Individual>) => {
          return (
            <input
              defaultValue={cell.value}
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
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useBlockLayout,
    useResizeColumns
  )

  return (
    <div className="grid grid-cols-4 gap-4 m-8">
      <h1 className="col-span-4 text-4xl text-purple-400 uppercase font-thin">
        Transform Gedcom
      </h1>
      <div className="grid gap-4 col-span-3">
        <h2 className="text-xl mt-4 text-gray-500">
          Gedcom data{" "}
          <GlobalSearchFilter
            preGlobalFilteredRows={preGlobalFilteredRows}
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
          />
        </h2>
        {rootData == null ? (
          <FileDrop
            title="add gedcom file here"
            onDrop={onGedcomDrop}
            accept=".ged"
          />
        ) : (
          <div
            className="table-auto bg-white shadow-lg rounded-xl overflow-hidden text-gray-600"
            {...getTableProps()}
          >
            <div>
              {
                // Loop over the header rows
                headerGroups.map((headerGroup) => (
                  // Apply the header row props
                  <div {...headerGroup.getHeaderGroupProps()}>
                    {
                      // Loop over the headers in each row
                      headerGroup.headers.map((column) => (
                        // Apply the header cell props
                        <div {...column.getHeaderProps()} className="py-1 px-2">
                          <div className="flex items-center">
                            {column.render("Header")}
                            <span
                              className="pl-1"
                              {...column.getSortByToggleProps()}
                            >
                              {column.isSorted ? (
                                column.isSortedDesc ? (
                                  <SortDescending />
                                ) : (
                                  <SortAscending />
                                )
                              ) : column.canSort ? (
                                <Sort />
                              ) : (
                                <></>
                              )}
                            </span>
                            <div
                              {...column.getResizerProps()}
                              className={`w-1 h-4 ml-auto mr-1 bg-gray-100 ${
                                column.isResizing ? "bg-gray-200" : ""
                              }`}
                            />
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ))
              }
            </div>
            {/* Apply the table body props */}
            <div {...getTableBodyProps()}>
              {page.map((row, i) => {
                // Prepare the row for display
                prepareRow(row)
                const isDeleted =
                  transformations[row.original.id]?.type === "delete"
                const isUpdated =
                  transformations[row.original.id]?.type === "update"
                return (
                  // Apply the row props
                  <div
                    {...row.getRowProps()}
                    className={`border-l-8 border-white ${
                      isDeleted && "border-red-400 text-gray-300"
                    } ${isUpdated && "border-green-400 text-green-700"}`}
                  >
                    {
                      // Loop over the rows cells
                      row.cells.map((cell) => {
                        // Apply the cell props
                        return (
                          <div {...cell.getCellProps()} className="py-1 px-2">
                            {
                              // Render the cell contents
                              cell.render("Cell")
                            }
                          </div>
                        )
                      })
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}
        <PaginationControls
          canNextPage={canNextPage}
          canPreviousPage={canPreviousPage}
          setPageSize={setPageSize}
          pageCount={pageCount}
          gotoPage={gotoPage}
          nextPage={nextPage}
          pageIndex={pageIndex}
          pageOptions={pageOptions}
          pageSize={pageSize}
          previousPage={previousPage}
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
                      <div className="flex items-center text-xs">
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
                    .filter(Boolean),
                  families: rootData?.families.map((family) => ({
                    ...family,
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

export default App
