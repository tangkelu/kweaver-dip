import express, { type Express, type Request, type Response } from "express";

import { getEnv } from "./config/env";
import { HttpError } from "./errors/http-error";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { createHealthRouter } from "./routes/health";
import { createOpenClawRouter } from "./routes/openclaw";
import {
  OpenClawGatewayClient
} from "./infra/openclaw-gateway-client";
import {
  DefaultOpenClawAgentsService,
  type OpenClawAgentsService
} from "./services/openclaw-agents-service";

/**
 * Options for creating the Express application.
 */
export interface AppOptions {
  /**
   * Enables diagnostic routes that are only useful in tests.
   */
  enableDiagnostics?: boolean;

  /**
   * Overrides the OpenClaw agents service.
   */
  openClawAgentsService?: OpenClawAgentsService;
}

/**
 * Raises a predictable error for middleware testing.
 *
 * @param _request The incoming HTTP request.
 * @param _response The outgoing HTTP response.
 * @returns Nothing. An error is thrown synchronously.
 */
export function raiseDiagnosticError(
  _request: Request,
  _response: Response
): never {
  throw new HttpError(418, "Diagnostic failure");
}

/**
 * Creates the Express application with the default middleware stack.
 *
 * @param options Optional application construction flags.
 * @returns A configured Express application.
 */
export function createApp(options: AppOptions = {}): Express {
  const env = getEnv();
  const app = express();
  const openClawAgentsService =
    options.openClawAgentsService ??
    new DefaultOpenClawAgentsService(
      OpenClawGatewayClient.getInstance({
        url: env.openClawGatewayUrl,
        token: env.openClawGatewayToken,
        timeoutMs: env.openClawGatewayTimeoutMs
      })
    );

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(createHealthRouter());
  app.use(createOpenClawRouter(openClawAgentsService));

  if (options.enableDiagnostics === true) {
    app.get("/__diagnostics/error", raiseDiagnosticError);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
