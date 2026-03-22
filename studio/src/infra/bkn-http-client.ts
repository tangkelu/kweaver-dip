import { HttpError } from "../errors/http-error";
import type { BknQuery } from "../types/bkn";

/**
 * Static configuration for the BKN backend proxy client.
 */
export interface BknHttpClientOptions {
  /**
   * Base URL of the upstream BKN backend.
   */
  baseUrl: string;

  /**
   * Optional bearer token used for outbound authorization.
   */
  token?: string;

  /**
   * Request timeout in milliseconds.
   */
  timeoutMs: number;
}

/**
 * Fetch implementation used for dependency injection in tests.
 */
export type BknFetch = typeof fetch;

/**
 * Lightweight upstream response container used by route handlers.
 */
export interface BknProxyResponse {
  /**
   * Upstream HTTP status code.
   */
  status: number;

  /**
   * Upstream response headers.
   */
  headers: Headers;

  /**
   * Raw upstream response body.
   */
  body: string;
}

/**
 * Defines the BKN operations exposed by the proxy client.
 */
export interface BknHttpClient {
  /**
   * Forwards the list request.
   *
   * @param query Incoming query string values.
   */
  listKnowledgeNetworks(query: BknQuery): Promise<BknProxyResponse>;

  /**
   * Forwards the detail request.
   *
   * @param knId Knowledge network id.
   * @param query Incoming query string values.
   */
  getKnowledgeNetwork(knId: string, query: BknQuery): Promise<BknProxyResponse>;
}

/**
 * Default HTTP client used to forward requests to the BKN backend.
 */
export class DefaultBknHttpClient implements BknHttpClient {
  /**
   * Creates the BKN client.
   *
   * @param options Static upstream configuration.
   * @param fetchImpl Optional fetch implementation for tests.
   */
  public constructor(
    private readonly options: BknHttpClientOptions,
    private readonly fetchImpl: BknFetch = fetch
  ) {}

  /**
   * Forwards the list request.
   *
   * @param query Incoming query string values.
   * @returns The normalized upstream response.
   */
  public async listKnowledgeNetworks(query: BknQuery): Promise<BknProxyResponse> {
    return this.forwardRequest("/api/bkn-backend/v1/knowledge-networks", "GET", query);
  }

  /**
   * Forwards the detail request.
   *
   * @param knId Knowledge network id.
   * @param query Incoming query string values.
   * @returns The normalized upstream response.
   */
  public async getKnowledgeNetwork(
    knId: string,
    query: BknQuery
  ): Promise<BknProxyResponse> {
    return this.forwardRequest(
      `/api/bkn-backend/v1/knowledge-networks/${encodeURIComponent(knId)}`,
      "GET",
      query
    );
  }

  /**
   * Executes one outbound request against the configured BKN backend.
   *
   * @param path Upstream path.
   * @param method HTTP method.
   * @param query Optional query string values.
   * @returns The normalized upstream response.
   */
  private async forwardRequest(
    path: string,
    method: "GET",
    query?: BknQuery
  ): Promise<BknProxyResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs
    ).unref();

    try {
      const response = await this.fetchImpl(buildBknUrl(this.options.baseUrl, path, query), {
        method,
        headers: createBknHeaders(this.options.token),
        signal: controller.signal
      }).catch((error: unknown) => {
        throw normalizeBknError(error);
      });

      return {
        status: response.status,
        headers: new Headers(response.headers),
        body: await response.text()
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/**
 * Builds a BKN backend URL from the base URL and request components.
 *
 * @param baseUrl Configured BKN backend base URL.
 * @param path Upstream request path.
 * @param query Optional query string values.
 * @returns The normalized request URL.
 */
export function buildBknUrl(baseUrl: string, path: string, query?: BknQuery): string {
  const url = new URL(baseUrl);

  url.pathname = path;
  url.search = "";
  url.hash = "";

  if (query !== undefined) {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string" && value.trim().length > 0) {
        url.searchParams.set(key, value);
      }
    }
  }

  return url.toString();
}

/**
 * Creates headers used for BKN upstream requests.
 *
 * @param token Optional outbound bearer token.
 * @param includeJsonContentType Whether a JSON request body is present.
 * @returns The request headers.
 */
export function createBknHeaders(
  token?: string
): Headers {
  const headers = new Headers({
    accept: "application/json"
  });

  if (token !== undefined && token.trim().length > 0) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return headers;
}

/**
 * Normalizes transport failures from `fetch`.
 *
 * @param error Unknown thrown value.
 * @returns The typed HTTP error.
 */
export function normalizeBknError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new HttpError(504, "BKN backend request timed out");
  }

  const description =
    error instanceof Error ? error.message : "Unknown upstream error";

  return new HttpError(502, `Failed to communicate with BKN backend: ${description}`);
}
