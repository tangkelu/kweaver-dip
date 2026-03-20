import { HttpError } from "../errors/http-error";
import type {
  DigitalHumanResponseRequest,
  OpenClawResponsesRequest
} from "../types/digital-human-response";

/**
 * Minimal fetch response shape used by the OpenClaw responses client.
 */
export interface OpenClawResponsesHttpResult {
  /**
   * Upstream HTTP status code.
   */
  status: number;

  /**
   * Upstream response headers.
   */
  headers: Headers;

  /**
   * Event stream body emitted by OpenClaw.
   */
  body: ReadableStream<Uint8Array>;
}

/**
 * Runtime configuration used to call OpenClaw `/v1/responses`.
 */
export interface OpenClawResponsesHttpClientOptions {
  /**
   * The configured OpenClaw gateway URL.
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
export type OpenClawFetch = typeof fetch;

/**
 * Defines the capability needed to proxy OpenClaw responses.
 */
export interface OpenClawResponsesHttpClient {
  /**
   * Creates an OpenClaw streaming response for a digital human.
   *
   * @param digitalHumanId The target digital human identifier.
   * @param requestBody The request payload received from Studio Web.
   * @param signal The abort signal tied to the downstream connection.
   * @param requestHeaders Optional upstream headers merged into the OpenClaw request.
   * @returns The upstream streaming HTTP response.
   */
  createResponseStream(
    digitalHumanId: string,
    requestBody: DigitalHumanResponseRequest,
    signal?: AbortSignal,
    requestHeaders?: HeadersInit
  ): Promise<OpenClawResponsesHttpResult>;
}

/**
 * HTTP client that proxies OpenClaw `/v1/responses`.
 */
export class DefaultOpenClawResponsesHttpClient
implements OpenClawResponsesHttpClient {
  /**
   * Creates the OpenClaw responses client.
   *
   * @param options Static upstream configuration.
   * @param fetchImpl Optional fetch implementation for tests.
   */
  public constructor(
    private readonly options: OpenClawResponsesHttpClientOptions,
    private readonly fetchImpl: OpenClawFetch = fetch
  ) {}

  /**
   * Creates a streaming response through OpenClaw `/v1/responses`.
   *
   * @param digitalHumanId The target digital human identifier.
   * @param requestBody The request payload received from Studio Web.
   * @param signal The abort signal tied to the downstream connection.
   * @param requestHeaders Optional upstream headers merged into the OpenClaw request.
   * @returns The upstream streaming HTTP response.
   */
  public async createResponseStream(
    digitalHumanId: string,
    requestBody: DigitalHumanResponseRequest,
    signal?: AbortSignal,
    requestHeaders?: HeadersInit
  ): Promise<OpenClawResponsesHttpResult> {
    const upstreamResponse = await this.fetchImpl(
      buildOpenClawResponsesUrl(this.options.gatewayUrl),
      {
        method: "POST",
        headers: createOpenClawResponsesHeaders(this.options.token, requestHeaders),
        body: JSON.stringify(
          createOpenClawResponsesRequestBody(digitalHumanId, requestBody)
        ),
        signal: mergeAbortSignals(signal)
      }
    ).catch((error: unknown) => {
      throw normalizeOpenClawResponsesError(error);
    });

    if (!upstreamResponse.ok) {
      throw await createOpenClawResponsesStatusError(upstreamResponse);
    }

    if (upstreamResponse.body === null) {
      throw new HttpError(502, "OpenClaw /v1/responses returned an empty stream");
    }

    return {
      status: upstreamResponse.status,
      headers: upstreamResponse.headers,
      body: upstreamResponse.body
    };
  }
}

/**
 * Builds the OpenClaw `/v1/responses` endpoint from the configured gateway URL.
 *
 * @param gatewayUrl The configured OpenClaw gateway URL.
 * @returns The derived HTTP endpoint for `/v1/responses`.
 */
export function buildOpenClawResponsesUrl(gatewayUrl: string): string {
  const url = new URL(gatewayUrl);

  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/v1/responses";
  url.search = "";
  url.hash = "";

  return url.toString();
}

/**
 * Creates the headers used to call OpenClaw `/v1/responses`.
 *
 * @param token The optional gateway bearer token.
 * @param requestHeaders Optional upstream headers merged into the OpenClaw request.
 * @returns The normalized request headers.
 */
export function createOpenClawResponsesHeaders(
  token?: string,
  requestHeaders?: HeadersInit
): Headers {
  const headers = new Headers({
    "content-type": "application/json",
    accept: "text/event-stream"
  });

  if (token !== undefined) {
    headers.set("authorization", `Bearer ${token}`);
  }

  if (requestHeaders !== undefined) {
    const extraHeaders = new Headers(requestHeaders);

    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
}

/**
 * Creates the request body forwarded to OpenClaw.
 *
 * @param digitalHumanId The target digital human identifier.
 * @param requestBody The request payload received from Studio Web.
 * @returns The normalized OpenClaw request body.
 */
export function createOpenClawResponsesRequestBody(
  digitalHumanId: string,
  requestBody: DigitalHumanResponseRequest
): OpenClawResponsesRequest {
  return {
    ...requestBody,
    model: `agent:${digitalHumanId}`,
    stream: true
  };
}

/**
 * Returns the downstream abort signal used to cancel the upstream stream.
 *
 * @param signal The abort signal tied to the downstream connection.
 * @returns The downstream abort signal, if any.
 */
export function mergeAbortSignals(
  signal?: AbortSignal
): AbortSignal | undefined {
  return signal;
}

/**
 * Converts upstream HTTP failures to a normalized HttpError.
 *
 * @param response The failed upstream HTTP response.
 * @returns The normalized failure.
 */
export async function createOpenClawResponsesStatusError(
  response: Response
): Promise<HttpError> {
  const responseText = await response.text();
  const trimmedResponseText = responseText.trim();
  const message =
    trimmedResponseText === ""
      ? `OpenClaw /v1/responses returned HTTP ${response.status}`
      : `OpenClaw /v1/responses returned HTTP ${response.status}: ${trimmedResponseText}`;

  return new HttpError(502, message);
}

/**
 * Normalizes unknown transport failures thrown by fetch.
 *
 * @param error The thrown transport failure.
 * @returns The normalized HttpError instance.
 */
export function normalizeOpenClawResponsesError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new HttpError(
    502,
    `Failed to communicate with OpenClaw /v1/responses: ${message}`
  );
}
