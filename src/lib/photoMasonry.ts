import type { MediaItem } from "@/api/types";

export type PhotoDim = { w: number; h: number };

export const PHOTO_MASONRY_GAP = 8;
export const PHOTO_MASONRY_MIN_COL_PX = 108;
export const PHOTO_MASONRY_MAX_COLS = 5;

export function photoMasonryColumnCount(containerWidth: number): number {
  if (containerWidth <= 0) return 2;
  const raw = Math.floor((containerWidth + PHOTO_MASONRY_GAP) / (PHOTO_MASONRY_MIN_COL_PX + PHOTO_MASONRY_GAP));
  return Math.max(2, Math.min(PHOTO_MASONRY_MAX_COLS, raw));
}

export function photoMasonryColumnWidth(containerWidth: number, cols: number): number {
  return (containerWidth - (cols - 1) * PHOTO_MASONRY_GAP) / cols;
}

export function resolvePhotoDim(item: MediaItem, dims: ReadonlyMap<number, PhotoDim>): PhotoDim {
  const loaded = dims.get(item.id);
  if (loaded && loaded.w > 0 && loaded.h > 0) return loaded;
  if (item.width > 0 && item.height > 0) return { w: item.width, h: item.height };
  return { w: 3, h: 4 };
}

export function estimatePhotoCardHeight(
  item: MediaItem,
  colWidth: number,
  dims: ReadonlyMap<number, PhotoDim>,
): number {
  const { w, h } = resolvePhotoDim(item, dims);
  return (colWidth * h) / w;
}

/** Shortest-column-first masonry distribution. */
export function distributePhotosToColumns(
  items: MediaItem[],
  cols: number,
  colWidth: number,
  dims: ReadonlyMap<number, PhotoDim>,
): MediaItem[][] {
  const columns: MediaItem[][] = Array.from({ length: cols }, () => []);
  const heights = Array<number>(cols).fill(0);

  for (const item of items) {
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(item);
    heights[target] += estimatePhotoCardHeight(item, colWidth, dims) + PHOTO_MASONRY_GAP;
  }

  return columns;
}
