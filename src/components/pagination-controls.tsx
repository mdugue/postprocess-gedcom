import { useId, useState } from "react";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPageItems } from "@/lib/page-items";

const pageSizeItems = [25, 50, 100, 200].map((value) => ({
  label: `${value} anzeigen`,
  value,
}));

export const PaginationControls = ({
  canNextPage,
  canPreviousPage,
  gotoPage,
  nextPage,
  pageCount,
  pageIndex,
  pageSize,
  previousPage,
  setPageSize,
}: {
  canNextPage: boolean;
  canPreviousPage: boolean;
  gotoPage: (page: number) => void;
  nextPage: () => void;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  previousPage: () => void;
  setPageSize: (size: number) => void;
}) => {
  const isMobile = useIsMobile();
  const pageInputId = useId();
  const pageSizeId = useId();
  // Keeps partial input like an emptied field while typing a new page number.
  const [pageDraft, setPageDraft] = useState<string>();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <Pagination aria-label="Seiten">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                aria-label="Vorherige Seite"
                disabled={!canPreviousPage}
                onClick={previousPage}
                text="Zurück"
              />
            </PaginationItem>
            {getPageItems(pageIndex, pageCount, isMobile ? 0 : 1).map((item) =>
              item.kind === "page" ? (
                <PaginationItem key={item.index}>
                  <PaginationLink
                    aria-label={`Seite ${item.index + 1}`}
                    isActive={item.index === pageIndex}
                    onClick={() => {
                      gotoPage(item.index);
                    }}
                  >
                    {item.index + 1}
                  </PaginationLink>
                </PaginationItem>
              ) : (
                <PaginationItem key={item.side}>
                  <PaginationEllipsis />
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                aria-label="Nächste Seite"
                disabled={!canNextPage}
                onClick={nextPage}
                text="Weiter"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:block">
          <Field className="w-fit" orientation="horizontal">
            <FieldLabel className="whitespace-nowrap" htmlFor={pageInputId}>
              Gehe zu Seite
            </FieldLabel>
            <Input
              className="w-20"
              id={pageInputId}
              max={pageCount}
              min={1}
              onBlur={() => {
                setPageDraft(undefined);
              }}
              onChange={({ target: { value } }) => {
                setPageDraft(value);

                const page = Number(value);

                if (value !== "" && page >= 1 && page <= pageCount) {
                  gotoPage(page - 1);
                }
              }}
              type="number"
              value={pageDraft ?? pageIndex + 1}
            />
          </Field>
        </div>
        <Field className="w-fit" orientation="horizontal">
          <FieldLabel className="sr-only" htmlFor={pageSizeId}>
            Einträge pro Seite
          </FieldLabel>
          <Select
            items={pageSizeItems}
            onValueChange={(value) => {
              if (value !== null) {
                setPageSize(value);
              }
            }}
            value={pageSize}
          >
            <SelectTrigger id={pageSizeId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
};
