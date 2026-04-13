import { HttpError } from "../errors/http-error";
import type {
  AgentSkillsBinding,
  AgentSkillsCatalog,
  InstallSkillResult,
  SkillContentResult,
  SkillTreeResult,
  UninstallSkillResult,
  UpdateAgentSkillsResult
} from "../types/agent-skills";

/**
 * Runtime configuration used to call OpenClaw `dip` plugin skills endpoints.
 */
export interface OpenClawAgentSkillsHttpClientOptions {
  /**
   * The configured OpenClaw gateway HTTP URL.
   */
  gatewayUrl: string;

  /**
   * Optional bearer token used for upstream authentication.
   */
  token?: string;

  /**
   * Reserved for compatibility with shared OpenClaw runtime config.
   */
  timeoutMs: number;
}

/**
 * Fetch implementation used for dependency injection in tests.
 */
export type OpenClawAgentSkillsFetch = typeof fetch;

export interface OpenClawAgentSkillsHttpResult {
  status: number;
  headers: Headers;
  body: Uint8Array;
}

interface OpenClawUpstreamErrorPayload {
  code?: string;
  message?: string;
  error?: string;
}

/**
 * Defines the capability needed to query and update agent skills.
 */
export interface OpenClawAgentSkillsHttpClient {
  /**
   * Lists all discoverable skills exposed by the plugin.
   */
  listAvailableSkills(): Promise<AgentSkillsCatalog>;

  /**
   * Reads one agent's effective skill binding set.
   *
   * @param agentId Stable OpenClaw agent id.
   */
  getAgentSkills(agentId: string): Promise<AgentSkillsBinding>;

  /**
   * Replaces one agent's skill binding set.
   *
   * @param agentId Stable OpenClaw agent id.
   * @param skills Replacement skill ids.
   */
  updateAgentSkills(
    agentId: string,
    skills: string[]
  ): Promise<UpdateAgentSkillsResult>;

  /**
   * Installs a `.skill` zip by POSTing raw bytes to the DIP Gateway install route.
   *
   * @param zipBody Raw zip bytes (same format as a `.skill` file).
   * @param options When `overwrite` is true, replaces an existing skill directory.
   */
  installSkill(
    zipBody: Buffer | Uint8Array,
    options?: { overwrite?: boolean; name?: string }
  ): Promise<InstallSkillResult>;

  /**
   * Uninstalls a skill directory under the gateway repository `skills/` tree.
   *
   * @param name Skill id to remove.
   */
  uninstallSkill(name: string): Promise<UninstallSkillResult>;

  /**
   * Lists files and directories under one skill.
   *
   * @param name Skill id to inspect.
   */
  getSkillTree(
    name: string,
    resolvedSkillPath?: string
  ): Promise<SkillTreeResult>;

  /**
   * Reads one text file preview under a skill directory.
   *
   * @param name Skill id to inspect.
   * @param filePath Skill-root-relative file path.
   */
  getSkillContent(
    name: string,
    filePath: string,
    resolvedSkillPath?: string
  ): Promise<SkillContentResult>;

  /**
   * Downloads one file under a skill directory.
   *
   * @param name Skill id to inspect.
   * @param filePath Skill-root-relative file path.
   */
  downloadSkillFile(
    name: string,
    filePath: string,
    resolvedSkillPath?: string
  ): Promise<OpenClawAgentSkillsHttpResult>;
}

/**
 * HTTP client that proxies the `dip` plugin skills endpoints.
 */
