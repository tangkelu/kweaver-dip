/**
 * Fixed marker used to start hidden attachment context block.
 */
export const HIDDEN_ATTACHMENT_CONTEXT_START = "<!-- DIP_HIDDEN_ATTACHMENTS_START -->";

/**
 * Fixed marker used to end hidden attachment context block.
 */
export const HIDDEN_ATTACHMENT_CONTEXT_END = "<!-- DIP_HIDDEN_ATTACHMENTS_END -->";

/**
 * Builds one fixed hidden attachment context block.
 *
 * @param paths Uploaded file paths.
 * @returns Serialized hidden block.
 */
export function buildHiddenAttachmentContextBlock(paths: string[]): string {
  const numbered = paths.map((path, index) => `${index + 1}. ${path}`);

  return [
    HIDDEN_ATTACHMENT_CONTEXT_START,
    "ATTACHMENT_PATHS:",
    ...numbered,
    "ATTACHMENT_INSTRUCTION:",
    "You must read every listed file path using available file-reading tools before answering the user.",
    "If any file cannot be read, explicitly report which path failed and why.",
    "When you output file information to the user (summaries, citations, lists), show only each file's name (the final path segment), never the full original path.",
    HIDDEN_ATTACHMENT_CONTEXT_END
  ].join("\n");
}

/**
 * Extracts attachment paths from one hidden attachment context block.
 *
 * @param text Raw message text that may contain the hidden block.
 * @returns Ordered attachment paths parsed from the hidden block.
 */
export function extractHiddenAttachmentPaths(text: string): string[] {
  const startIndex = text.indexOf(HIDDEN_ATTACHMENT_CONTEXT_START);
  if (startIndex < 0) {
    return [];
  }

  const endIndex = text.indexOf(HIDDEN_ATTACHMENT_CONTEXT_END, startIndex);
  if (endIndex < 0) {
    return [];
  }

  const block = text.slice(startIndex, endIndex + HIDDEN_ATTACHMENT_CONTEXT_END.length);
  const lines = block.split("\n");
  const markerIndex = lines.findIndex((line) => line.trim() === "ATTACHMENT_PATHS:");

  if (markerIndex < 0) {
    return [];
  }

  const paths: string[] = [];

  for (const line of lines.slice(markerIndex + 1)) {
    const trimmedLine = line.trim();

    if (
      trimmedLine === "" ||
      trimmedLine === "ATTACHMENT_INSTRUCTION:" ||
      trimmedLine === HIDDEN_ATTACHMENT_CONTEXT_END
    ) {
      break;
    }

    const matched = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (matched?.[1] !== undefined) {
      const path = matched[1].trim();

      if (path !== "") {
        paths.push(path);
      }
    }
  }

  return paths;
}

/**
 * Removes hidden attachment context block from one text payload.
 *
 * @param text Raw message text.
 * @returns Text without hidden context block.
 */
export function stripHiddenAttachmentContextBlock(text: string): string {
  const startIndex = text.indexOf(HIDDEN_ATTACHMENT_CONTEXT_START);
  if (startIndex < 0) {
    return text;
  }

  const endIndex = text.indexOf(HIDDEN_ATTACHMENT_CONTEXT_END, startIndex);
  if (endIndex < 0) {
    return text;
  }

  const before = text.slice(0, startIndex).replace(/\n{3,}$/g, "\n\n").trimEnd();
  const after = text
    .slice(endIndex + HIDDEN_ATTACHMENT_CONTEXT_END.length)
    .replace(/^\s*\n+/g, "");

  if (before === "") {
    return after;
  }

  if (after === "") {
    return before;
  }

  return `${before}\n\n${after}`;
}
