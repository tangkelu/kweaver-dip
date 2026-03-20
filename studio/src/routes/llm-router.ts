import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import type {
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse
} from "express";
import { Router } from "express";

import { HttpError } from "../errors/http-error";
import {
  createLlmRouterLogic,
  mapUpstreamError,
  type LlmRouterOptions
} from "../logic/llm-router";

export type { LlmRouterOptions } from "../logic/llm-router";

const DEFAULT_PROXY_TIMEOUT_MS = 60_000;
const COMPLETIONS_PATH = "/v1/chat/completions";
const CHAT_COMPLETION_ROUTES = [COMPLETIONS_PATH];

export function createLlmRouter(options: LlmRouterOptions): Router {
  const router = Router();
  const handler = createLlmCompletionHandler(options);

  for (const path of CHAT_COMPLETION_ROUTES) {
    router.post(path, handler);
  }

  return router;
}

export function createLlmCompletionHandler(options: LlmRouterOptions) {
  const chatProxyLogic = createLlmRouterLogic(options);

  return async function chatCompletionHandler(
    request: ExpressRequest,
    response: ExpressResponse,
    next: NextFunction
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs ?? DEFAULT_PROXY_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs).unref();

    try {
      const result = await chatProxyLogic.handleRequest({
        body: request.body,
        headers: request.headers,
        signal: controller.signal
      });

      setRoutingHeaders(response, result.targetAgentId, result.sessionId);

      if (result.kind === "confirmation") {
        response.status(200).json(result.confirmationCard);
        return;
      }

      await relayGatewayResponse(
        result.upstreamResponse,
        response,
        result.targetAgentId,
        result.sessionId
      );
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        next(new HttpError(504, "OpenClaw gateway request timed out"));
        return;
      }

      next(new HttpError(502, formatProxyErrorMessage(error)));
      return;
    } finally {
      clearTimeout(timeout);
    }
  };
}

function setRoutingHeaders(
  response: ExpressResponse,
  targetAgentId: string,
  sessionId: string
): void {
  response.setHeader("current_agent_id", targetAgentId);
  response.setHeader("current_session_id", sessionId);
}

async function relayGatewayResponse(
  upstreamResponse: globalThis.Response,
  response: ExpressResponse,
  targetAgentId: string,
  sessionId: string
): Promise<void> {
  const headers = new Headers(upstreamResponse.headers);
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") {
      return;
    }

    response.setHeader(key, value);
  });

  if (!upstreamResponse.ok) {
    const rawBody = await upstreamResponse.text();
    throw mapUpstreamError(upstreamResponse.status, rawBody);
  }

  if (isEventStream(headers)) {
    await streamGatewayResponse(upstreamResponse, response, targetAgentId, sessionId);
    return;
  }

  const rawBody = await upstreamResponse.text();
  response.status(upstreamResponse.status).send(rawBody);
}

async function streamGatewayResponse(
  upstreamResponse: globalThis.Response,
  response: ExpressResponse,
  targetAgentId: string,
  sessionId: string
): Promise<void> {
  const body = upstreamResponse.body;

  response.status(upstreamResponse.status);
  response.flushHeaders?.();
  response.write(
    `data: ${JSON.stringify({
      current_agent_id: targetAgentId,
      current_session_id: sessionId
    })}\n\n`
  );

  if (body === null) {
    response.end();
    return;
  }

  const readable = Readable.fromWeb(body as NodeReadableStream<Uint8Array>);

  await new Promise<void>((resolve, reject) => {
    readable.on("data", (chunk: Buffer | string) => {
      response.write(chunk);
    });

    readable.on("end", () => {
      response.end();
      resolve();
    });

    readable.on("error", (error: Error) => {
      response.destroy(error);
      reject(error);
    });
  });
}

function isEventStream(headers: Headers): boolean {
  const contentType = headers.get("content-type");

  return (
    typeof contentType === "string" &&
    contentType.toLowerCase().includes("text/event-stream")
  );
}

function formatProxyErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === "string") {
    return `Failed to reach OpenClaw gateway: ${error.message}`;
  }

  return "Failed to reach OpenClaw gateway";
}
