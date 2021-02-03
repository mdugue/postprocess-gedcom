export default function PaginationControls(props: {
  canNextPage: boolean
  canPreviousPage: boolean
  gotoPage: (page: number) => void
  nextPage: () => void
  pageCount: number
  pageIndex: number
  pageOptions: number[]
  pageSize: number
  previousPage: () => void
  setPageSize: (size: number) => void
}) {
  const {
    canNextPage,
    canPreviousPage,
    gotoPage,
    nextPage,
    pageCount,
    pageIndex,
    pageOptions,
    pageSize,
    previousPage,
    setPageSize,
  } = props
  return (
    <div className="flex justify-between place-items-center">
      <div>
        <button
          className="py-1 px-2 mr-2 shadow rounded bg-white"
          onClick={() => gotoPage(0)}
          disabled={!canPreviousPage}
        >
          {"<<"}
        </button>
        <button
          className="py-1 px-2 mr-2 shadow rounded bg-white"
          onClick={() => previousPage()}
          disabled={!canPreviousPage}
        >
          {"<"}
        </button>
        <button
          className="py-1 px-2 mr-2 shadow rounded bg-white"
          onClick={() => nextPage()}
          disabled={!canNextPage}
        >
          {">"}
        </button>
        <button
          className="py-1 px-2 mr-2 shadow rounded bg-white"
          onClick={() => gotoPage(pageCount - 1)}
          disabled={!canNextPage}
        >
          {">>"}
        </button>
      </div>
      <span>
        Page{" "}
        <strong>
          {pageIndex + 1} of {pageOptions.length}
        </strong>
      </span>
      <span>
        go to page
        <input
          className="mx-1 py-1 px-2 shadow rounded"
          type="number"
          defaultValue={pageIndex + 1}
          onChange={(e) => {
            const page = e.target.value ? Number(e.target.value) - 1 : 0
            gotoPage(page)
          }}
          style={{ width: "100px" }}
        />
      </span>
      <select
        value={pageSize}
        className="py-1 px-2 shadow rounded"
        onChange={(e) => {
          setPageSize(Number(e.target.value))
        }}
      >
        {[10, 20, 30, 40, 50].map((pageSize) => (
          <option key={pageSize} value={pageSize}>
            Show {pageSize}
          </option>
        ))}
      </select>
    </div>
  )
}
