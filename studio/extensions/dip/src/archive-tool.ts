import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import {
  ArchiveProtocolError,
  executeArchiveCommand,
  formatArchiveResponseOutput,
  type ArchiveCommandKind
} from "./archive-command.js";
import { isValidArchiveTimestamp } from "./archives-utils.js";

const ARCHIVE_PROTOCOL_TOOL_INPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: {
      type: "string",
      description: "Archive variant: plan or file",
      enum: ["plan", "file"]
    },
    sourcePath: {
      type: "string",
      description: "Workspace-relative source file path"
    },
    displayName: {
      type: "string",
      description: "Optional display name for archive_grid card"
    },
    timestamp: {
      type: "string",
      description: "Optional timestamp bucket YYYY-MM-DD-HH-MM-SS (file variant only)"
    },
    sessionKey: {
      type: "string",
      description: "Override session key parsed by the tool"
    },
    sessionId: {
      type: "string",
      description: "Override session id/uuid parsed by the tool"
    },
    workspace: {
      type: "string",
      description: "Absolute workspace directory override"
    }
  },
  required: ["kind", "sourcePath"]
} as const;

const ARCHIVE_PROTOCOL_USAGE =
  "Usage: /archive <plan|file> <source-path> [--name <display>] [--timestamp <YYYY-MM-DD-HH-MM-SS>] [--session <sessionKey>] [--session-id <sessionUuid>] [--workspace <path>]";

export function registerArchiveProtocolIntegrations(api: OpenClawPluginApi): void {
  const registerTool = (api as any).registerTool;
  if (typeof registerTool === "function") {
    registerTool((toolCtx: any) => ({
      name: "archive",
      description: "Apply archive protocol rules (plan/file)",
      parameters: ARCHIVE_PROTOCOL_TOOL_INPUT_SCHEMA,
      execute: async (_toolCallId: string, args: any) => {
        const normalized = normalizeArchiveProtocolToolInput(args);
        if (!normalized.ok) {
          return {
            content: [
              {
                type: "text",
                text: buildArchiveBlockedResponse(normalized.error, "INVALID_INPUT")
              }
            ]
          };
        }
        const text = await invokeArchiveProtocol(normalized.value, toolCtx, api);
        return {
          content: [
            {
              type: "text",
              text
            }
          ]
        };
      }
    }));
    return;
  }

  api.logger.warn?.(
    "registerTool is unavailable in this OpenClaw runtime; falling back to /archive command."
  );
  api.registerCommand({
    name: "archive",
    description: "Apply archive protocol rules (plan/file)",
    acceptsArgs: true,
    handler: ctx => handleArchiveProtocolCommand(ctx, api)
  });
}

async function handleArchiveProtocolCommand(ctx: any, api: OpenClawPluginApi): Promise<{ text: string }> {
  const rawArgs = typeof ctx.args === "string" ? ctx.args.trim() : "";
  if (!rawArgs) {
    return { text: ARCHIVE_PROTOCOL_USAGE };
  }

  const tokens = tokenizeCommandArgs(rawArgs);
  if (tokens.length === 0) {
    return { text: ARCHIVE_PROTOCOL_USAGE };
  }

  const variant = tokens.shift()?.toLowerCase();
  if (variant !== "plan" && variant !== "file") {
    return { text: `Unknown archive variant "${variant ?? ""}". ${ARCHIVE_PROTOCOL_USAGE}` };
  }

  const sourcePath = tokens.shift();
  if (!sourcePath) {
    return { text: `Source path is required. ${ARCHIVE_PROTOCOL_USAGE}` };
  }

  const flagParse = parseArchiveProtocolFlagArgs(tokens);
  if (flagParse.error) {
    return { text: flagParse.error };
  }

  if (variant === "plan" && flagParse.options.timestamp) {
    return { text: buildArchiveBlockedResponse("Timestamp flag can only be used with file archives", "INVALID_FLAG") };
  }

  const invocationInput: ArchiveProtocolInvocationInput = {
    kind: variant,
    sourcePath,
    displayName: flagParse.options.displayName,
    timestamp: flagParse.options.timestamp,
    sessionKey: flagParse.options.sessionKey ?? null,
    sessionId: flagParse.options.sessionId ?? null,
    workspace: flagParse.options.workspace ?? null
  };

  const text = await invokeArchiveProtocol(invocationInput, ctx, api);
  return { text };
}

function tokenizeCommandArgs(input: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[2] !== undefined) {
      tokens.push(match[2]);
    } else {
      tokens.push(match[0]);
    }
  }
  return tokens;
}

interface ArchiveFlagOptions {
  displayName?: string;
  timestamp?: string;
  sessionKey?: string;
  sessionId?: string;
  workspace?: string;
}

