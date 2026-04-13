import { describe, expect, it } from "vitest";
import {
  deriveArchiveIdFromSession,
  formatTimestamp,
  isValidArchiveTimestamp,
  sanitizeFileName
} from "./archives-utils.js";

describe("archives-utils", () => {
  it("formats timestamps with archive directory precision", () => {
    const date = new Date(2026, 2, 25, 3, 4, 5, 678);
    expect(formatTimestamp(date)).toBe("2026-03-25-03-04-05");
  });

  it("sanitizes filenames and preserves lowercase extension", () => {
    expect(sanitizeFileName("My Report #%?.MD")).toBe("my_report.md");
  });

  it("falls back to unnamed when basename is stripped out", () => {
    expect(sanitizeFileName("###.TXT")).toBe("unnamed.txt");
  });

  it("derives archive id from session key last segment", () => {
    expect(
      deriveArchiveIdFromSession("agent:demo:user:alice:direct:chat-123", undefined)
    ).toBe("chat-123");
  });

  it("falls back to sessionId when session key is unavailable", () => {
    expect(deriveArchiveIdFromSession(undefined, "SESSION-777")).toBe("SESSION-777");
  });

  it("returns undefined when both session key and id are missing", () => {
    expect(deriveArchiveIdFromSession(undefined, undefined)).toBeUndefined();
  });

  it("validates archive timestamp pattern", () => {
    expect(isValidArchiveTimestamp("2026-03-25-03-04-05")).toBe(true);
    expect(isValidArchiveTimestamp("2026-03-25")).toBe(false);
  });
});