export class DefaultOpenClawAgentSkillsHttpClient
implements OpenClawAgentSkillsHttpClient {
  /**
   * Creates the agent skills client.
   *
   * @param options Static upstream configuration.
   * @param fetchImpl Optional fetch implementation for tests.
   */
  public constructor(
    private readonly options: OpenClawAgentSkillsHttpClientOptions,
    private readonly fetchImpl: OpenClawAgentSkillsFetch = fetch
  ) {}

  /**
   * Lists all available skills.
   *
   * @returns The plugin payload.
   */
  public async listAvailableSkills(): Promise<AgentSkillsCatalog> {
    const response = await this.fetchImpl(
      buildOpenClawAgentSkillsUrl(this.options.gatewayUrl),
      {
        method: "GET",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawAgentSkillsError(error);
    });

    if (!response.ok) {
      throw await createOpenClawAgentSkillsStatusError(response);
    }

    return (await response.json()) as AgentSkillsCatalog;
  }

  /**
   * Reads one agent's configured skill ids.
   *
   * @param agentId Stable OpenClaw agent id.
   * @returns The plugin payload.
   */
  public async getAgentSkills(agentId: string): Promise<AgentSkillsBinding> {
    const response = await this.fetchImpl(
      buildOpenClawAgentSkillsUrl(this.options.gatewayUrl, agentId),
      {
        method: "GET",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawAgentSkillsError(error);
    });

    if (!response.ok) {
      throw await createOpenClawAgentSkillsStatusError(response);
    }

    return (await response.json()) as AgentSkillsBinding;
  }

  /**
   * Replaces one agent's configured skill ids.
   *
   * @param agentId Stable OpenClaw agent id.
   * @param skills Replacement skill ids.
   * @returns The plugin payload.
   */
  public async updateAgentSkills(
    agentId: string,
    skills: string[]
  ): Promise<UpdateAgentSkillsResult> {
    const response = await this.fetchImpl(
      buildOpenClawAgentSkillsUrl(this.options.gatewayUrl),
      {
        method: "POST",
        headers: createOpenClawAgentSkillsHeaders(this.options.token, true),
        body: JSON.stringify({ agentId, skills })
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawAgentSkillsError(error);
    });

    if (!response.ok) {
      throw await createOpenClawAgentSkillsStatusError(response);
    }

    return (await response.json()) as UpdateAgentSkillsResult;
  }

  /**
   * Installs a `.skill` archive through the Gateway plugin HTTP route.
   *
   * @param zipBody Raw zip bytes.
   * @param options Optional overwrite flag forwarded as `?overwrite=true`.
   * @returns Parsed install payload from the plugin.
   */
  public async installSkill(
    zipBody: Buffer | Uint8Array,
    options?: { overwrite?: boolean; name?: string }
  ): Promise<InstallSkillResult> {
    const response = await this.fetchImpl(
      buildOpenClawSkillInstallUrl(this.options.gatewayUrl, options),
      {
        method: "POST",
        headers: createOpenClawSkillInstallHeaders(this.options.token),
        body: createOpenClawSkillInstallFormData(zipBody, options?.name)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawSkillInstallError(error);
    });

    if (!response.ok) {
      throw await createOpenClawSkillInstallStatusError(response);
    }

    return (await response.json()) as InstallSkillResult;
  }

  /**
   * Removes an installed skill via the Gateway plugin HTTP route.
   *
   * @param name Skill id (slug).
   * @returns Parsed uninstall payload from the plugin.
   */
  public async uninstallSkill(name: string): Promise<UninstallSkillResult> {
    const response = await this.fetchImpl(
      buildOpenClawSkillUninstallUrl(this.options.gatewayUrl, name),
      {
        method: "DELETE",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawSkillUninstallError(error);
    });

    if (!response.ok) {
      throw await createOpenClawSkillUninstallStatusError(response);
    }

    return (await response.json()) as UninstallSkillResult;
  }

  /**
   * Reads the directory tree of one installed or bundled skill.
   *
   * @param name Skill id (slug).
   * @returns Parsed tree payload from the plugin.
   */
  public async getSkillTree(
    name: string,
    resolvedSkillPath?: string
  ): Promise<SkillTreeResult> {
    const response = await this.fetchImpl(
      buildOpenClawSkillTreeUrl(this.options.gatewayUrl, name, resolvedSkillPath),
      {
        method: "GET",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawSkillTreeError(error);
    });

    if (!response.ok) {
      throw await createOpenClawSkillTreeStatusError(response);
    }

    return (await response.json()) as SkillTreeResult;
  }

  /**
   * Reads one skill file preview through the Gateway plugin HTTP route.
   *
   * @param name Skill id (slug).
   * @param filePath Skill-root-relative file path.
   * @returns Parsed content payload from the plugin.
   */
  public async getSkillContent(
    name: string,
    filePath: string,
    resolvedSkillPath?: string
  ): Promise<SkillContentResult> {
    const response = await this.fetchImpl(
      buildOpenClawSkillContentUrl(this.options.gatewayUrl, name, filePath, resolvedSkillPath),
      {
        method: "GET",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawSkillContentError(error);
    });

    if (!response.ok) {
      throw await createOpenClawSkillContentStatusError(response);
    }

    return (await response.json()) as SkillContentResult;
  }

  /**
   * Downloads one skill file through the Gateway plugin HTTP route.
   *
   * @param name Skill id (slug).
   * @param filePath Skill-root-relative file path.
   * @returns Upstream status, headers and body bytes.
   */
  public async downloadSkillFile(
    name: string,
    filePath: string,
    resolvedSkillPath?: string
  ): Promise<OpenClawAgentSkillsHttpResult> {
    const response = await this.fetchImpl(
      buildOpenClawSkillDownloadUrl(this.options.gatewayUrl, name, filePath, resolvedSkillPath),
      {
        method: "GET",
        headers: createOpenClawAgentSkillsHeaders(this.options.token)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawSkillDownloadError(error);
    });

    if (!response.ok) {
      throw await createOpenClawSkillDownloadStatusError(response);
    }

    return {
      status: response.status,
      headers: response.headers,
      body: new Uint8Array(await response.arrayBuffer())
    };
  }
}

