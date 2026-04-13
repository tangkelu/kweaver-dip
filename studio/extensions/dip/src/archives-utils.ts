import path from "node:path";

/** Extension to Content-Type for archive file streaming. */
export const ARCHIVES_MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4"
};

/**
 * Formats a date as `YYYY-MM-DD-HH-mm-ss` for archive directory names.
 *
 * @param date Instant to format.
 * @returns Timestamp string segment.
 */
export function formatTimestamp(date: Date): string {
  const Y = date.getFullYear();
  const M = String(date.getMonth() + 1).padStart(2, "0");
  const D = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${Y}-${M}-${D}-${h}-${m}-${s}`;
}

/**
 * Normalizes a basename for stable archive paths.
 *
 * @param name Original file name including extension.
 * @returns Sanitized file name with lowercase extension.
 */
export function sanitizeFileName(name: string): string {
  const ext = path.extname(name);
  const base = path.basename(name, ext);
  const sanitizedBase = base
    .toLowerCase()
    .replace(/[\s\t\n]+/g, "_")
    .replace(/[<>:"/\\|?*#%]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return (sanitizedBase || "unnamed") + ext.toLowerCase();
}

/**
 * Derives the archive identifier from the session metadata.
 *
 * @param sessionKey Session key string such as `agent:a:user:b:direct:chat-1`.
 * @param fallbackSessionId Optional fallback session id when no key is available.
 * @returns Sanitized archive id or `undefined` if it cannot be derived.
 */
export function deriveArchiveIdFromSession(
  sessionKey?: string | null,
  fallbackSessionId?: string | null
): string | undefined {
  const sources: Array<string | null | undefined> = [sessionKey, fallbackSessionId];

  for (const source of sources) {
    if (typeof source !== "string") continue;
    const trimmed = source.trim();
    if (!trimmed) continue;

    const lastSegment = trimmed.split(":").filter(Boolean).pop();
    if (!lastSegment) continue;

    const sanitized = lastSegment.replace(/[^a-zA-Z0-9-_]/g, "_");
    if (sanitized.length > 0) {
      return sanitized;
    }
  }

  return undefined;
}

/**
 * Checks whether a timestamp string matches the archive protocol format.
 *
 * @param value Timestamp candidate.
 * @returns True when the value is `YYYY-MM-DD-HH-MM-SS`.
 */
export function isValidArchiveTimestamp(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/.test(value);
}
