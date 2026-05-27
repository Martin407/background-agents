import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime, isInactiveSession } from "./time";

describe("time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("isInactiveSession", () => {
    it("returns false for a timestamp exactly 7 days old", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      expect(isInactiveSession(now - sevenDays)).toBe(false);
    });

    it("returns false for a timestamp newer than 7 days", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);
      const sixDays = 6 * 24 * 60 * 60 * 1000;

      expect(isInactiveSession(now - sixDays)).toBe(false);
    });

    it("returns true for a timestamp older than 7 days", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);
      const eightDays = 8 * 24 * 60 * 60 * 1000;

      expect(isInactiveSession(now - eightDays)).toBe(true);
    });

    it("returns false for a future timestamp", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);
      const tomorrow = 1 * 24 * 60 * 60 * 1000;

      expect(isInactiveSession(now + tomorrow)).toBe(false);
    });
  });

  describe("formatRelativeTime", () => {
    it("returns 'just now' for very recent timestamps (less than 1 minute)", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);

      expect(formatRelativeTime(now)).toBe("just now");
      expect(formatRelativeTime(now - 30 * 1000)).toBe("just now");
      expect(formatRelativeTime(now - 59 * 1000)).toBe("just now");
    });

    it("formats minutes correctly", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);

      expect(formatRelativeTime(now - 60 * 1000)).toBe("1m");
      expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe("5m");
      expect(formatRelativeTime(now - 59 * 60 * 1000)).toBe("59m");
    });

    it("formats hours correctly", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);

      expect(formatRelativeTime(now - 60 * 60 * 1000)).toBe("1h");
      expect(formatRelativeTime(now - 5 * 60 * 60 * 1000)).toBe("5h");
      expect(formatRelativeTime(now - 23 * 60 * 60 * 1000)).toBe("23h");
    });

    it("formats days correctly", () => {
      const now = 1000000000000;
      vi.setSystemTime(now);

      expect(formatRelativeTime(now - 24 * 60 * 60 * 1000)).toBe("1d");
      expect(formatRelativeTime(now - 5 * 24 * 60 * 60 * 1000)).toBe("5d");
      expect(formatRelativeTime(now - 365 * 24 * 60 * 60 * 1000)).toBe("365d");
    });
  });
});
