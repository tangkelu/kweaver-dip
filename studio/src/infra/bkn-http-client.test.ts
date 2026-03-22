import { describe, expect, it, vi } from "vitest";

import {
  buildBknUrl,
  createBknHeaders,
  DefaultBknHttpClient,
  normalizeBknError
} from "./bkn-http-client";

describe("buildBknUrl", () => {
  it("joins the base URL, path and query string values", () => {
    expect(
      buildBknUrl("http://127.0.0.1:13014/base?x=1", "/api/bkn-backend/v1/knowledge-networks", {
        name_pattern: "risk",
        direction: "desc",
        limit: "10"
      })
    ).toBe(
      "http://127.0.0.1:13014/api/bkn-backend/v1/knowledge-networks?name_pattern=risk&direction=desc&limit=10"
    );
  });
});

describe("createBknHeaders", () => {
  it("sets accept and optional authorization", () => {
    const headers = createBknHeaders("secret-token");

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer secret-token");
    expect(headers.get("content-type")).toBeNull();
  });
});

describe("normalizeBknError", () => {
  it("wraps transport errors as HttpError", async () => {
    const { HttpError } = await import("../errors/http-error");
    const httpError = new HttpError(502, "bad gateway");

    expect(normalizeBknError(httpError)).toBe(httpError);
    expect(normalizeBknError(new Error("offline"))).toMatchObject({
      statusCode: 502,
      message: "Failed to communicate with BKN backend: offline"
    });
  });
});

describe("DefaultBknHttpClient", () => {
  it("forwards GET requests with query params and authorization header", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = new DefaultBknHttpClient(
      {
        baseUrl: "http://127.0.0.1:13014",
        token: "secret",
        timeoutMs: 5000
      },
      fetchImpl
    );

    await expect(
      client.listKnowledgeNetworks({
        name_pattern: "incident",
        limit: "20"
      })
    ).resolves.toEqual({
      status: 200,
      headers: expect.any(Headers),
      body: JSON.stringify({ items: [] })
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:13014/api/bkn-backend/v1/knowledge-networks?name_pattern=incident&limit=20"
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "GET"
    });

    const headers = fetchImpl.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer secret");
  });
  it("forwards detail GET requests", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "kn-1" }), {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      })
    );

    const client = new DefaultBknHttpClient(
      {
        baseUrl: "http://127.0.0.1:13014",
        token: "secret",
        timeoutMs: 5000
      },
      fetchImpl
    );

    await client.getKnowledgeNetwork("kn-1", { include_statistics: "true" });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:13014/api/bkn-backend/v1/knowledge-networks/kn-1?include_statistics=true"
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      method: "GET"
    });
  });
});
