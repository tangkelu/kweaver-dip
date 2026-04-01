import type { Router } from "express";

import type { OpenClawResponsesHttpClient } from "../infra/openclaw-responses-http-client";
import {
  attachDownstreamAbortHandlers,
  createChatRouter,
  createDigitalHumanResponseRequestHeaders,
  pipeEventStream,
  readAgentIdFromSessionKey,
  readDigitalHumanResponseRequestBody,
  readOptionalHeaderValue,
  readRequiredSessionKeyHeader,
  writeEventStreamHeaders
} from "./chat";

export {
  attachDownstreamAbortHandlers,
  createDigitalHumanResponseRequestHeaders,
  pipeEventStream,
  readAgentIdFromSessionKey,
  readDigitalHumanResponseRequestBody,
  readOptionalHeaderValue,
  readRequiredSessionKeyHeader,
  writeEventStreamHeaders
} from "./chat";

/**
 * Builds the digital human response router.
 *
 * @param responsesHttpClient Optional client used to call OpenClaw.
 * @returns The router exposing digital human response endpoints.
 */
export function createDigitalHumanResponseRouter(
  responsesHttpClient?: OpenClawResponsesHttpClient
): Router {
  return createChatRouter({
    responsesHttpClient
  });
}
