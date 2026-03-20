import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import { HttpError } from "../errors/http-error";

export interface LlmRouterOptions {
  gatewayUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface ConfirmationCard {
  type: "confirmation_card";
  content: string;
  actions: Array<{
    label: string;
    value: string;
    action_id: "confirm_agent" | "cancel";
  }>;
}

export interface LlmRouterRequest {
  body: unknown;
  headers: IncomingHttpHeaders;
  signal: AbortSignal;
}

export interface LlmRouterConfirmationResult {
  kind: "confirmation";
  targetAgentId: string;
  sessionId: string;
  confirmationCard: ConfirmationCard;
}

export interface LlmRouterUpstreamResult {
  kind: "upstream";
  targetAgentId: string;
  sessionId: string;
  upstreamResponse: globalThis.Response;
}

export type LlmRouterResult = LlmRouterConfirmationResult | LlmRouterUpstreamResult;

interface RouterChatRequestBody {
  messages?: unknown;
  session_id?: string;
  agent_id?: string;
  target_de?: string;
  require_confirmation?: boolean;
}

interface ResolvedRouteContext {
  targetAgentId: string;
  targetDeId?: string;
  sessionId: string;
  isNewSession: boolean;
  requireConfirmation: boolean;
  requestedAgentId?: string;
}

interface CoordinatorIntent {
  target_agent: string;
  target_de?: string;
}

const COMPLETIONS_PATH = "/v1/chat/completions";
const COORDINATOR_AGENT_ID = "coordinator";
const COORDINATOR_SYSTEM_PROMPT =
  '你是纯粹的自然语言意图提取器。不要以人类身份对话。只输出严格JSON：{"target_agent":"plan_agent","target_de":"de_finance"}。如果用户要求定时/提醒/建立计划，target_agent必须是"plan_agent"。如果涉及具体业务（查账/写码等），必须给出target_de（如de_finance/skill_agent/de_hr）。闲聊输出{"target_agent":"chit_chat"}，意图不明输出{"target_agent":"unknown"}。不要解释，不要寒暄，不要附加文本。';

export function createLlmRouterLogic(options: LlmRouterOptions) {
  return {
    async handleRequest(request: LlmRouterRequest): Promise<LlmRouterResult> {
      const routeContext = await resolveRouteContext(options, request);
      const requestedAgentId = routeContext.requestedAgentId;

      if (requestedAgentId === undefined && routeContext.requireConfirmation) {
        return {
          kind: "confirmation",
          targetAgentId: routeContext.targetAgentId,
          sessionId: routeContext.sessionId,
          confirmationCard: createConfirmationCard(routeContext.targetAgentId)
        };
      }

      if (routeContext.isNewSession) {
        await initializeSession(
          options,
          request.headers,
          routeContext.targetAgentId,
          routeContext.sessionId,
          request.signal
        );
      }

      const upstreamResponse = await fetch(buildGatewayUrl(options), {
        method: "POST",
        headers: buildGatewayHeaders(
          options,
          request.headers,
          routeContext.targetAgentId,
          routeContext.sessionId
        ),
        body: JSON.stringify(
          createGatewayRequestBody(
            request.body,
            routeContext.targetAgentId,
            routeContext.sessionId,
            routeContext.targetDeId
          )
        ),
        signal: request.signal
      });

      return {
        kind: "upstream",
        targetAgentId: routeContext.targetAgentId,
        sessionId: routeContext.sessionId,
        upstreamResponse
      };
    }
  };
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

async function resolveRouteContext(
  options: LlmRouterOptions,
  request: LlmRouterRequest
): Promise<ResolvedRouteContext> {
  const body = (request.body ?? {}) as RouterChatRequestBody;
  const requestedAgentId = normalizeString(body.agent_id);
  const providedSessionId = normalizeString(body.session_id);
  const isNewSession = providedSessionId === undefined;
  const sessionId = providedSessionId ?? randomUUID();

  if (requestedAgentId !== undefined) {
    return {
      targetAgentId: requestedAgentId,
      targetDeId: normalizeDeId(body.target_de),
      sessionId,
      isNewSession,
      requireConfirmation: false,
      requestedAgentId
    };
  }

  const coordinatorIntent = await classifyTargetAgent(options, request, sessionId);
  const targetAgentId = selectTargetAgentId(coordinatorIntent);
  const requireConfirmation = body.require_confirmation === true;

  return {
    targetAgentId,
    targetDeId: normalizeDeId(coordinatorIntent.target_de),
    sessionId,
    isNewSession,
    requireConfirmation
  };
}

async function initializeSession(
  options: LlmRouterOptions,
  requestHeaders: IncomingHttpHeaders,
  targetAgentId: string,
  sessionId: string,
  signal: AbortSignal
): Promise<void> {
  const upstreamResponse = await fetch(buildGatewayUrl(options), {
    method: "POST",
    headers: buildGatewayHeaders(options, requestHeaders, targetAgentId, sessionId),
    body: JSON.stringify(createNewSessionRequestBody(targetAgentId)),
    signal
  });

  if (!upstreamResponse.ok) {
    const rawBody = await upstreamResponse.text();
    throw mapUpstreamError(upstreamResponse.status, rawBody);
  }

  await upstreamResponse.text();
}

async function classifyTargetAgent(
  options: LlmRouterOptions,
  request: LlmRouterRequest,
  sessionId: string
): Promise<CoordinatorIntent> {
  const upstreamResponse = await fetch(buildGatewayUrl(options), {
    method: "POST",
    headers: buildGatewayHeaders(
      options,
      request.headers,
      COORDINATOR_AGENT_ID,
      sessionId
    ),
    body: JSON.stringify(createCoordinatorRequestBody(request.body)),
    signal: request.signal
  });

  const rawBody = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    throw mapUpstreamError(upstreamResponse.status, rawBody);
  }

  return parseCoordinatorTargetAgent(rawBody);
}

function parseCoordinatorTargetAgent(rawBody: string): CoordinatorIntent {
  const parsed = parseJsonLike(rawBody);
  const intent = extractCoordinatorIntentFromPayload(parsed);

  if (intent !== undefined) {
    return intent;
  }

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn("[openclaw-chat-proxy] invalid coordinator response, fallback to unknown", {
      detail: summarizeGatewayBody(rawBody)
    });
  }

