import {
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  createTableHook,
  filterFn_includesString,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";
import type { Column, Table } from "@tanstack/react-table";

import type { TransformationActions } from "@/hooks/use-transformations";
import { toDisplayDate } from "@/lib/transformations";
import type { Transformations } from "@/lib/transformations";

export interface RecordTableMeta {
  actions: TransformationActions;
  transformations: Transformations;
}

/**
 * Matches the displayed format, so dates match `12.06.1975` and not their raw form.
 * Compares source values: rows must not vanish while their pending edit is typed.
 */
const matchesDisplayedText = (
  row: { getValue: (columnId: string) => Date | string | undefined },
  columnId: string,
  filterValue: string
) => {
  const value = row.getValue(columnId);

  const text = value instanceof Date ? toDisplayDate(value) : (value ?? "");

  return text.toLowerCase().includes(filterValue.toLowerCase());
};

const features = tableFeatures({
  columnFilteringFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  filterFns: { includesString: filterFn_includesString, matchesDisplayedText },
  filteredRowModel: createFilteredRowModel(),
  globalFilteringFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowPaginationFeature,
  rowSortingFeature,
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
  sortedRowModel: createSortedRowModel(),
  tableMeta: metaHelper<RecordTableMeta>(),
});

export type Features = typeof features;

export const { createAppColumnHelper, useAppTable } = createTableHook({
  columnResizeMode: "onChange",
  // Many records lack dates, which must not push the dated ones out of view.
  defaultColumn: { sortUndefined: "last" },
  features,
  // The default only searches string and number columns, which would skip dates.
  getColumnCanGlobalFilter: () => true,
  getRowId: (row: { id: string }) => row.id,
  globalFilterFn: "matchesDisplayedText",
});

/** A hidden column has no controls left, so its filter and sort must not stay active unseen. */
export const setColumnVisible = <T extends object>(
  column: Column<Features, T>,
  visible: boolean
) => {
  if (!visible && column.getIsFiltered()) {
    column.setFilterValue(undefined);
  }

  if (!visible && column.getIsSorted() !== false) {
    column.clearSorting();
  }

  column.toggleVisibility(visible);
};

export const getTableMeta = <T extends object>(
  table: Table<Features, T>
): RecordTableMeta => {
  const { meta } = table.options;

  if (!meta) {
    throw new Error("Die Tabelle wurde ohne Meta-Daten erzeugt.");
  }

  return meta;
};
