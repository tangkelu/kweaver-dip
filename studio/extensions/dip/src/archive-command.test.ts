import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import {
  executeArchiveCommand,
  formatArchiveResponseOutput,
  ArchiveProtocolError
} from "./archive-command.js";

describe("archive-command", () => {
  let workspaceDir: string;

  beforeEach(async () => {
    workspaceDir = await fs.mkdtemp(path.join(tmpdir(), "archive-command-"));
  });

  afterEach(async () => {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  });

  it("archives plan documents into the PLAN.md slot", async () => {
    const source = path.join(workspaceDir, "drafts", "PLAN.md");
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, "# plan");

    const result = await executeArchiveCommand({
      kind: "plan",
      workspaceDir,
      sessionKey: "agent:demo:user:u:direct:chat-1",
      sessionId: undefined,
      sourcePath: "drafts/PLAN.md"
    });

    expect(result.archiveId).toBe("chat-1");
    expect(result.relativePath).toBe("archives/chat-1/PLAN.md");
    const archived = await fs.readFile(path.join(workspaceDir, "archives", "chat-1", "PLAN.md"), "utf8");
    expect(archived).toBe("# plan");

    // Verify source is moved (deleted from original location)
    const sourceExists = await fs.access(source).then(() => true).catch(() => false);
    expect(sourceExists).toBe(false);
  });

  it("archives normal files with sanitized names and timestamp buckets", async () => {
    const source = path.join(workspaceDir, "output", "My Report #%?.MD");
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, "report body");

    const timestamp = "2026-03-25-03-04-05";
    const result = await executeArchiveCommand({
      kind: "file",
      workspaceDir,
      sessionKey: "agent:demo:user:u:direct:chat-1",
      sessionId: undefined,
      sourcePath: "output/My Report #%?.MD",
      displayName: "Quarterly Report",
      timestamp
    });

    expect(result.timestamp).toBe(timestamp);
    expect(result.subpath).toBe(`${timestamp}/my_report.md`);
    const archived = await fs.readFile(
      path.join(workspaceDir, "archives", "chat-1", timestamp, "my_report.md"),
      "utf8"
    );
    expect(archived).toBe("report body");
    expect(result.displayName).toBe("Quarterly Report");

    // Verify source is moved (deleted from original location)
    const sourceExists = await fs.access(source).then(() => true).catch(() => false);
    expect(sourceExists).toBe(false);
  });

  it("throws when timestamp is in invalid format", async () => {
    const source = path.join(workspaceDir, "output", "report.md");
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.writeFile(source, "body");

    await expect(
      executeArchiveCommand({
        kind: "file",
        workspaceDir,
        sessionKey: "agent:demo:user:u:direct:chat-1",
        sessionId: undefined,
        sourcePath: "output/report.md",
        timestamp: "2026-03-25"
      })
    ).rejects.toBeInstanceOf(ArchiveProtocolError);
  });

  it("formats archive response output with json code fence", () => {
    const payload = formatArchiveResponseOutput({
      kind: "file",
      archiveId: "chat-1",
      archiveRoot: "archives/chat-1",
      archiveRootWithSlash: "archives/chat-1/",
      relativePath: "archives/chat-1/2026-03-25-03-04-05/result.json",
      subpath: "2026-03-25-03-04-05/result.json",
      displayName: "result.json",
      timestamp: "2026-03-25-03-04-05",
      fileName: "result.json"
    });

    expect(payload).not.toContain("ARCHIVE_STATUS");
    expect(payload).toContain("```json");
    expect(payload).toContain("\"archive_root\"");
  });
});