  return { target_agent: "unknown" };
}

function parseJsonLike(rawBody: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    const trimmed = rawBody.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start < 0 || end <= start) {
      return undefined;
    }

    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}

function extractCoordinatorIntentFromPayload(
  parsed: Record<string, unknown> | undefined
): CoordinatorIntent | undefined {
  if (parsed === undefined) {
    return undefined;
  }

  const topLevel = normalizeIntent(parsed);
  if (topLevel !== undefined) {
    return topLevel;
  }

  const choices = Array.isArray(parsed.choices) ? parsed.choices : undefined;
  const firstChoice = choices?.[0];
  const choiceRecord =
    typeof firstChoice === "object" && firstChoice !== null
      ? (firstChoice as Record<string, unknown>)
      : undefined;
  const message =
    typeof choiceRecord?.message === "object" && choiceRecord.message !== null
      ? (choiceRecord.message as Record<string, unknown>)
      : undefined;
  const content = message?.content;
  const contentText = extractMessageContentText(content);

  if (contentText === undefined) {
    return undefined;
  }

  const nested = parseJsonLike(contentText);
  const nestedIntent = normalizeIntent(nested);
  if (nestedIntent !== undefined) {
    return nestedIntent;
  }

  return inferIntentFromText(contentText);
}

function extractMessageContentText(content: unknown): string | undefined {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return undefined;
  }

  const textParts: string[] = [];

  for (const item of content) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const itemRecord = item as Record<string, unknown>;
    const text = normalizeString(itemRecord.text);

    if (text !== undefined) {
      textParts.push(text);
    }
  }

  if (textParts.length === 0) {
    return undefined;
  }

  return textParts.join("\n");
}

function createConfirmationCard(targetAgentId: string): ConfirmationCard {
  return {
    type: "confirmation_card",
    content: `系统识别到您正在尝试调用 "${targetAgentId}"，是否确认？`,
    actions: [
      {
        label: "确认唤醒",
        value: targetAgentId,
        action_id: "confirm_agent"
      },
      {
        label: "取消",
        value: "cancel",
        action_id: "cancel"
      }
    ]
  };
}

