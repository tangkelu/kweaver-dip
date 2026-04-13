import { describe, expect, it } from "vitest";

import {
  buildHiddenAttachmentContextBlock,
  extractHiddenAttachmentPaths,
  stripHiddenAttachmentContextBlock
} from "./hidden-attachment-context";

describe("extractHiddenAttachmentPaths", () => {
  it("returns attachment paths from hidden context blocks", () => {
    const text = [
      "summarize these files",
      "",
      buildHiddenAttachmentContextBlock(["tmp/chat-1/a.txt", "tmp/chat-1/b.md"])
    ].join("\n");

    expect(extractHiddenAttachmentPaths(text)).toEqual([
      "tmp/chat-1/a.txt",
      "tmp/chat-1/b.md"
    ]);
  });

  it("returns empty array when hidden block is absent", () => {
    expect(extractHiddenAttachmentPaths("plain text")).toEqual([]);
  });
});

describe("stripHiddenAttachmentContextBlock", () => {
  it("removes the hidden block and keeps the visible message", () => {
    const text = [
      "summarize these files",
      "",
      buildHiddenAttachmentContextBlock(["tmp/chat-1/a.txt"])
    ].join("\n");

    expect(stripHiddenAttachmentContextBlock(text)).toBe("summarize these files");
  });
});