/**
 * Builds the OpenClaw `dip` plugin skills endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param agentId Optional target agent id.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawAgentSkillsUrl(
  gatewayUrl: string,
  agentId?: string
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  url.pathname = "/v1/config/agents/skills";
  url.search = "";
  url.hash = "";

  if (agentId !== undefined) {
    url.searchParams.set("agentId", agentId);
  }

  return url.toString();
}

/**
 * Builds the OpenClaw `dip` plugin skill install endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param options Optional query flags for the install route.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawSkillInstallUrl(
  gatewayUrl: string,
  options?: { overwrite?: boolean; name?: string }
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  url.pathname = "/v1/config/agents/skills/install";
  url.hash = "";
  url.search = "";
  if (options?.overwrite === true) {
    url.searchParams.set("overwrite", "true");
  }
  if (options?.name !== undefined && options.name.trim().length > 0) {
    url.searchParams.set("name", options.name.trim());
  }

  return url.toString();
}

/**
 * Builds the OpenClaw `dip` plugin skill uninstall endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param name Skill id to remove.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawSkillUninstallUrl(
  gatewayUrl: string,
  name: string
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  const trimmed = name.trim();
  url.pathname = `/v1/config/agents/skills/${encodeURIComponent(trimmed)}`;
  url.hash = "";
  url.search = "";

  return url.toString();
}

/**
 * Builds the OpenClaw `dip` plugin skill tree endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param name Skill id to inspect.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawSkillTreeUrl(
  gatewayUrl: string,
  name: string,
  resolvedSkillPath?: string
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  const trimmed = name.trim();
  url.pathname = `/v1/config/agents/skills/${encodeURIComponent(trimmed)}/tree`;
  url.hash = "";
  url.search = "";
  if (resolvedSkillPath !== undefined && resolvedSkillPath.trim().length > 0) {
    url.searchParams.set("resolvedSkillPath", resolvedSkillPath.trim());
  }

  return url.toString();
}

/**
 * Builds the OpenClaw `dip` plugin skill content endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param name Skill id to inspect.
 * @param filePath Skill-root-relative file path.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawSkillContentUrl(
  gatewayUrl: string,
  name: string,
  filePath: string,
  resolvedSkillPath?: string
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  const trimmed = name.trim();
  url.pathname = `/v1/config/agents/skills/${encodeURIComponent(trimmed)}/content`;
  url.hash = "";
  url.search = "";
  url.searchParams.set("path", filePath);
  if (resolvedSkillPath !== undefined && resolvedSkillPath.trim().length > 0) {
    url.searchParams.set("resolvedSkillPath", resolvedSkillPath.trim());
  }

  return url.toString();
}

/**
 * Builds the OpenClaw `dip` plugin skill download endpoint URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway HTTP URL.
 * @param name Skill id to inspect.
 * @param filePath Skill-root-relative file path.
 * @returns The derived HTTP endpoint URL.
 */
