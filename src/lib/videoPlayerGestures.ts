export type VideoOrientation = "landscape" | "portrait";

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    throw new RangeError("clamp bounds must be finite and ordered");
  }
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

export function getVideoOrientation(width?: number, height?: number): VideoOrientation | null {
  if (typeof width !== "number" || typeof height !== "number" || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return width > height ? "landscape" : "portrait";
}

export function formatPlaybackTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) {
    return "00:00";
  }
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const paddedSeconds = String(seconds).padStart(2, "0");
  const paddedMinutes = String(minutes).padStart(2, "0");
  return hours > 0 ? `${hours}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}

export function seekTargetFromDrag(
  startPositionMillis: number,
  durationMillis: number,
  deltaX: number,
  viewportWidth: number,
): number {
  const normalizedStart = Number.isFinite(startPositionMillis) ? startPositionMillis : 0;
  if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
    return normalizedStart;
  }
  const clampedStart = clamp(normalizedStart, 0, durationMillis);
  if (!Number.isFinite(deltaX) || !Number.isFinite(viewportWidth) || viewportWidth <= 0) {
    return clampedStart;
  }
  const seekRange = Math.min(durationMillis, 120000);
  return clamp(clampedStart + (deltaX / viewportWidth) * seekRange, 0, durationMillis);
}

export function volumeFromDrag(startVolume: number, deltaY: number, viewportHeight: number): number {
  const normalizedStart = Number.isFinite(startVolume) ? startVolume : 1;
  const clampedStart = clamp(normalizedStart, 0, 1);
  if (!Number.isFinite(deltaY) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) {
    return clampedStart;
  }
  return clamp(clampedStart - deltaY / viewportHeight, 0, 1);
}
