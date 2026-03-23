import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../errors/http-error";
import {
  attachDownstreamAbortHandlers,
  createDigitalHumanResponseRequestHeaders,
  createDigitalHumanResponseRouter,
  pipeEventStream,
  readAgentIdFromSessionKey,
  readDigitalHumanResponseRequestBody,
  readRequiredSessionKeyHeader,
  readOptionalHeaderValue,
  writeEventStreamHeaders
} from "./digital-human-response";

/**
 * Creates a minimal response double with chainable methods and writable stream hooks.
 *
 * @returns The mocked response object.
 */
function createResponseDouble(): Response {
  const response = {
    status: vi.fn(),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    on: vi.fn(),
    flushHeaders: vi.fn(),
    destroyed: false,
    headersSent: false,
    writableEnded: false
  } as unknown as Response;

  vi.mocked(response.status).mockReturnValue(response);
  vi.mocked(response.flushHeaders).mockImplementation(() => {
    (response as Response & { headersSent: boolean }).headersSent = true;
  });
  vi.mocked(response.end).mockImplementation(() => {
    (response as Response & { writableEnded: boolean }).writableEnded = true;
  });

  return response;
}

describe("readDigitalHumanResponseRequestBody", () => {
  it("accepts JSON objects and rejects other body shapes", () => {
    expect(
      readDigitalHumanResponseRequestBody({
        input: "hello"
      })
    ).toEqual({
      input: "hello"
    });

    expect(() => readDigitalHumanResponseRequestBody(undefined)).toThrow(
      "Digital human response request body must be a JSON object"
    );
    expect(() => readDigitalHumanResponseRequestBody([])).toThrow(
      "Digital human response request body must be a JSON object"
    );
  });
});

describe("readOptionalHeaderValue", () => {
  it("returns the first header value when the header is repeated", () => {
    expect(readOptionalHeaderValue(["session-1", "session-2"])).toBe("session-1");
    expect(readOptionalHeaderValue("session-1")).toBe("session-1");
    expect(readOptionalHeaderValue(undefined)).toBeUndefined();
  });
});

describe("readRequiredSessionKeyHeader", () => {
  it("extracts x-openclaw-session-key only", () => {
    const sessionKey = readRequiredSessionKeyHeader({
      "x-openclaw-session-key": "agent:demo:session-1",
      "x-openclaw-extra": "ignored"
    });

    expect(sessionKey).toBe("agent:demo:session-1");
  });

  it("fails when x-openclaw-session-key is absent", () => {
    expect(() => readRequiredSessionKeyHeader({})).toThrow(
      "x-openclaw-session-key header is required"
    );
  });
});

describe("readAgentIdFromSessionKey", () => {
  it("parses agent id from the session key prefix", () => {
    expect(
      readAgentIdFromSessionKey("agent:agent-1:user:user-1:direct:chat-1")
    ).toBe("agent-1");
  });

  it("rejects session keys without an agent prefix", () => {
    expect(() => readAgentIdFromSessionKey("user:user-1:direct:chat-1")).toThrow(
      "x-openclaw-session-key must start with agent:<agentId>:"
    );
  });
});

describe("createDigitalHumanResponseRequestHeaders", () => {
  it("forwards x-openclaw-session-key only", () => {
    const headers = createDigitalHumanResponseRequestHeaders(
      "agent:demo:user:user-1:direct:chat-1"
    );

    expect(headers).toBeInstanceOf(Headers);
    expect(headers.get("x-openclaw-session-key")).toBe(
      "agent:demo:user:user-1:direct:chat-1"
    );
  });
});

describe("writeEventStreamHeaders", () => {
  it("writes the SSE response headers", () => {
    const response = createResponseDouble();

    writeEventStreamHeaders(
      response,
      200,
      new Headers({
        "content-type": "text/event-stream",
        "cache-control": "no-cache"
      })
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "text/event-stream"
    );
    expect(response.setHeader).toHaveBeenCalledWith("cache-control", "no-cache");
    expect(response.setHeader).toHaveBeenCalledWith("connection", "keep-alive");
    expect(response.setHeader).toHaveBeenCalledWith("x-accel-buffering", "no");
    expect(response.flushHeaders).toHaveBeenCalledOnce();
  });

  it("falls back to the default SSE headers when upstream headers are missing", () => {
    const response = createResponseDouble();

    writeEventStreamHeaders(response, 200, new Headers());

    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "text/event-stream; charset=utf-8"
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "cache-control",
      "no-cache, no-transform"
    );
    expect(response.setHeader).toHaveBeenCalledWith("connection", "keep-alive");
  });
});

