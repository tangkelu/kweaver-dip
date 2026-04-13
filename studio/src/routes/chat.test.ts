import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { HttpError } from "../errors/http-error";
import {
  buildFirstTurnSessionLabel,
  createChatRouter,
  isFirstChatTurn,
  readChatHistoryParams,
  resolveChatAgentSessionLabel
} from "./chat";

/**
 * Creates a minimal response double with chainable methods.
 *
 * @returns The mocked response object.
 */
function createResponseDouble(): Response {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  } as unknown as Response;

  vi.mocked(response.status).mockReturnValue(response);

  return response;
}

/**
 * Reads one router layer by path and HTTP method.
 *
 * @param router The Express router double.
 * @param path The registered route path.
 * @param method The expected HTTP method.
 * @returns The matched router layer when found.
 */
function findRouteLayer(
  router: {
    stack: Array<{
      route?: {
        path: string;
        methods?: Record<string, boolean>;
        stack: Array<{
          handle: (
            request: Request,
            response: Response,
            next: NextFunction
          ) => Promise<void> | void;
        }>;
      };
    }>;
  },
  path: string,
  method: "get" | "post"
): {
  route?: {
    path: string;
    methods?: Record<string, boolean>;
    stack: Array<{
      handle: (
        request: Request,
        response: Response,
        next: NextFunction
      ) => Promise<void> | void;
    }>;
  };
} | undefined {
  return router.stack.find(
    (entry) => entry.route?.path === path && entry.route?.methods?.[method] === true
  );
}

describe("readChatHistoryParams", () => {
  it("parses session key header and optional limit", () => {
    expect(
      readChatHistoryParams(
        {
          "x-openclaw-session-key": "agent:demo:user:user-1:direct:chat-1"
        },
        {
          limit: "20"
        }
      )
    ).toEqual({
      sessionKey: "agent:demo:user:user-1:direct:chat-1",
      limit: 20
    });
  });

  it("rejects missing session key header", () => {
    expect(() => readChatHistoryParams({}, {})).toThrow(
      "x-openclaw-session-key header is required"
    );
  });
});

describe("chat agent session labels", () => {
  it("builds the first-turn label using the required format", () => {
    expect(buildFirstTurnSessionLabel("  今天天气怎么样？ \n", "3f9c2b6a-xxxx")).toBe(
      "今天天气怎么样？_3f9c2b6a"
    );
  });

  it("treats a missing session as the first turn", async () => {
    await expect(
      isFirstChatTurn(
        {
          getChatMessages: vi.fn().mockRejectedValue(new HttpError(404, "not found")),
          getSession: vi.fn(),
          listSessions: vi.fn(),
          deleteSession: vi.fn(),
          getSessionSummary: vi.fn(),
          getSessionArchives: vi.fn(),
          getSessionArchiveSubpath: vi.fn(),
          previewSessions: vi.fn()
        },
        "agent:demo:user:user-1:direct:chat-1"
      )
    ).resolves.toBe(true);
  });

  it("returns a label only for the first chat turn", async () => {
    const sessionsLogic = {
      getChatMessages: vi.fn().mockResolvedValueOnce({
        sessionKey: "agent:demo:user:user-1:direct:chat-1",
        messages: []
      }).mockResolvedValueOnce({
        sessionKey: "agent:demo:user:user-1:direct:chat-1",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "hello" }]
          }
        ]
      }),
      getSession: vi.fn(),
      listSessions: vi.fn(),
      deleteSession: vi.fn(),
      getSessionSummary: vi.fn(),
      getSessionArchives: vi.fn(),
      getSessionArchiveSubpath: vi.fn(),
      previewSessions: vi.fn()
    };

    await expect(
      resolveChatAgentSessionLabel(
        sessionsLogic,
        "agent:demo:user:user-1:direct:chat-1",
        "hello world"
      )
    ).resolves.toMatch(/^hello world_[0-9a-fA-F]{8}$/);

    await expect(
      resolveChatAgentSessionLabel(
        sessionsLogic,
        "agent:demo:user:user-1:direct:chat-1",
        "hello world"
      )
    ).resolves.toBeUndefined();
  });
});

describe("createChatRouter", () => {
  it("registers all chat routes", () => {
    const router = createChatRouter() as {
      stack: Array<{
        route?: {
          path: string;
        };
      }>;
    };

    expect(findRouteLayer(router, "/api/dip-studio/v1/chat/session", "post")).toBeDefined();
    expect(findRouteLayer(router, "/api/dip-studio/v1/chat/messages", "get")).toBeDefined();
    expect(findRouteLayer(router, "/api/dip-studio/v1/chat/agent", "post")).toBeDefined();
  });

  it("handles chat messages request", async () => {
    const getChatMessages = vi.fn().mockResolvedValue({
      sessionKey: "agent:demo:user:user-1:direct:chat-1",
      sessionId: "runtime-1",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              source: {
                type: "path",
                path: "tmp/chat-1/a.txt"
              }
            },
            {
              type: "text",
              text: "hello"
            }
          ]
        }
      ]
    });
    const router = createChatRouter({
      sessionsLogic: {
        getChatMessages,
        getSession: vi.fn(),
        listSessions: vi.fn(),
        deleteSession: vi.fn(),
        getSessionSummary: vi.fn(),
        getSessionArchives: vi.fn(),
        getSessionArchiveSubpath: vi.fn(),
        previewSessions: vi.fn()
      }
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
    const layer = findRouteLayer(router, "/api/dip-studio/v1/chat/messages", "get");
    const handler = layer?.route?.stack[0]?.handle;
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      {
        headers: {
          "x-openclaw-session-key": "agent:demo:user:user-1:direct:chat-1"
        },
        query: {
          limit: "50"
        }
      } as unknown as Request,
      response,
      next
    );

    expect(getChatMessages).toHaveBeenCalledWith({
      sessionKey: "agent:demo:user:user-1:direct:chat-1",
      limit: 50
    });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      sessionKey: "agent:demo:user:user-1:direct:chat-1",
      sessionId: "runtime-1",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              source: {
                type: "path",
                path: "tmp/chat-1/a.txt"
              }
            },
            {
              type: "text",
              text: "hello"
            }
          ]
        }
      ]
    });
    expect(next).not.toHaveBeenCalled();
  });
});