export function buildOpenClawSkillDownloadUrl(
  gatewayUrl: string,
  name: string,
  filePath: string,
  resolvedSkillPath?: string
): string {
  const url = new URL(gatewayUrl);

  if (url.protocol === "ws:") {
    url.protocol = "http:";
  } else if (url.protocol === "wss:") {
    url.protocol = "https:";
  }

  const trimmed = name.trim();
  url.pathname = `/v1/config/agents/skills/${encodeURIComponent(trimmed)}/download`;
  url.hash = "";
  url.search = "";
  url.searchParams.set("path", filePath);
  if (resolvedSkillPath !== undefined && resolvedSkillPath.trim().length > 0) {
    url.searchParams.set("resolvedSkillPath", resolvedSkillPath.trim());
  }

  return url.toString();
}

/**
 * Builds request headers for the `dip` plugin skills API.
 *
 * @param token Optional bearer token.
 * @param includeJsonContentType Whether to include JSON content type header.
 * @returns The request headers.
 */
export function createOpenClawAgentSkillsHeaders(
  token?: string,
  includeJsonContentType = false
): Headers {
  const headers = new Headers({
    accept: "application/json"
  });

  if (includeJsonContentType) {
    headers.set("content-type", "application/json");
  }

  if (token !== undefined && token.trim().length > 0) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

/**
 * Builds request headers for posting a `.skill` zip to the install route.
 *
 * @param token Optional bearer token.
 * @returns Headers for a multipart request body.
 */
export function createOpenClawSkillInstallHeaders(token?: string): Headers {
  const headers = new Headers({
    accept: "application/json"
  });

  if (token !== undefined && token.trim().length > 0) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

/**
 * Creates the multipart request body expected by the skill install route.
 *
 * @param zipBody Raw `.skill` zip bytes.
 * @param name Optional skill slug used to derive a stable filename.
 * @returns Multipart form data containing the `file` field.
 */
export function createOpenClawSkillInstallFormData(
  zipBody: Buffer | Uint8Array,
  name?: string
): FormData {
  const form = new FormData();
  const fileName =
    typeof name === "string" && name.trim().length > 0
      ? `${name.trim()}.skill`
      : "skill.skill";

  form.append(
    "file",
    new Blob([new Uint8Array(zipBody)], { type: "application/zip" }),
    fileName
  );

  return form;
}

/**
 * Converts an upstream non-2xx response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawAgentSkillsStatusError(
  response: Response
): Promise<HttpError> {
  const text = (await response.text()).trim();
  const detail = text.length > 0 ? `: ${text}` : "";

  return new HttpError(
    502,
    `OpenClaw /v1/config/agents/skills returned HTTP ${response.status}${detail}`
  );
}

/**
 * Normalizes transport errors produced while calling the plugin.
 *
 * @param error Unknown thrown value.
 * @returns A typed HTTP error.
 */
export function normalizeOpenClawAgentSkillsError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills: ${description}`
  );
}

/**
 * Converts an upstream non-2xx install response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawSkillInstallStatusError(
  response: Response
): Promise<HttpError> {
  const parsed = await parseOpenClawUpstreamError(response);
  const mapped = mapOpenClawSkillInstallErrorCode(response.status, parsed.code);
  const message = parsed.message ?? buildOpenClawStatusMessage(
    "/v1/config/agents/skills/install",
    response.status,
    parsed.raw
  );

  return new HttpError(mapped.statusCode, message, mapped.code);
}

/**
 * Normalizes transport errors produced while calling the install route.
 *
 * @param error Unknown thrown value.
 * @returns A typed HTTP error.
 */
export function normalizeOpenClawSkillInstallError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  if (error instanceof Error && isTimeoutError(error)) {
    return new HttpError(504, "OpenClaw skill install request timed out", "DipStudio.UpstreamTimeout");
  }

  if (error instanceof Error && isUnavailableError(error)) {
    return new HttpError(
      502,
      `Failed to communicate with OpenClaw /v1/config/agents/skills/install: ${description}`,
      "DipStudio.UpstreamUnavailable"
    );
  }

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills/install: ${description}`,
    "DipStudio.UpstreamServiceError"
  );
}

