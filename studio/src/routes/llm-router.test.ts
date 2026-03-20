import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "../errors/http-error";
import { createLlmCompletionHandler } from "./llm-router";

function createResponseDouble(): ExpressResponse {
  const response = {
    status: vi.fn(),
    send: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
    flushHeaders: vi.fn(),
    destroy: vi.fn()
  } as unknown as ExpressResponse;

  vi.mocked(response.status).mockReturnValue(response);
  vi.mocked(response.send).mockReturnValue(response);
  vi.mocked(response.json).mockReturnValue(response);

  return response;
}

describe("createLlmCompletionHandler", () => {
  const fetchMock = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>();
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    consoleWarnSpy.mockRestore();
  });

  it("proxies directly when agent_id is provided", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hi" }],
          stream: false,
          agent_id: "de_finance",
          session_id: "session-1"
        },
        headers: {
          "x-openclaw-session-key": "ignored-by-router",
          "x-openclaw-extra": "tenant-a"
        }
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://gateway.test/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      "x-openclaw-session-key": "agent:de_finance:session-1",
      "x-openclaw-extra": "tenant-a"
    });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.stream).toBe(false);
    expect(body.model).toBe("openclaw:de_finance");
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const firstMessage =
      typeof messages[0] === "object" && messages[0] !== null
        ? (messages[0] as Record<string, unknown>)
        : undefined;
    expect(firstMessage?.role).toBe("user");
    expect(String(firstMessage?.content)).toContain("Session=session-1");
    expect(String(firstMessage?.content)).toContain("hi");
    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "de_finance");
    expect(response.setHeader).toHaveBeenCalledWith("current_session_id", "session-1");
    expect(response.send).toHaveBeenCalledWith(JSON.stringify({ id: "ok" }));
  });

  it("adds authorization header when apiKey is configured", async () => {
    const handler = createLlmCompletionHandler({
      gatewayUrl: "https://gateway.test",
      apiKey: "test-token"
    });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-auth"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      authorization: "Bearer test-token"
    });
  });

  it("calls coordinator and executes target agent by default", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ target_agent: "de_hr" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "init-ok" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "chatcmpl-default" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "盘一下Q3人力报表" }],
          stream: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-openclaw-session-key"]).toMatch(/^agent:coordinator:/);
    const firstBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(firstBody.model).toBe("openclaw:coordinator");
    const [, secondInit] = fetchMock.mock.calls[1] ?? [];
    const secondBody = JSON.parse(String(secondInit?.body)) as Record<string, unknown>;
    expect(secondBody.model).toBe("openclaw:de_hr");
    expect(secondBody.messages).toEqual([{ role: "user", content: "/new" }]);
    const [, thirdInit] = fetchMock.mock.calls[2] ?? [];
    const thirdBody = JSON.parse(String(thirdInit?.body)) as Record<string, unknown>;
    expect(thirdBody.model).toBe("openclaw:de_hr");
    expect(response.send).toHaveBeenCalledWith(JSON.stringify({ id: "chatcmpl-default" }));
  });

  it("returns confirmation card when require_confirmation is true", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ target_agent: "de_finance" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "看财报" }],
          require_confirmation: true,
          session_id: "session-2"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, firstInit] = fetchMock.mock.calls[0] ?? [];
    expect(firstInit?.headers).toMatchObject({
      "x-openclaw-session-key": "agent:coordinator:session-2"
    });
    const firstBody = JSON.parse(String(firstInit?.body)) as Record<string, unknown>;
    expect(firstBody.model).toBe("openclaw:coordinator");
    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "de_finance");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("does not send /new when session_id is provided", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ target_agent: "de_hr" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "chatcmpl-existing-session" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "继续这个会话" }],
          session_id: "session-existing"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1] ?? [];
    const secondBody = JSON.parse(String(secondInit?.body)) as Record<string, unknown>;
    const secondMessages = Array.isArray(secondBody.messages) ? secondBody.messages : [];
    const secondUser =
      typeof secondMessages[0] === "object" && secondMessages[0] !== null
        ? (secondMessages[0] as Record<string, unknown>)
        : undefined;
    expect(secondUser?.role).toBe("user");
    expect(String(secondUser?.content)).toContain("Session=session-existing");
    expect(String(secondUser?.content)).toContain("继续这个会话");
  });

  it("injects current agent and session as first SSE event", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: model-output\n\n"));
        controller.close();
      }
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          stream: true,
          agent_id: "de_finance",
          session_id: "session-3"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.write).toHaveBeenCalled();
    const firstWrite = vi.mocked(response.write).mock.calls[0]?.[0];
    expect(String(firstWrite)).toContain('"current_agent_id":"de_finance"');
    expect(String(firstWrite)).toContain('"current_session_id":"session-3"');
    expect(response.end).toHaveBeenCalled();
  });

  it("falls back to unknown when coordinator response is invalid", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/plain" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "help" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "unknown");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("extracts target_agent from OpenAI completion envelope", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_x",
          choices: [
            {
              message: {
                role: "assistant",
                content: "{\"target_agent\":\"de_hr\"}"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "help" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "de_hr");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("extracts target_agent from OpenAI content part array", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_x",
          choices: [
            {
              message: {
                role: "assistant",
                content: [
                  {
                    type: "text",
                    text: "{\"target_agent\":\"plan_agent\"}"
                  }
                ]
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "make a plan" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("maps upstream errors with status and detail", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), {
        status: 401,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-4"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).statusCode).toBe(401);
    expect((error as HttpError).message).toBe(
      "OpenClaw gateway error (status 401): Unauthorized"
    );
  });

  it("maps upstream flattened message field", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: "quota exceeded" }), {
        status: 429,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-429"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).message).toBe(
      "OpenClaw gateway error (status 429): quota exceeded"
    );
  });

  it("forces coordinator stream to false during classification", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ target_agent: "de_finance" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          stream: true,
          require_confirmation: false,
          session_id: "session-5"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, firstInit] = fetchMock.mock.calls[0] ?? [];
    const firstBody = JSON.parse(String(firstInit?.body)) as Record<string, unknown>;
    const messages = Array.isArray(firstBody.messages) ? firstBody.messages : [];
    const firstMessage =
      typeof messages[0] === "object" && messages[0] !== null
        ? (messages[0] as Record<string, unknown>)
        : undefined;

    expect(firstBody.stream).toBe(false);
    expect(firstMessage?.role).toBe("system");
    expect(firstMessage?.content).toContain("target_agent");
  });

  it("parses coordinator JSON embedded in text blocks", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response("prefix {\"target_agent\":\" de_hr \"} suffix", {
        status: 200,
        headers: { "content-type": "text/plain" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('"de_hr"')
      })
    );
  });

  it("infers target agent from plain-language coordinator responses", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_x",
          choices: [
            {
              message: {
                role: "assistant",
                content: "我来查看一下财务专员的相关信息。"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "帮我看下财报" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("prioritizes target_agent over target_de from coordinator intent", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ target_agent: "plan_agent", target_de: "de_finance" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "chatcmpl-routed" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "帮我做一份财务计划" }],
          session_id: "session-target-de"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1] ?? [];
    const secondBody = JSON.parse(String(secondInit?.body)) as Record<string, unknown>;
    expect(secondBody.model).toBe("openclaw:plan_agent");
    expect(secondBody.target_de).toBeUndefined();
    const secondMessages = Array.isArray(secondBody.messages) ? secondBody.messages : [];
    const secondSystem =
      typeof secondMessages[0] === "object" && secondMessages[0] !== null
        ? (secondMessages[0] as Record<string, unknown>)
        : undefined;
    expect(secondSystem?.role).toBe("system");
    expect(String(secondSystem?.content)).toContain("de_finance");
    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
  });

  it("passes target_de from request when agent_id is explicitly provided", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "执行财务任务" }],
          agent_id: "plan_agent",
          target_de: "de_finance",
          session_id: "session-pass-target-de"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.model).toBe("openclaw:plan_agent");
    expect(payload.target_de).toBeUndefined();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const firstMessage =
      typeof messages[0] === "object" && messages[0] !== null
        ? (messages[0] as Record<string, unknown>)
        : undefined;
    expect(firstMessage?.role).toBe("system");
    expect(String(firstMessage?.content)).toContain("de_finance");
  });

  it("infers plan_agent for reminder-style coordinator natural text", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl_x",
          choices: [
            {
              message: {
                role: "assistant",
                content: "这是一个提醒任务，我将为你建立计划。"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "明天提醒我开会" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("uses plan_agent when target_de is invalid", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ target_agent: "plan_agent", target_de: "de_unknown" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "帮我规划下流程" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ type: "confirmation_card" })
    );
  });

  it("uses target_agent when plain text contains both target_agent and target_de", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "target_agent: plan_agent, target_de: skill_agent"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "帮我改代码并安排计划" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
  });

  it("infers chit_chat from coordinator natural text", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "我们就随便闲聊一下吧"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "今天天气不错" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "chit_chat");
  });

  it("handles non-object request body when building coordinator payload", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "content-type": "text/plain" }
      })
    );

    await handler(
      {
        body: "invalid-body",
        headers: {
          "x-openclaw-agent-id": "ignored"
        }
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.model).toBe("openclaw:coordinator");
    expect(payload.stream).toBe(false);
  });

  it("infers business coding text into plan_agent intent with skill target_de", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                role: "assistant",
                content: "这是写代码需求，我来处理开发任务"
              }
            }
          ]
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "帮我写段代码" }],
          require_confirmation: true
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).toHaveBeenCalledWith("current_agent_id", "plan_agent");
  });

  it("enhances user content parts when message content is an array", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: "请继续" }]
            }
          ],
          agent_id: "de_finance",
          session_id: "session-array-content"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const user =
      typeof messages[0] === "object" && messages[0] !== null
        ? (messages[0] as Record<string, unknown>)
        : undefined;
    const content = Array.isArray(user?.content) ? user?.content : [];
    const firstPart =
      typeof content[0] === "object" && content[0] !== null
        ? (content[0] as Record<string, unknown>)
        : undefined;
    expect(String(firstPart?.text)).toContain("Session=session-array-content");
  });

  it("keeps non-user messages unchanged while enhancing user prompt", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [
            { role: "system", content: "规则A" },
            { role: "user", content: "开始执行" }
          ],
          agent_id: "de_finance",
          session_id: "session-non-user"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const first =
      typeof messages[0] === "object" && messages[0] !== null
        ? (messages[0] as Record<string, unknown>)
        : undefined;
    const second =
      typeof messages[1] === "object" && messages[1] !== null
        ? (messages[1] as Record<string, unknown>)
        : undefined;
    expect(first?.content).toBe("规则A");
    expect(String(second?.content)).toContain("Session=session-non-user");
  });

  it("keeps router-controlled agent/session headers over client values", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-router"
        },
        headers: {
          "x-openclaw-agent-id": "evil-agent",
          "x-openclaw-session-key": "evil-session"
        }
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      "x-openclaw-session-key": "agent:de_finance:session-router"
    });
    const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(payload.model).toBe("openclaw:de_finance");
  });

  it("ignores undefined x-openclaw headers from client request", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-undefined"
        },
        headers: {
          "x-openclaw-trace-id": undefined
        }
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-openclaw-trace-id"]).toBeUndefined();
  });

  it("does not forward upstream content-length header", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": "999",
          "x-upstream-debug": "trace-1"
        }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-content-length"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.setHeader).not.toHaveBeenCalledWith("content-length", "999");
    expect(response.setHeader).toHaveBeenCalledWith("x-upstream-debug", "trace-1");
  });

  it("returns 504 on abort timeout errors", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    fetchMock.mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError")
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-timeout"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).statusCode).toBe(504);
  });

  it("returns generic proxy message for non-Error rejections", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    fetchMock.mockRejectedValue("network-down");

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-network"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).statusCode).toBe(502);
    expect((error as HttpError).message).toBe("Failed to reach OpenClaw gateway");
  });

  it("summarizes empty upstream error bodies", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    fetchMock.mockResolvedValue(
      new Response("", {
        status: 500,
        headers: { "content-type": "text/plain" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-empty"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).message).toContain("empty response body");
  });

  it("truncates very long upstream error bodies", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const longBody = "x".repeat(260);

    fetchMock.mockResolvedValue(
      new Response(longBody, {
        status: 500,
        headers: { "content-type": "text/plain" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-long"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).message.length).toBeLessThan(280);
    expect((error as HttpError).message.endsWith("...")).toBe(true);
  });

  it("creates a new session id when request session_id is missing", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = init?.headers as Record<string, string>;
    expect(headers["x-openclaw-session-key"]).toMatch(
      /^agent:de_finance:[0-9a-f-]{36}$/
    );
  });

  it("handles event-stream responses with null body safely", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();

    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          stream: true,
          agent_id: "de_finance",
          session_id: "session-null"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      vi.fn()
    );

    expect(response.end).toHaveBeenCalled();
  });

  it("handles event-stream read failures", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "https://gateway.test" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: begin\n\n"));
        controller.error(new Error("stream exploded"));
      }
    });

    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      })
    );

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          stream: true,
          agent_id: "de_finance",
          session_id: "session-stream-error"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    expect(response.destroy).toHaveBeenCalled();
    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).statusCode).toBe(502);
    expect((error as HttpError).message).toContain("stream exploded");
  });

  it("returns 500 when gateway url is invalid", async () => {
    const handler = createLlmCompletionHandler({ gatewayUrl: "::invalid::" });
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler(
      {
        body: {
          messages: [{ role: "user", content: "hello" }],
          agent_id: "de_finance",
          session_id: "session-invalid-url"
        },
        headers: {}
      } as unknown as ExpressRequest,
      response,
      next
    );

    const [error] = next.mock.calls[0] ?? [];
    expect((error as HttpError).statusCode).toBe(500);
  });
});
