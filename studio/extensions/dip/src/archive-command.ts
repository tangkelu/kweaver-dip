import fs from "node:fs/promises";
import type { Stats } from "node:fs";
import path from "node:path";
import {
  deriveArchiveIdFromSession,
  formatTimestamp,
  isValidArchiveTimestamp,
  sanitizeFileName
} from "./archives-utils.js";

/** Accepted archive command variants. */
export type ArchiveCommandKind = "plan" | "file";

export interface ArchiveCommandOptions {
  kind: ArchiveCommandKind;
  workspaceDir: string;
  sessionKey?: string | null;
  sessionId?: string | null;
  sourcePath: string;
  displayName?: string;
  timestamp?: string;
}

export interface ArchiveOperationResult {
  kind: ArchiveCommandKind;
  archiveId: string;
  archiveRoot: string;
  archiveRootWithSlash: string;
  relativePath: string;
  subpath: string;
  displayName: string;
  timestamp?: string;
  fileName: string;
}

export class ArchiveProtocolError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ArchiveProtocolError";
  }
}

/**
 * Executes archive protocol actions for a source file written by the agent.
 */
export async function executeArchiveCommand({
  kind,
  workspaceDir,
  sessionKey,
  sessionId,
  sourcePath,
  displayName,
  timestamp
}: ArchiveCommandOptions): Promise<ArchiveOperationResult> {
  const archiveId = deriveArchiveIdFromSession(sessionKey, sessionId);
  if (!archiveId) {
    throw new ArchiveProtocolError(
      "INVALID_SESSION",
      "Unable to derive ARCHIVE_ID from session context"
    );
  }

  const resolvedWorkspace = path.resolve(workspaceDir);
  const resolvedSource = path.resolve(workspaceDir, sourcePath);
  const rel = path.relative(resolvedWorkspace, resolvedSource);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new ArchiveProtocolError(
      "INVALID_SOURCE",
      `Source path must live inside workspace (got: ${sourcePath})`
    );
  }

  const stat = await safeStat(resolvedSource);
  if (!stat || (!stat.isFile() && !stat.isDirectory())) {
    throw new ArchiveProtocolError("MISSING_SOURCE", `Source file or directory not found: ${sourcePath}`);
  }

  const isDirectory = stat.isDirectory();
  if (!isDirectory) {
    const content = await fs.readFile(resolvedSource);
    if (content.length === 0) {
      throw new ArchiveProtocolError("EMPTY_SOURCE", "Source file is empty; nothing to archive");
    }
  }

  const archiveRoot = path.join(resolvedWorkspace, "archives", archiveId);
  const sourceBaseName = path.basename(sourcePath);
  const defaultDisplay = sourceBaseName || "output";
  const display = displayName && displayName.trim().length > 0 ? displayName.trim() : defaultDisplay;
  const sanitizedName = kind === "plan" ? "PLAN.md" : sanitizeFileName(sourceBaseName || display);
  let targetDir = archiveRoot;
  let subpath = "PLAN.md";
  let effectiveTimestamp: string | undefined;

  if (kind === "file") {
    const bucketTimestamp = timestamp ?? formatTimestamp(new Date());
    if (!isValidArchiveTimestamp(bucketTimestamp)) {
      throw new ArchiveProtocolError(
        "INVALID_TIMESTAMP",
        "Timestamp must be YYYY-MM-DD-HH-MM-SS"
      );
    }
    effectiveTimestamp = bucketTimestamp;
    targetDir = path.join(archiveRoot, bucketTimestamp);
    subpath = path.posix.join(bucketTimestamp, sanitizedName);
  }

  const targetPath = path.join(targetDir, sanitizedName);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  if (resolvedSource !== targetPath) {
    try {
      await fs.rename(resolvedSource, targetPath);
    } catch (err: any) {
      if (err.code === "EXDEV" || err.code === "ENOTEMPTY") {
        if (isDirectory) {
          await fs.cp(resolvedSource, targetPath, { recursive: true });
          await fs.rm(resolvedSource, { recursive: true, force: true });
        } else {
          await fs.copyFile(resolvedSource, targetPath);
          await fs.unlink(resolvedSource);
        }
      } else {
        throw err;
      }
    }
  }

  if (!isDirectory) {
    const written = await fs.readFile(targetPath);
    if (written.length === 0) {
      throw new ArchiveProtocolError(
        "EMPTY_TARGET",
        "Archive target is empty after copy"
      );
    }
  }

  const posixRelativePath = path.posix.join("archives", archiveId, subpath);

  return {
    kind,
    archiveId,
    archiveRoot: `archives/${archiveId}`,
    archiveRootWithSlash: `archives/${archiveId}/`,
    relativePath: posixRelativePath,
    subpath,
    displayName: display,
    timestamp: effectiveTimestamp,
    fileName: sanitizedName
  };
}

async function safeStat(filePath: string): Promise<Stats | undefined> {
  try {
    return await fs.stat(filePath);
  } catch (err: any) {
    if (err?.code === "ENOENT") return undefined;
    throw err;
  }
}

/**
 * Formats the final command output containing archive status and card payload.
 */
export function formatArchiveResponseOutput(result: ArchiveOperationResult): string {
  const card = {
    type: "archive_grid",
    data: {
      type: "file",
      archive_root: result.archiveRoot,
      subpath: result.subpath,
      name: result.displayName
    }
  };

  const payload = JSON.stringify(card, null, 2);
  return `\`\`\`json\n${payload}\n\`\`\``;
}