/**
 * Parses a JSON or text upstream error response.
 *
 * @param response Upstream fetch response.
 * @returns Parsed code/message plus raw text for fallback diagnostics.
 */
async function parseOpenClawUpstreamError(
  response: Response
): Promise<{ code?: string; message?: string; raw: string }> {
  const raw = (await response.text()).trim();
  if (raw.length === 0) {
    return { raw };
  }

  try {
    const parsed = JSON.parse(raw) as OpenClawUpstreamErrorPayload;
    const code = typeof parsed.code === "string" && parsed.code.trim().length > 0
      ? parsed.code.trim()
      : undefined;
    const messageSource = typeof parsed.error === "string" && parsed.error.trim().length > 0
      ? parsed.error
      : parsed.message;
    const message = typeof messageSource === "string" && messageSource.trim().length > 0
      ? messageSource.trim()
      : undefined;
    return { code, message, raw };
  } catch {
    return { raw };
  }
}

/**
 * Builds a fallback upstream status message.
 *
 * @param path Upstream request path.
 * @param status HTTP status code returned by upstream.
 * @param raw Raw upstream response body.
 * @returns A readable fallback error message.
 */
function buildOpenClawStatusMessage(
  path: string,
  status: number,
  raw: string
): string {
  const detail = raw.length > 0 ? `: ${raw}` : "";
  return `OpenClaw ${path} returned HTTP ${status}${detail}`;
}

/**
 * Maps upstream skill install errors to public Studio errors.
 *
 * @param statusCode Upstream HTTP status code.
 * @param upstreamCode Optional upstream business code.
 * @returns The public status and code pair.
 */
function mapOpenClawSkillInstallErrorCode(
  statusCode: number,
  upstreamCode?: string
): { statusCode: number; code: string } {
  switch (statusCode) {
    case 400:
      switch (upstreamCode) {
        case "BAD_LAYOUT":
          return { statusCode: 400, code: "DipStudio.SkillBadLayout" };
        case "MISSING_SKILL_MD":
          return { statusCode: 400, code: "DipStudio.SkillMissingSkillMd" };
        case "INVALID_ZIP":
          return { statusCode: 400, code: "DipStudio.SkillInvalidPackage" };
        case "INVALID_NAME":
          return { statusCode: 400, code: "DipStudio.SkillInvalidName" };
        case "BAD_FRONT_MATTER":
          return { statusCode: 400, code: "DipStudio.SkillBadFrontMatter" };
        default:
          return { statusCode: 400, code: "DipStudio.InvalidParameter" };
      }
    case 401:
      return { statusCode: 401, code: "DipStudio.UpstreamUnauthorized" };
    case 403:
      return { statusCode: 403, code: "DipStudio.UpstreamForbidden" };
    case 409:
      if (upstreamCode === "CONFLICT" || upstreamCode === undefined) {
        return { statusCode: 409, code: "DipStudio.SkillAlreadyExists" };
      }
      return { statusCode: 409, code: "DipStudio.Conflict" };
    case 413:
      return { statusCode: 413, code: "DipStudio.SkillPackageTooLarge" };
    case 504:
      return { statusCode: 504, code: "DipStudio.UpstreamTimeout" };
    default:
      if (statusCode >= 500) {
        return { statusCode: 502, code: "DipStudio.UpstreamServiceError" };
      }
      return { statusCode, code: `DipStudio.Http${statusCode}` };
  }
}

