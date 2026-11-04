import { describe, expect, test } from "bun:test";

import { getPageItems } from "@/lib/page-items";

const summarize = (pageIndex: number, pageCount: number, siblings: number) =>
  getPageItems(pageIndex, pageCount, siblings).map((item) =>
    item.kind === "page" ? item.index : "…"
  );

describe("getPageItems", () => {
  test("handles empty and single-page results", () => {
    expect(summarize(0, 0, 1)).toEqual([]);
    expect(summarize(0, 1, 1)).toEqual([0]);
    expect(summarize(0, 2, 1)).toEqual([0, 1]);
  });

  test("shows every page when nothing can be collapsed", () => {
    expect(summarize(2, 5, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  test("collapses distant pages on both sides", () => {
    expect(summarize(50, 93, 1)).toEqual([0, "…", 49, 50, 51, "…", 92]);
    expect(summarize(50, 93, 0)).toEqual([0, "…", 50, "…", 92]);
  });

  test("stays stable at both ends", () => {
    expect(summarize(0, 93, 1)).toEqual([0, 1, "…", 92]);
    expect(summarize(92, 93, 1)).toEqual([0, "…", 91, 92]);
  });
});
