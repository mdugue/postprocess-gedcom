import { FlexRender } from "@tanstack/react-table";
import type { Header } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
  FunnelIcon,
} from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { TableHead } from "@/components/ui/table";
import { setColumnVisible } from "@/lib/record-table";
import type { Features } from "@/lib/record-table";

const ariaSort = { asc: "ascending", desc: "descending" } as const;
const sortIcons = { asc: ArrowUpIcon, desc: ArrowDownIcon } as const;

const filterTextSchema = z.string().catch("");

const ColumnMenu = <T extends object>({
  header,
}: {
  header: Header<Features, T>;
}) => {
  const { column } = header;
  const label = String(column.columnDef.header);
  const sorted = column.getIsSorted();
  const filterText = filterTextSchema.parse(column.getFilterValue());
  const SortIcon = sorted === false ? ChevronsUpDownIcon : sortIcons[sorted];

  return (
    <Popover>
      <PopoverTrigger
        render={<Button className="-ml-2.5" size="sm" variant="ghost" />}
      >
        <FlexRender header={header} />
        {filterText !== "" && <FunnelIcon data-icon="inline-end" />}
        <SortIcon data-icon="inline-end" />
      </PopoverTrigger>
      <PopoverContent align="start">
        <div className="flex flex-col gap-1">
          {column.getCanFilter() && (
            <>
              <Input
                aria-label={`${label} filtern`}
                onChange={(event) => {
                  column.setFilterValue(event.target.value);
                  column.table.setPageIndex(0);
                }}
                placeholder={`${label} filtern …`}
                value={filterText}
              />
              <Separator />
            </>
          )}
          <div className="flex flex-col items-start">
            <Button
              onClick={() => {
                column.toggleSorting(false);
              }}
              size="sm"
              variant="ghost"
            >
              <ArrowUpIcon data-icon="inline-start" />
              Aufsteigend
            </Button>
            <Button
              onClick={() => {
                column.toggleSorting(true);
              }}
              size="sm"
              variant="ghost"
            >
              <ArrowDownIcon data-icon="inline-start" />
              Absteigend
            </Button>
            {/* Stays focusable so keyboard focus survives clearing the sort. */}
            <Button
              disabled={sorted === false}
              focusableWhenDisabled
              onClick={() => {
                column.clearSorting();
              }}
              size="sm"
              variant="ghost"
            >
              <ChevronsUpDownIcon data-icon="inline-start" />
              Sortierung aufheben
            </Button>
            <Button
              onClick={() => {
                setColumnVisible(column, false);
              }}
              size="sm"
              variant="ghost"
            >
              <EyeOffIcon data-icon="inline-start" />
              Ausblenden
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ColumnHeader = <T extends object>({
  header,
}: {
  header: Header<Features, T>;
}) => {
  const { column } = header;
  const sorted = column.getIsSorted();

  return (
    <TableHead
      aria-sort={sorted === false ? undefined : ariaSort[sorted]}
      className="w-(--column-width)"
      style={{ "--column-width": `${header.getSize()}px` }}
    >
      {column.getCanSort() ? (
        <ColumnMenu header={header} />
      ) : (
        <span className="sr-only">
          <FlexRender header={header} />
        </span>
      )}
      {/* Pointer-only affordance: keyboard users are not offered a resize target. */}
      <button
        aria-hidden
        className="hover:bg-border absolute inset-y-2 right-0 w-1 cursor-col-resize rounded-full transition-colors"
        onDoubleClick={() => {
          column.resetSize();
        }}
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        tabIndex={-1}
        type="button"
      />
    </TableHead>
  );
};