/**
 * Detects timeout-like fetch errors.
 *
 * @param error Thrown fetch error.
 * @returns Whether the error indicates a timeout.
 */
function isTimeoutError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return error.name === "AbortError" || message.includes("timeout") || message.includes("timed out");
}

/**
 * Detects network reachability failures for upstream HTTP calls.
 *
 * @param error Thrown fetch error.
 * @returns Whether the error indicates the upstream is unavailable.
 */
function isUnavailableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("network") ||
    message.includes("socket")
  );
}

/**
 * Converts an upstream non-2xx uninstall response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawSkillUninstallStatusError(
  response: Response
): Promise<HttpError> {
  const text = (await response.text()).trim();
  const detail = text.length > 0 ? `: ${text}` : "";

  return new HttpError(
    502,
    `OpenClaw /v1/config/agents/skills/{name} returned HTTP ${response.status}${detail}`
  );
}

/**
 * Normalizes transport errors produced while calling the uninstall route.
 *
 * @param error Unknown thrown value.
 * @returns A typed application error.
 */
export function normalizeOpenClawSkillUninstallError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills/{name}: ${description}`
  );
}

/**
 * Converts an upstream non-2xx tree response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawSkillTreeStatusError(
  response: Response
): Promise<HttpError> {
  const text = (await response.text()).trim();
  const detail = text.length > 0 ? `: ${text}` : "";

  return new HttpError(
    502,
    `OpenClaw /v1/config/agents/skills/{name}/tree returned HTTP ${response.status}${detail}`
  );
}

/**
 * Normalizes transport errors produced while calling the skill tree route.
 *
 * @param error Unknown thrown value.
 * @returns A typed application error.
 */
export function normalizeOpenClawSkillTreeError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills/{name}/tree: ${description}`
  );
}

/**
 * Converts an upstream non-2xx content response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawSkillContentStatusError(
  response: Response
): Promise<HttpError> {
  const text = (await response.text()).trim();
  const detail = text.length > 0 ? `: ${text}` : "";

  return new HttpError(
    502,
    `OpenClaw /v1/config/agents/skills/{name}/content returned HTTP ${response.status}${detail}`
  );
}

/**
 * Normalizes transport errors produced while calling the skill content route.
 *
 * @param error Unknown thrown value.
 * @returns A typed application error.
 */
export function normalizeOpenClawSkillContentError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills/{name}/content: ${description}`
  );
}

/**
 * Converts an upstream non-2xx download response into an application error.
 *
 * @param response Upstream fetch response.
 * @returns A typed HTTP error.
 */
export async function createOpenClawSkillDownloadStatusError(
  response: Response
): Promise<HttpError> {
  const text = (await response.text()).trim();
  const detail = text.length > 0 ? `: ${text}` : "";

  return new HttpError(
    502,
    `OpenClaw /v1/config/agents/skills/{name}/download returned HTTP ${response.status}${detail}`
  );
}

/**
 * Normalizes transport errors produced while calling the skill download route.
 *
 * @param error Unknown thrown value.
 * @returns A typed application error.
 */
export function normalizeOpenClawSkillDownloadError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/config/agents/skills/{name}/download: ${description}`
  );
}