function createGatewayRequestBody(
  body: unknown,
  targetAgentId: string,
  sessionId: string,
  targetDeId?: string
): Record<string, unknown> {
  const source = toRecord(body);
  const payload = { ...source };

  delete payload.session_id;
  delete payload.agent_id;
  delete payload.target_agent;
  delete payload.target_de;
  delete payload.require_confirmation;
  payload.model = toGatewayModel(targetAgentId);
  payload.messages = withSessionContextPrompt(payload.messages, sessionId);
  payload.messages = withPlanTargetDePrompt(payload.messages, targetAgentId, targetDeId);

  return payload;
}

function createCoordinatorRequestBody(body: unknown): Record<string, unknown> {
  const payload = createGatewayRequestBody(body, COORDINATOR_AGENT_ID, "coordinator");
  payload.messages = createCoordinatorMessages(payload.messages);
  payload.stream = false;
  return payload;
}

function createNewSessionRequestBody(targetAgentId: string): Record<string, unknown> {
  return {
    model: toGatewayModel(targetAgentId),
    stream: false,
    messages: [{ role: "user", content: "/new" }]
  };
}

function toGatewayModel(targetAgentId: string): string {
  return `openclaw:${targetAgentId}`;
}

function createCoordinatorMessages(source: unknown): unknown[] {
  const messages = Array.isArray(source) ? [...source] : [];

  return [
    {
      role: "system",
      content: COORDINATOR_SYSTEM_PROMPT
    },
    ...messages
  ];
}

function withPlanTargetDePrompt(
  sourceMessages: unknown,
  targetAgentId: string,
  targetDeId?: string
): unknown[] | unknown {
  if (targetAgentId !== "plan_agent" || targetDeId === undefined) {
    return sourceMessages;
  }

  const messages = Array.isArray(sourceMessages) ? [...sourceMessages] : [];
  const injected = {
    role: "system",
    content: `目标业务智能体是 ${targetDeId}。请先围绕该智能体规划执行方案，并在后续步骤中按此目标推进。`
  };

  return [injected, ...messages];
}

function withSessionContextPrompt(sourceMessages: unknown, sessionId: string): unknown {
  if (!Array.isArray(sourceMessages)) {
    return sourceMessages;
  }

  const prefix = `(Context: Session=${sessionId}) `;

  return sourceMessages.map((message) => enhanceMessageWithSessionContext(message, prefix));
}

function enhanceMessageWithSessionContext(
  message: unknown,
  prefix: string
): unknown {
  if (typeof message !== "object" || message === null) {
    return message;
  }

  const record = { ...(message as Record<string, unknown>) };
  if (record.role !== "user") {
    return record;
  }

  if (typeof record.content === "string") {
    record.content = `${prefix}${record.content}`;
    return record;
  }

  if (!Array.isArray(record.content)) {
    return record;
  }

  const contentParts = [...record.content];
  const firstTextIndex = contentParts.findIndex(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).text === "string"
  );

  if (firstTextIndex < 0) {
    return record;
  }

  const firstTextPart = {
    ...(contentParts[firstTextIndex] as Record<string, unknown>)
  };
  firstTextPart.text = `${prefix}${String(firstTextPart.text)}`;
  contentParts[firstTextIndex] = firstTextPart;
  record.content = contentParts;

  return record;
}

