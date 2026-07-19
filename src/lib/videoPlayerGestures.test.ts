import { describe, expect, it } from "vitest";
import {
  clamp,
  formatPlaybackTime,
  getVideoOrientation,
  seekTargetFromDrag,
  volumeFromDrag,
} from "./videoPlayerGestures";

describe("getVideoOrientation", () => {
  it("returns landscape for a wide video", () => {
    expect(getVideoOrientation(1920, 1080)).toBe("landscape");
  });

  it("returns portrait for vertical and square videos", () => {
    expect(getVideoOrientation(1080, 1920)).toBe("portrait");
    expect(getVideoOrientation(1000, 1000)).toBe("portrait");
  });

  it("returns null for invalid dimensions", () => {
    expect(getVideoOrientation(0, 1080)).toBeNull();
    expect(getVideoOrientation(undefined, 1080)).toBeNull();
    expect(getVideoOrientation(1920, Number.NaN)).toBeNull();
  });
});

describe("clamp", () => {
  it("clamps values to the inclusive range", () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(2, 0, 1)).toBe(1);
  });

  it("returns the minimum for NaN and naturally clamps infinities", () => {
    expect(clamp(Number.NaN, 0, 1)).toBe(0);
    expect(clamp(Number.NEGATIVE_INFINITY, 0, 1)).toBe(0);
    expect(clamp(Number.POSITIVE_INFINITY, 0, 1)).toBe(1);
  });

  it("rejects non-finite or reversed bounds", () => {
    expect(() => clamp(0, Number.NaN, 1)).toThrow(RangeError);
    expect(() => clamp(0, 0, Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => clamp(0, 2, 1)).toThrow(RangeError);
  });
});

describe("formatPlaybackTime", () => {
  it("formats short and long playback times", () => {
    expect(formatPlaybackTime(0)).toBe("00:00");
    expect(formatPlaybackTime(65000)).toBe("01:05");
    expect(formatPlaybackTime(3665000)).toBe("1:01:05");
  });

  it("normalizes negative and non-finite times to zero", () => {
    expect(formatPlaybackTime(-1000)).toBe("00:00");
    expect(formatPlaybackTime(Number.NaN)).toBe("00:00");
    expect(formatPlaybackTime(Number.POSITIVE_INFINITY)).toBe("00:00");
  });
});

describe("seekTargetFromDrag", () => {
  it("maps a full viewport drag to two minutes for long media", () => {
    expect(seekTargetFromDrag(30000, 300000, 1000, 1000)).toBe(150000);
  });

  it("maps short media across its full duration", () => {
    expect(seekTargetFromDrag(1000, 60000, 500, 1000)).toBe(31000);
  });

  it("clamps the result to the media duration", () => {
    expect(seekTargetFromDrag(59000, 60000, 5000, 1000)).toBe(60000);
    expect(seekTargetFromDrag(1000, 60000, -5000, 1000)).toBe(0);
    expect(seekTargetFromDrag(90000, 60000, 0, 1000)).toBe(60000);
  });

  it("normalizes an invalid start and handles non-finite drag inputs", () => {
    expect(seekTargetFromDrag(Number.NaN, 60000, 0, 1000)).toBe(0);
    expect(seekTargetFromDrag(Number.POSITIVE_INFINITY, 60000, 0, 1000)).toBe(0);
    expect(seekTargetFromDrag(1234, 60000, Number.NaN, 1000)).toBe(1234);
    expect(seekTargetFromDrag(1234, 60000, 100, Number.POSITIVE_INFINITY)).toBe(1234);
  });

  it("keeps a normalized start when duration or viewport is invalid", () => {
    expect(seekTargetFromDrag(1234, 0, 100, 1000)).toBe(1234);
    expect(seekTargetFromDrag(Number.NaN, 0, 100, 1000)).toBe(0);
    expect(seekTargetFromDrag(1234, 60000, 100, 0)).toBe(1234);
  });
});

describe("volumeFromDrag", () => {
  it("adjusts volume by the vertical drag fraction", () => {
    expect(volumeFromDrag(0.5, -100, 500)).toBeCloseTo(0.7);
    expect(volumeFromDrag(0.5, 100, 500)).toBeCloseTo(0.3);
  });

  it("clamps volume to zero and one", () => {
    expect(volumeFromDrag(0.1, 1000, 500)).toBe(0);
    expect(volumeFromDrag(0.9, -1000, 500)).toBe(1);
    expect(volumeFromDrag(2, 0, 500)).toBe(1);
    expect(volumeFromDrag(-1, 0, 500)).toBe(0);
  });

  it("uses one for an invalid start volume", () => {
    expect(volumeFromDrag(Number.NaN, 0, 500)).toBe(1);
    expect(volumeFromDrag(Number.POSITIVE_INFINITY, 0, 500)).toBe(1);
  });

  it("keeps the clamped start volume for invalid drag inputs", () => {
    expect(volumeFromDrag(0.4, 100, 0)).toBe(0.4);
    expect(volumeFromDrag(0.4, Number.NaN, 500)).toBe(0.4);
    expect(volumeFromDrag(2, Number.NaN, 500)).toBe(1);
  });
});

