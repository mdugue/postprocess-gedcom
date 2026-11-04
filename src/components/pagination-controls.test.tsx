import { describe, expect, mock, test } from "bun:test";

import { fireEvent, render, screen } from "@testing-library/react";

import { PaginationControls } from "@/components/pagination-controls";

const renderControls = () => {
  const gotoPage = mock((_page: number) => {});

  render(
    <PaginationControls
      canNextPage
      canPreviousPage={false}
      gotoPage={gotoPage}
      nextPage={() => {}}
      pageCount={3}
      pageIndex={0}
      pageSize={50}
      previousPage={() => {}}
      setPageSize={() => {}}
    />
  );

  return { gotoPage, input: screen.getByLabelText("Gehe zu Seite") };
};

describe("PaginationControls", () => {
  test("jumps to a whole page number", () => {
    const { gotoPage, input } = renderControls();

    fireEvent.change(input, { target: { value: "2" } });

    expect(gotoPage).toHaveBeenCalledWith(1);
  });

  test.each(["1.5", "0", "4", ""])("ignores the page number %p", (value) => {
    const { gotoPage, input } = renderControls();

    fireEvent.change(input, { target: { value } });

    expect(gotoPage).not.toHaveBeenCalled();
  });
});
