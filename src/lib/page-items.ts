export type PageItem =
  | { index: number; kind: "page" }
  | { kind: "ellipsis"; side: "end" | "start" };

const page = (index: number): PageItem => ({ index, kind: "page" });

/**
 * Page indexes to show: the first, the last and those around the current one.
 * A gap of exactly one page shows that page, since an ellipsis would not be shorter.
 */
export const getPageItems = (
  pageIndex: number,
  pageCount: number,
  siblings: number
): PageItem[] => {
  if (pageCount <= 1) {
    return pageCount === 1 ? [page(0)] : [];
  }

  const last = pageCount - 1;
  const start = Math.max(1, pageIndex - siblings);
  const end = Math.min(last - 1, pageIndex + siblings);
  const items = [page(0)];

  if (start === 2) {
    items.push(page(1));
  } else if (start > 2) {
    items.push({ kind: "ellipsis", side: "start" });
  }

  for (let index = start; index <= end; index += 1) {
    items.push(page(index));
  }

  if (end === last - 2) {
    items.push(page(last - 1));
  } else if (end < last - 2) {
    items.push({ kind: "ellipsis", side: "end" });
  }

  items.push(page(last));

  return items;
};