describe("attachDownstreamAbortHandlers", () => {
  it("does not abort when the request closes normally after the body is read", () => {
    const abortController = new AbortController();
    const request = {
      on: vi.fn()
    } as unknown as Request;
    const response = {
      on: vi.fn(),
      writableEnded: true
    } as unknown as Response;

    attachDownstreamAbortHandlers(request, response, abortController);

    const responseCloseHandler = vi.mocked(response.on).mock.calls.find(
      ([eventName]) => eventName === "close"
    )?.[1] as (() => void) | undefined;

    responseCloseHandler?.();

    expect(abortController.signal.aborted).toBe(false);
  });

  it("aborts when the client aborts the request", () => {
    const abortController = new AbortController();
    const request = {
      on: vi.fn()
    } as unknown as Request;
    const response = {
      on: vi.fn(),
      writableEnded: false
    } as unknown as Response;

    attachDownstreamAbortHandlers(request, response, abortController);

    const requestAbortedHandler = vi.mocked(request.on).mock.calls.find(
      ([eventName]) => eventName === "aborted"
    )?.[1] as (() => void) | undefined;

    requestAbortedHandler?.();

    expect(abortController.signal.aborted).toBe(true);
  });
});

describe("pipeEventStream", () => {
  it("writes each chunk and ends the response", async () => {
    const response = createResponseDouble();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: first\n\n"));
        controller.enqueue(new TextEncoder().encode("data: second\n\n"));
        controller.close();
      }
    });

    await pipeEventStream(stream, response);

    expect(response.write).toHaveBeenCalledTimes(2);
    expect(response.end).toHaveBeenCalledOnce();
  });

  it("ends the response even when the stream closes without emitting chunks", async () => {
    const response = createResponseDouble();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      }
    });

    await pipeEventStream(stream, response);

    expect(response.write).not.toHaveBeenCalled();
    expect(response.end).toHaveBeenCalledOnce();
  });
});

describe("createDigitalHumanResponseRouter", () => {
  it("proxies the upstream event stream to the client", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const createResponseStream = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "content-type": "text/event-stream"
      }),
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: hello\n\n"));
          controller.close();
        }
      })
    });
    const router = createDigitalHumanResponseRouter({
      createResponseStream
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "agent:agent-1:user:user-1:direct:chat-1"
      },
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(createResponseStream).toHaveBeenCalledOnce();
    expect(createResponseStream.mock.calls[0]?.[0]).toBe("agent-1");
    expect(createResponseStream.mock.calls[0]?.[1]).toEqual({
      input: "hello"
    });
    expect(createResponseStream.mock.calls[0]?.[2]).toBeInstanceOf(AbortSignal);
    expect(
      (createResponseStream.mock.calls[0]?.[3] as Headers | undefined)?.get(
        "x-openclaw-session-key"
      )
    ).toBe("agent:agent-1:user:user-1:direct:chat-1");
    expect(response.write).toHaveBeenCalledOnce();
    expect(response.end).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects the request when x-openclaw-session-key is absent", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn()
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {},
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: "x-openclaw-session-key header is required"
      })
    );
  });

  it("rejects malformed session keys", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn()
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "user:user-1:direct:chat-1"
      },
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "x-openclaw-session-key must start with agent:<agentId>:"
      })
    );
  });

  it("forwards validation errors to middleware", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn()
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: [],
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(vi.mocked(next).mock.calls[0]?.[0]).toMatchObject({
      statusCode: 400,
      message: "Digital human response request body must be a JSON object"
    });
  });

  it("forwards upstream HttpError instances to middleware", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const upstreamError = new HttpError(502, "upstream failed");
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn().mockRejectedValue(upstreamError)
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "agent:agent-1:user:user-1:direct:chat-1"
      },
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(next).toHaveBeenCalledWith(upstreamError);
  });

  it("does not forward errors to middleware after the SSE headers have been sent", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const createResponseStream = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "content-type": "text/event-stream"
      }),
      body: {
        getReader: () => ({
          read: vi
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new TextEncoder().encode("data: hello\n\n")
            })
            .mockRejectedValueOnce(new Error("tool call failed")),
          releaseLock: vi.fn()
        })
      } as unknown as ReadableStream<Uint8Array>
    });
    const router = createDigitalHumanResponseRouter({
      createResponseStream
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "agent:agent-1:user:user-1:direct:chat-1"
      },
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(response.flushHeaders).toHaveBeenCalledOnce();
    expect(response.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("stops quietly when the downstream request has already been aborted", async () => {
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn().mockRejectedValue(new Error("socket closed"))
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "agent:agent-1:user:user-1:direct:chat-1"
      },
      on: vi.fn((eventName: string, listener: () => void) => {
        if (eventName === "aborted") {
          listener();
        }
      })
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.end).not.toHaveBeenCalled();
  });

  it("ends the response when an error happens after headers were already marked as sent", async () => {
    const response = createResponseDouble();
    (response as Response & { headersSent: boolean }).headersSent = true;
    const next = vi.fn<NextFunction>();
    const router = createDigitalHumanResponseRouter({
      createResponseStream: vi.fn().mockRejectedValue(new Error("boom"))
    }) as {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{
            handle: (
              request: Request,
              response: Response,
              next: NextFunction
            ) => Promise<void>;
          }>;
        };
      }>;
    };
    const layer = router.stack.find(
      (entry) => entry.route?.path === "/api/dip-studio/v1/chat/responses"
    );
    const handler = layer?.route?.stack[0]?.handle;
    const request = {
      body: {
        input: "hello"
      },
      headers: {
        "x-openclaw-session-key": "agent:agent-1:user:user-1:direct:chat-1"
      },
      on: vi.fn()
    } as unknown as Request;

    await handler?.(request, response, next);

    expect(response.end).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
  });
});
