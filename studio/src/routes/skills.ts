import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";

import {
  OpenClawAgentsGatewayAdapter,
} from "../adapters/openclaw-agents-adapter";
import { getEnv } from "../utils/env";
import { HttpError } from "../errors/http-error";
import {
  DefaultOpenClawAgentSkillsHttpClient
} from "../infra/openclaw-agent-skills-http-client";
import { OpenClawGatewayClient } from "../infra/openclaw-gateway-client";
import { DefaultAgentSkillsLogic } from "../logic/agent-skills";
import { deriveSkillIdFromUploadedFilename } from "../utils/skills";

/** Maximum `.skill` upload size for Studio install route (bytes). */
const MAX_SKILL_INSTALL_BYTES = 32 * 1024 * 1024;

const skillInstallUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SKILL_INSTALL_BYTES }
});

const env = getEnv();
const openClawAgentsAdapter = new OpenClawAgentsGatewayAdapter(
  OpenClawGatewayClient.getInstance({
    url: env.openClawGatewayUrl,
    token: env.openClawGatewayToken,
    timeoutMs: env.openClawGatewayTimeoutMs
  })
);
const agentSkillsLogic = new DefaultAgentSkillsLogic(
  new DefaultOpenClawAgentSkillsHttpClient({
    gatewayUrl: env.openClawGatewayHttpUrl,
    token: env.openClawGatewayToken,
    timeoutMs: env.openClawGatewayTimeoutMs
  }),
  openClawAgentsAdapter
);

/**
 * Runs `multer.single("file")` and maps Multer errors to {@link HttpError}.
 *
 * @param req Incoming request.
 * @param res Outgoing response.
 * @param next Express next function.
 */
function handleSkillInstallUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  skillInstallUpload.single("file")(req, res, (err: unknown) => {
    if (err === undefined) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(
          new HttpError(
            413,
            `File exceeds maximum size of ${MAX_SKILL_INSTALL_BYTES} bytes`
          )
        );
        return;
      }
      next(new HttpError(400, err.message));
      return;
    }
    next(
      new HttpError(400, err instanceof Error ? err.message : String(err))
    );
  });
}

/**
 * Extracts the `id` path parameter handling the `string | string[]`
 * type that Express may produce.
 *
 * @param idParam The raw path parameter value.
 * @returns The first non-empty id string.
 * @throws HttpError when the id is missing or empty.
 */
function resolveIdParam(idParam: string | string[] | undefined): string {
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id || id.trim().length === 0) {
    throw new HttpError(400, "id path parameter is required");
  }
  return id;
}

/**
 * Reads `overwrite` from multipart text fields (`req.body` after multer).
 *
 * @param body Parsed `multipart/form-data` fields.
 * @returns Whether the client requested overwrite of an existing skill directory.
 */
function parseOverwriteFromMultipartBody(body: Request["body"]): boolean {
  const raw = body?.overwrite as unknown;
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    return v === "true" || v === "1";
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const v = String(raw[0]).trim().toLowerCase();
    return v === "true" || v === "1";
  }
  return false;
}

/**
 * Reads optional `skillName` from multipart fields (overrides filename-derived default).
 *
 * @param body Parsed `multipart/form-data` fields.
 * @returns Trimmed skill id, or `undefined` when absent or empty.
 */
function parseSkillNameFromMultipartBody(body: Request["body"]): string | undefined {
  const raw = body?.skillName as unknown;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : undefined;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    const t = String(raw[0]).trim();
    return t.length > 0 ? t : undefined;
  }
  return undefined;
}

/**
 * Builds the skills router.
 *
 * @returns The router exposing skills endpoints.
 */
export function createSkillsRouter(): Router {
  const router = Router();

  router.get(
    "/api/dip-studio/v1/skills",
    async (
      _request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const result = await agentSkillsLogic.listEnabledSkills();

        response.status(200).json(result);
      } catch (error) {
        next(
          error instanceof HttpError
            ? error
            : new HttpError(502, "Failed to query enabled skills")
        );
      }
    }
  );

  router.get(
    "/api/dip-studio/v1/digital-human/:id/skills",
    async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const id = resolveIdParam(request.params.id);
        const result = await agentSkillsLogic.listDigitalHumanSkills(id);

        response.status(200).json(result);
      } catch (error) {
        next(
          error instanceof HttpError
            ? error
            : new HttpError(502, "Failed to query digital human skills")
        );
      }
    }
  );

  router.post(
    "/api/dip-studio/v1/skills/install",
    handleSkillInstallUpload,
    async (
      request: Request,
      response: Response,
      next: NextFunction
    ): Promise<void> => {
      try {
        const overwrite = parseOverwriteFromMultipartBody(request.body);

        const file = request.file;
        if (file === undefined || file.buffer.length === 0) {
          throw new HttpError(
            400,
            "Multipart field `file` is required (non-empty .skill zip)"
          );
        }

        const explicitSkillName = parseSkillNameFromMultipartBody(request.body);
        const skillName =
          explicitSkillName ??
          deriveSkillIdFromUploadedFilename(file.originalname);

        const result = await agentSkillsLogic.installSkill(file.buffer, {
          ...(overwrite ? { overwrite: true } : {}),
          ...(skillName !== undefined ? { skillName } : {})
        });

        response.status(200).json(result);
      } catch (error) {
        next(
          error instanceof HttpError
            ? error
            : new HttpError(502, "Failed to install skill")
        );
      }
    }
  );

  return router;
}