function inferIntentFromText(text: string): CoordinatorIntent | undefined {
  const normalized = text.toLowerCase();
  const has = (...keywords: string[]): boolean =>
    keywords.some((keyword) => normalized.includes(keyword));

  const matchedTargetAgent = normalized.match(
    /target[_\s-]?agent["'\s:：]+(plan_agent|chit_chat|unknown|de_finance|de_hr|skill_agent)/
  );
  const matchedTargetDe = normalized.match(
    /target[_\s-]?de["'\s:：]+(de_finance|de_hr|skill_agent|plan_agent)/
  );

  if (matchedTargetAgent?.[1] !== undefined || matchedTargetDe?.[1] !== undefined) {
    const targetAgent = normalizeString(matchedTargetAgent?.[1]) ?? "plan_agent";
    const targetDe = normalizeDeId(matchedTargetDe?.[1]);
    return targetDe === undefined
      ? { target_agent: targetAgent }
      : { target_agent: targetAgent, target_de: targetDe };
  }

  if (has("闲聊", "聊天", "chit_chat")) {
    return { target_agent: "chit_chat" };
  }

  if (has("unknown", "未知", "不明确", "不确定", "找不到")) {
    return { target_agent: "unknown" };
  }

  const targetDe = inferTargetDeFromText(normalized);
  if (targetDe !== undefined) {
    return { target_agent: "plan_agent", target_de: targetDe };
  }

  if (has("定时", "提醒", "建立计划", "计划", "规划", "schedule", "remind")) {
    return { target_agent: "plan_agent" };
  }

  return undefined;
}

function normalizeIntent(
  value: Record<string, unknown> | undefined
): CoordinatorIntent | undefined {
  if (value === undefined) {
    return undefined;
  }

  const targetAgent = normalizeString(value.target_agent);
  if (targetAgent === undefined) {
    return undefined;
  }

  const normalized: CoordinatorIntent = { target_agent: targetAgent };
  const targetDe = normalizeDeId(value.target_de);
  if (targetDe !== undefined) {
    normalized.target_de = targetDe;
  }

  return normalized;
}

function normalizeDeId(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  if (normalized === undefined) {
    return undefined;
  }

  if (["de_finance", "de_hr", "skill_agent", "plan_agent"].includes(normalized)) {
    return normalized;
  }

  return undefined;
}

function inferTargetDeFromText(normalizedText: string): string | undefined {
  const includes = (...keywords: string[]): boolean =>
    keywords.some((keyword) => normalizedText.includes(keyword));

  if (includes("de_finance", "finance", "财务", "财报", "查账")) {
    return "de_finance";
  }

  if (includes("de_hr", "人力", "hr")) {
    return "de_hr";
  }

  if (includes("skill_agent", "开发", "代码", "工程")) {
    return "skill_agent";
  }

  return undefined;
}

function selectTargetAgentId(intent: CoordinatorIntent): string {
  return normalizeString(intent.target_agent) ?? "unknown";
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function buildGatewayUrl(options: LlmRouterOptions): string {
  try {
    const endpoint = new URL(COMPLETIONS_PATH, options.gatewayUrl);
    return endpoint.toString();
  } catch {
    throw new HttpError(500, "Invalid OpenClaw gateway URL");
  }
}

function buildGatewayHeaders(
  options: LlmRouterOptions,
  requestHeaders: IncomingHttpHeaders,
  targetAgentId: string,
  sessionId: string
): HeadersInit {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "x-openclaw-session-key": buildGatewaySessionKey(targetAgentId, sessionId)
  };

  if (options.apiKey !== undefined) {
    headers.authorization = `Bearer ${options.apiKey}`;
  }

  for (const [key, value] of Object.entries(requestHeaders)) {
    if (!shouldForwardHeader(key, value)) {
      continue;
    }

    const normalizedKey = key.toLowerCase();

    if (normalizedKey === "x-openclaw-agent-id" || normalizedKey === "x-openclaw-session-key") {
      continue;
    }

    headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  return headers;
}

function buildGatewaySessionKey(targetAgentId: string, sessionId: string): string {
  return `agent:${targetAgentId}:${sessionId}`;
}

function shouldForwardHeader(
  key: string,
  value: string | string[] | undefined
): value is string | string[] {
  if (value === undefined) {
    return false;
  }

  return key.toLowerCase().startsWith("x-openclaw-");
}

export function mapUpstreamError(status: number, body: string): HttpError {
  const message = extractGatewayErrorMessage(body);
  const detail = message ?? summarizeGatewayBody(body);
  const formatted = `OpenClaw gateway error (status ${status}): ${detail}`;

  if (typeof console !== "undefined" && typeof console.warn === "function") {
    console.warn("[openclaw-chat-proxy] upstream error", {
      status,
      detail
    });
  }

  return new HttpError(status, formatted);
}

function extractGatewayErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body);

    if (typeof parsed?.error?.message === "string") {
      return parsed.error.message;
    }

    if (typeof parsed?.message === "string") {
      return parsed.message;
    }
  } catch {
    // ignore JSON parse failures and fall back to undefined
  }

  return undefined;
}

function summarizeGatewayBody(body: string): string {
  const trimmed = body.trim();

  if (trimmed === "") {
    return "empty response body";
  }

  if (trimmed.length > 200) {
    return `${trimmed.slice(0, 200)}...`;
  }

  return trimmed;
}
