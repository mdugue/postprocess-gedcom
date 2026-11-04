import { FlexRender } from "@tanstack/react-table";
import type {
  ColumnSort,
  Table as TableType,
  TableOptions,
} from "@tanstack/react-table";
import { cn } from "cn";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  SearchIcon,
} from "lucide-react";
import { useEffect } from "react";

import { ColumnHeader } from "@/components/column-header";
import { IconButton } from "@/components/icon-button";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { setColumnVisible, useAppTable } from "@/lib/record-table";
import type { Features, RecordTableMeta } from "@/lib/record-table";

interface RecordRow {
  id: string;
}

interface RowChange {
  type: "delete" | "update";
}

const INITIAL_STATE = { pagination: { pageIndex: 0, pageSize: 50 } };
const ACTIONS_COLUMN_ID = "actions";

const rowVariants = { delete: "deleted", update: "updated" } as const;
const cardVariants = { delete: "removed", update: "success" } as const;

const NoResults = () => (
  <Empty size="sm">
    <EmptyHeader>
      <EmptyTitle>Keine Einträge gefunden</EmptyTitle>
    </EmptyHeader>
  </Empty>
);

/** Fills the available width; below the columns' total width it scrolls. */
const RecordGrid = <T extends RecordRow>({
  changes,
  table,
}: {
  changes: Record<string, RowChange>;
  table: TableType<Features, T>;
}) => {
  const { rows } = table.getRowModel();

  return (
    <div className="col-span-full min-h-0 overflow-hidden rounded-md border">
      <Table
        className="min-w-(--table-width) table-fixed"
        style={{ "--table-width": `${table.getTotalSize()}px` }}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <ColumnHeader header={header} key={header.id} />
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length}>
                <NoResults />
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const change = changes[row.id]?.type;

            return (
              <TableRow
                key={row.id}
                variant={change ? rowVariants[change] : "default"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

/** Phone layout: the same columns, one labelled card per record. */
const RecordCards = <T extends RecordRow>({
  changes,
  table,
}: {
  changes: Record<string, RowChange>;
  table: TableType<Features, T>;
}) => {
  const { rows } = table.getRowModel();

  if (rows.length === 0) {
    return (
      <div className="col-span-full min-h-0">
        <NoResults />
      </div>
    );
  }

  return (
    <ul className="col-span-full flex min-h-0 flex-col gap-2 overflow-auto p-px">
      {rows.map((row) => {
        const change = changes[row.id]?.type;
        const cells = row.getAllCells();

        return (
          <li key={row.id}>
            <Card size="sm" variant={change ? cardVariants[change] : "default"}>
              <CardContent>
                <dl
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2",
                    change === "delete" &&
                      "text-muted-foreground [&_input:not(:placeholder-shown)]:line-through [&>div>*:not(:has(input:placeholder-shown))]:line-through"
                  )}
                >
                  {cells.flatMap((cell) =>
                    cell.column.id === ACTIONS_COLUMN_ID
                      ? []
                      : [
                          <div className="contents" key={cell.id}>
                            <dt className="text-muted-foreground">
                              {String(cell.column.columnDef.header)}
                            </dt>
                            <dd>
                              <FlexRender cell={cell} />
                            </dd>
                          </div>,
                        ]
                  )}
                </dl>
              </CardContent>
              <CardFooter>
                {cells.flatMap((cell) =>
                  cell.column.id === ACTIONS_COLUMN_ID
                    ? [<FlexRender cell={cell} key={cell.id} />]
                    : []
                )}
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
};

const ColumnsMenu = <T extends RecordRow>({
  table,
}: {
  table: TableType<Features, T>;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" />}>
      Spalten
      <ChevronDownIcon data-icon="inline-end" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuGroup>
        {table.getAllLeafColumns().flatMap((column) =>
          column.getCanHide()
            ? [
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  key={column.id}
                  onCheckedChange={(visible) => {
                    setColumnVisible(column, visible);
                  }}
                >
                  {String(column.columnDef.header)}
                </DropdownMenuCheckboxItem>,
              ]
            : []
        )}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

/** Phones have no column headers, so sorting needs its own control. */
const SortControls = <T extends RecordRow>({
  current,
  table,
}: {
  current: ColumnSort | undefined;
  table: TableType<Features, T>;
}) => {
  const items = [
    { label: "Unsortiert", value: null },
    ...table
      .getAllLeafColumns()
      .flatMap((column) =>
        column.getCanSort()
          ? [{ label: String(column.columnDef.header), value: column.id }]
          : []
      ),
  ];

  const isDescending = current?.desc === true;

  return (
    <ButtonGroup>
      <Select
        items={items}
        onValueChange={(id) => {
          table.setSorting(id === null ? [] : [{ desc: isDescending, id }]);
        }}
        value={current?.id ?? null}
      >
        <SelectTrigger aria-label="Sortieren nach">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.label} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <IconButton
        disabled={current === undefined}
        label={isDescending ? "Absteigend sortiert" : "Aufsteigend sortiert"}
        onClick={() => {
          if (current) {
            table.setSorting([{ desc: !current.desc, id: current.id }]);
          }
        }}
        variant="outline"
      >
        {isDescending ? <ArrowDownIcon /> : <ArrowUpIcon />}
      </IconButton>
    </ButtonGroup>
  );
};

export const RecordTable = <T extends RecordRow>({
  changes,
  columns,
  data,
  meta,
}: {
  changes: Record<string, RowChange>;
  columns: TableOptions<Features, T>["columns"];
  data: T[];
  meta: RecordTableMeta;
}) => {
  const isMobile = useIsMobile();

  const table = useAppTable({
    columns,
    data,
    initialState: INITIAL_STATE,
    meta,
  });

  const { pageIndex, pageSize } = table.state.pagination;

  // Column filters have no controls on phones and must not stay active unseen.
  useEffect(() => {
    if (isMobile) {
      table.resetColumnFilters(true);
    }
  }, [isMobile, table]);

  // The parts are direct items of the grid in the surrounding tabs, which keeps
  // the tab list, search and pagination aligned across both tables.
  return (
    <>
      <div className="col-span-2 md:col-span-1">
        <InputGroup>
          <InputGroupInput
            aria-label="Alle Spalten durchsuchen"
            onChange={(event) => {
              table.setGlobalFilter(event.target.value);
            }}
            placeholder="Suchen …"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>
      {isMobile ? (
        <div className="col-span-full">
          <SortControls current={table.state.sorting[0]} table={table} />
        </div>
      ) : (
        <ColumnsMenu table={table} />
      )}
      {isMobile ? (
        <RecordCards changes={changes} table={table} />
      ) : (
        <RecordGrid changes={changes} table={table} />
      )}
      <div className="col-span-full">
        <PaginationControls
          canNextPage={table.getCanNextPage()}
          canPreviousPage={table.getCanPreviousPage()}
          gotoPage={table.setPageIndex}
          nextPage={table.nextPage}
          pageCount={table.getPageCount()}
          pageIndex={pageIndex}
          pageSize={pageSize}
          previousPage={table.previousPage}
          setPageSize={table.setPageSize}
        />
      </div>
    </>
  );
};
