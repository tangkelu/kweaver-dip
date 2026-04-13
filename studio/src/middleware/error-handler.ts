import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../errors/http-error";

/**
 * Maps an HTTP status code to the public error code used by OpenAPI.
 *
 * @param statusCode The HTTP status code.
 * @returns The normalized public error code.
 */
export function resolveErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "DipStudio.InvalidParameter";
    case 401:
      return "DipStudio.Unauthorized";
    case 403:
      return "DipStudio.Forbidden";
    case 404:
      return "DipStudio.NotFound";
    case 409:
      return "DipStudio.Conflict";
    case 413:
      return "DipStudio.PayloadTooLarge";
    case 500:
      return "DipStudio.InternalServerError";
    case 502:
      return "DipStudio.UpstreamServiceError";
    case 504:
      return "DipStudio.UpstreamTimeout";
    default:
      return `DipStudio.Http${statusCode}`;
  }
}

/**
 * Handles uncaught application errors and returns a stable JSON payload.
 *
 * @param error The thrown application error.
 * @param _request The incoming HTTP request.
 * @param response The outgoing HTTP response.
 * @param _next The next middleware callback required by Express.
 * @returns Nothing. The response is written directly.
 */
export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  next: NextFunction
): void {
  if (response.headersSent) {
    next(error);
    return;
  }

  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  const description =
    error instanceof HttpError ? error.message : "Internal Server Error";
  const code =
    error instanceof HttpError && error.code !== undefined
      ? error.code
      : resolveErrorCode(statusCode);

  response.status(statusCode).json({
    code,
    description
  });
}
