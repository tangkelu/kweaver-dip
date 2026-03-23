import { Router, type NextFunction, type Request, type Response } from "express";

import { HttpError } from "../errors/http-error";
import type {
  CreateSessionKeyRequest,
  CreateSessionKeyResponse
} from "../types/session-key";

/**
 * Builds the session key router.
 *
 * @returns The router exposing session key endpoints.
 */
export function createSessionKeyRouter(): Router {
  const router = Router();

  router.post(
    "/api/dip-studio/v1/chat/session",
    (
      request: Request<unknown, CreateSessionKeyResponse, CreateSessionKeyRequest>,
      response: Response<CreateSessionKeyResponse>,
      next: NextFunction
    ): void => {
      try {
        const userId = readRequiredUserIdHeader(request.headers["x-user-id"]);
        const { agentId } = readCreateSessionKeyRequestBody(request.body);

        response.status(200).json({
          sessionKey: buildOpenClawSessionKey(agentId, userId)
        });
      } catch (error) {
        next(
          error instanceof HttpError
            ? error
            : new HttpError(502, "Failed to create session key")
        );
      }
    }
  );

  return router;
}

/**
 * Validates the incoming session key creation request body.
 *
 * @param requestBody The raw request body parsed by Express.
 * @returns The validated session key creation payload.
 * @throws {HttpError} Thrown when the request body is invalid.
 */
export function readCreateSessionKeyRequestBody(
  requestBody: unknown
): CreateSessionKeyRequest {
  if (typeof requestBody !== "object" || requestBody === null || Array.isArray(requestBody)) {
    throw new HttpError(400, "Session key request body must be a JSON object");
  }

  const { agentId } = requestBody as Partial<CreateSessionKeyRequest>;

  if (typeof agentId !== "string" || agentId.trim() === "") {
    throw new HttpError(400, "agentId is required");
  }

  return {
    agentId: agentId.trim()
  };
}

/**
 * Reads the authenticated user id injected by the auth middleware.
 *
 * @param userIdHeader The raw `x-user-id` header value.
 * @returns The normalized authenticated user id.
 * @throws {HttpError} Thrown when the user id is missing.
 */
export function readRequiredUserIdHeader(
  userIdHeader: string | string[] | undefined
): string {
  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;

  if (typeof userId !== "string" || userId.trim() === "") {
    throw new HttpError(401, "x-user-id header is required");
  }

  return userId.trim();
}

/**
 * Builds the OpenClaw session key for a new user chat session.
 *
 * @param agentId The owning agent id.
 * @param userId The authenticated user id.
 * @param chatId Optional deterministic chat id used by tests.
 * @returns The normalized OpenClaw session key.
 */
export function buildOpenClawSessionKey(
  agentId: string,
  userId: string,
  chatId: string = globalThis.crypto.randomUUID()
): string {
  return `agent:${agentId}:user:${userId}:direct:${chatId}`;
}
