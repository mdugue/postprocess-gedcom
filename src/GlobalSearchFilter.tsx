import React from "react"
import { Row, useAsyncDebounce } from "react-table"
import "./App.css"
import { Individual } from "./worker"

export default function GlobalSearchFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter,
}: {
  preGlobalFilteredRows: Row<Individual>[]
  globalFilter: any
  setGlobalFilter: (filter: any) => void
}) {
  const count = preGlobalFilteredRows.length
  const [value, setValue] = React.useState(globalFilter)
  const onChange = useAsyncDebounce((value) => {
    setGlobalFilter(value || undefined)
  }, 200)

  return (
    <span>
      <input
        className="ml-1 shadow rounded py-1 px-2"
        value={value || ""}
        onChange={(e) => {
          setValue(e.target.value)
          onChange(e.target.value)
        }}
        placeholder={`search (${count} records...)`}
        style={{
          fontSize: "1.1rem",
          border: "0",
        }}
      />
    </span>
  )
}
