import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"
import { memo } from "react"

export const PaginationControls = memo(function PaginationControls(props: {
  canNextPage: boolean
  canPreviousPage: boolean
  gotoPage: (page: number) => void
  nextPage: () => void
  pageCount: number
  pageIndex: number
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
    pageSize,
    previousPage,
    setPageSize,
  } = props
  return (
    <div className="flex justify-between place-items-center">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => gotoPage(0)}
          disabled={!canPreviousPage}
        >
          <ChevronsLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => previousPage()}
          disabled={!canPreviousPage}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => nextPage()}
          disabled={!canNextPage}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => gotoPage(pageCount - 1)}
          disabled={!canNextPage}
        >
          <ChevronsRight />
        </Button>
      </div>
      <span>
        Page{" "}
        <strong>
          {pageIndex + 1} of {pageCount}
        </strong>
      </span>
      <span className="flex gap-2 items-baseline">
        <Label htmlFor="page-input" className="whitespace-nowrap">
          Go to page
        </Label>
        <Input
          id="page-input"
          type="number"
          defaultValue={pageIndex + 1}
          onChange={(e) => {
            const page = e.target.value ? Number(e.target.value) - 1 : 0
            gotoPage(page)
          }}
          style={{ width: "100px" }}
        />
      </span>
      <Select
        value={pageSize.toString()}
        onValueChange={(value) => {
          setPageSize(Number(value))
        }}
      >
        <SelectTrigger className="py-1 px-2 shadow rounded max-w-[10rem]">
          <SelectValue placeholder={`Show ${pageSize}`} />
        </SelectTrigger>
        <SelectContent>
          {pageSizeOptions.map((pageSize) => (
            <SelectItem key={pageSize} value={pageSize.toString()}>
              Show {pageSize}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

export default PaginationControls

const pageSizeOptions = [10, 20, 30, 40, 50]
