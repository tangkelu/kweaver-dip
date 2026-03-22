import type {
  NextFunction,
  Request,
  Response,
  Router
} from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../errors/http-error";
import type { BknHttpClient } from "../infra/bkn-http-client";
import {
  createBknRouter,
  readRequiredKnId,
  writeProxyResponse
} from "./bkn";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

/**
 * Creates a minimal response double with chainable methods.
 *
 * @returns The mocked response object.
 */
function createResponseDouble(): Response {
  const response = {
    status: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn()
  } as unknown as Response;

  vi.mocked(response.status).mockReturnValue(response);

  return response;
}

/**
 * Locates an Express route handler by path and HTTP method.
 *
 * @param router The Express router.
 * @param method HTTP method.
 * @param path Route path string.
 * @returns The handler function, if any.
 */
function findHandler(
  router: Router,
  method: "get",
  path: string
):
  | ((
      request: Request,
      response: Response,
      next: NextFunction
    ) => Promise<void>)
  | undefined {
  const layer = router.stack.find((item) => {
    const route = item.route;

    if (!route || route.path !== path) {
      return false;
    }

    return Boolean((route.methods as Record<string, boolean>)[method]);
  });

  return layer?.route?.stack[0]?.handle;
}

/**
 * Creates a BKN client test double.
 *
 * @returns A mocked client.
 */
function createClientDouble(): BknHttpClient {
  return {
    listKnowledgeNetworks: vi.fn(),
    getKnowledgeNetwork: vi.fn()
  };
}

describe("createBknRouter", () => {
  const collectionPath = "/api/dip-studio/v1/knowledge-networks";
  const detailPath = "/api/dip-studio/v1/knowledge-networks/:kn_id";

  it("registers all BKN routes", () => {
    const router = createBknRouter(createClientDouble()) as Router;

    expect(findHandler(router, "get", collectionPath)).toBeDefined();
    expect(findHandler(router, "get", detailPath)).toBeDefined();
  });

  it("forwards list requests", async () => {
    const client = createClientDouble();
    vi.mocked(client.listKnowledgeNetworks).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: "{\"items\":[]}"
    });
    const router = createBknRouter(client) as Router;
    const handler = findHandler(router, "get", collectionPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { query: { limit: "10" } } as unknown as Request,
      response,
      next
    );

    expect(client.listKnowledgeNetworks).toHaveBeenCalledWith({ limit: "10" });
    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "application/json"
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith("{\"items\":[]}");
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards detail requests", async () => {
    const client = createClientDouble();
    vi.mocked(client.getKnowledgeNetwork).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      body: "{\"id\":\"kn-1\"}"
    });
    const router = createBknRouter(client) as Router;
    const handler = findHandler(router, "get", detailPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      {
        params: { kn_id: "kn-1" },
        query: { include_statistics: "true" }
      } as unknown as Request,
      response,
      next
    );

    expect(client.getKnowledgeNetwork).toHaveBeenCalledWith("kn-1", {
      include_statistics: "true"
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("rejects empty kn_id values", async () => {
    const router = createBknRouter(createClientDouble()) as Router;
    const handler = findHandler(router, "get", detailPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { params: { kn_id: " " }, query: {} } as unknown as Request,
      response,
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "kn_id path parameter is required"
      })
    );
  });

  it("wraps unexpected list errors", async () => {
    const client = createClientDouble();
    vi.mocked(client.listKnowledgeNetworks).mockRejectedValue(new Error("boom"));
    const router = createBknRouter(client) as Router;
    const handler = findHandler(router, "get", collectionPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.({ query: {} } as unknown as Request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        message: "Failed to query BKN knowledge networks"
      })
    );
  });
});

describe("readRequiredKnId", () => {
  it("returns the trimmed id and rejects missing values", () => {
    expect(readRequiredKnId(" kn-1 ")).toBe("kn-1");
    expect(() => readRequiredKnId(" ")).toThrowError(HttpError);
  });
});

describe("writeProxyResponse", () => {
  it("copies headers and writes a body when present", () => {
    const response = createResponseDouble();

    writeProxyResponse(response, {
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "content-length": "12"
      }),
      body: "{\"ok\":true}"
    });

    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "application/json"
    );
    expect(response.setHeader).not.toHaveBeenCalledWith("content-length", "12");
    expect(response.send).toHaveBeenCalledWith("{\"ok\":true}");
  });

  it("ends the response for empty bodies", () => {
    const response = createResponseDouble();

    writeProxyResponse(response, {
      status: 204,
      headers: new Headers(),
      body: ""
    });

    expect(response.end).toHaveBeenCalled();
  });
});