function parseArchiveProtocolFlagArgs(tokens: string[]): { options: ArchiveFlagOptions; error?: string } {
  const options: ArchiveFlagOptions = {};

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    const assign = (setter: (value: string) => void, flagName: string, value?: string) => {
      if (value === undefined || value.length === 0) {
        return `${flagName} flag requires a value`;
      }
      setter(value);
      return undefined;
    };

    if (token.startsWith("--")) {
      const [flag, inlineValue] = token.split("=", 2);
      const readNext = () => {
        if (inlineValue !== undefined) return inlineValue;
        const next = tokens[i + 1];
        if (next === undefined) return undefined;
        i += 1;
        return next;
      };

      switch (flag) {
        case "--name":
        case "--display": {
          const err = assign(value => (options.displayName = value), flag, readNext());
          if (err) return { options, error: err };
          break;
        }
        case "--timestamp": {
          const err = assign(value => (options.timestamp = value), flag, readNext());
          if (err) return { options, error: err };
          break;
        }
        case "--session":
        case "--session-key": {
          const err = assign(value => (options.sessionKey = value), flag, readNext());
          if (err) return { options, error: err };
          break;
        }
        case "--session-id": {
          const err = assign(value => (options.sessionId = value), flag, readNext());
          if (err) return { options, error: err };
          break;
        }
        case "--workspace": {
          const err = assign(value => (options.workspace = value), flag, readNext());
          if (err) return { options, error: err };
          break;
        }
        default:
          return { options, error: `Unknown flag ${flag}` };
      }
      continue;
    }

    if (token.startsWith("-")) {
      const flag = token.replace(/^-+/, "");
      const next = tokens[i + 1];
      switch (flag) {
        case "n":
          if (!next) return { options, error: "-n flag requires a value" };
          options.displayName = next;
          i += 1;
          break;
        case "t":
          if (!next) return { options, error: "-t flag requires a value" };
          options.timestamp = next;
          i += 1;
          break;
        case "s":
          if (!next) return { options, error: "-s flag requires a value" };
          options.sessionKey = next;
          i += 1;
          break;
        case "S":
          if (!next) return { options, error: "-S flag requires a value" };
          options.sessionId = next;
          i += 1;
          break;
        case "w":
          if (!next) return { options, error: "-w flag requires a value" };
          options.workspace = next;
          i += 1;
          break;
        default:
          return { options, error: `Unknown flag -${flag}` };
      }
      continue;
    }

    return { options, error: `Unexpected argument: ${token}` };
  }

  return { options };
}

interface ArchiveProtocolInvocationInput {
  kind: ArchiveCommandKind;
  sourcePath: string;
  displayName?: string;
  timestamp?: string;
  sessionKey?: string | null;
  sessionId?: string | null;
  workspace?: string | null;
}

function normalizeArchiveProtocolToolInput(
  input: unknown
): { ok: true; value: ArchiveProtocolInvocationInput } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Tool input must be an object" };
  }

  const record = input as Record<string, unknown>;
  const kind = record.kind;
  if (kind !== "plan" && kind !== "file") {
    return { ok: false, error: "kind must be either \"plan\" or \"file\"" };
  }

  const sourcePath = record.sourcePath;
  if (typeof sourcePath !== "string" || sourcePath.trim().length === 0) {
    return { ok: false, error: "sourcePath is required" };
  }

  const normalized: ArchiveProtocolInvocationInput = {
    kind,
    sourcePath
  };

  if (typeof record.displayName === "string" && record.displayName.trim().length > 0) {
    normalized.displayName = record.displayName;
  }

  if (record.timestamp !== undefined) {
    if (kind === "plan") {
      return { ok: false, error: "timestamp can only be used with file archives" };
    }
    if (typeof record.timestamp !== "string" || !isValidArchiveTimestamp(record.timestamp)) {
      return { ok: false, error: "timestamp must match YYYY-MM-DD-HH-MM-SS" };
    }
    normalized.timestamp = record.timestamp;
  }

  if (typeof record.sessionKey === "string" && record.sessionKey.trim().length > 0) {
    normalized.sessionKey = record.sessionKey;
  }
  if (typeof record.sessionId === "string" && record.sessionId.trim().length > 0) {
    normalized.sessionId = record.sessionId;
  }
  if (typeof record.workspace === "string" && record.workspace.trim().length > 0) {
    normalized.workspace = record.workspace;
  }

  return { ok: true, value: normalized };
}

async function invokeArchiveProtocol(
  input: ArchiveProtocolInvocationInput,
  ctx: any,
  api: OpenClawPluginApi
): Promise<string> {
  const workspaceDir =
    input.workspace ??
    ctx?.workspaceDir ??
    ctx?.workspace ??
    ctx?.agentWorkspace ??
    ctx?.cwd ??
    api.resolvePath?.(".") ??
    process.cwd();

  if (typeof workspaceDir !== "string" || workspaceDir.trim().length === 0) {
    return buildArchiveBlockedResponse("Workspace directory is not available", "WORKSPACE_MISSING");
  }

  const sessionKey = input.sessionKey ?? ctx?.sessionKey ?? ctx?.session_key ?? null;
  const sessionId = input.sessionId ?? ctx?.sessionId ?? ctx?.session_id ?? null;

  if (input.kind === "plan" && input.timestamp) {
    return buildArchiveBlockedResponse("Timestamp flag can only be used with file archives", "INVALID_FLAG");
  }

  try {
    const result = await executeArchiveCommand({
      kind: input.kind,
      workspaceDir,
      sessionKey,
      sessionId,
      sourcePath: input.sourcePath,
      displayName: input.displayName,
      timestamp: input.timestamp
    });
    return formatArchiveResponseOutput(result);
  } catch (err: unknown) {
    if (err instanceof ArchiveProtocolError) {
      return buildArchiveBlockedResponse(err.message, err.code);
    }
    api.logger.error?.(`archive invocation failed: ${String(err)}`);
    return buildArchiveBlockedResponse(
      err instanceof Error ? err.message : String(err),
      err instanceof Error ? err.name : "UNKNOWN_ERROR"
    );
  }
}

function buildArchiveBlockedResponse(reason: string, code: string): string {
  return `Archive blocked: ${reason} (code: ${code})`;
}
