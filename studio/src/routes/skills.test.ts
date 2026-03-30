import type {
  NextFunction,
  Request,
  Response,
  Router
} from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

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
 * Locates the last Express route handler by path and HTTP method (after multer, etc.).
 *
 * @param router The Express router.
 * @param method HTTP method.
 * @param path Route path string.
 * @returns The handler function, if any.
 */
function findHandler(
  router: Router,
  method: "get" | "post",
  path: string
):
  | ((
      request: Request,
      response: Response,
      next: NextFunction
    ) => Promise<void>)
  | undefined {
  const layer = router.stack.find((l) => {
    const r = l.route;
    if (!r || r.path !== path) {
      return false;
    }
    return Boolean((r.methods as Record<string, boolean>)[method]);
  });
  const stack = layer?.route?.stack ?? [];
  if (stack.length === 0) {
    return undefined;
  }
  return stack[stack.length - 1]?.handle as (
    request: Request,
    response: Response,
    next: NextFunction
  ) => Promise<void>;
}

/**
 * Builds a request double after multipart parsing (`req.file` + `req.body`).
 *
 * @param buffer Zip file bytes (or empty).
 * @param body Parsed multipart text fields (e.g. `overwrite`).
 * @param originalname Optional upload filename (`multer`); default yields no derived skill id.
 * @returns A minimal Express request double.
 */
function createMultipartSkillRequest(
  buffer: Buffer,
  body: Record<string, unknown> = {},
  originalname = ""
): Request {
  const file: Express.Multer.File = {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype: "application/zip",
    buffer,
    size: buffer.length,
    destination: "",
    filename: "",
    path: "",
    stream: null as never
  };
  return { file, body, query: {} } as unknown as Request;
}

/**
 * Loads the router module with a mocked agent skills logic.
 *
 * @param logic Mocked logic implementation.
 * @returns The imported router factory.
 */
async function importRouterWithLogicMock(
  logic: {
    listEnabledSkills: () => Promise<unknown>;
    listDigitalHumanSkills?: (id: string) => Promise<unknown>;
    installSkill?: (
      body: Buffer,
      options?: { overwrite?: boolean }
    ) => Promise<unknown>;
  }
): Promise<typeof import("./skills")> {
  vi.doMock("../logic/agent-skills", () => ({
    DefaultAgentSkillsLogic: vi.fn().mockImplementation(() => ({
      listEnabledSkills: logic.listEnabledSkills,
      listDigitalHumanSkills:
        logic.listDigitalHumanSkills ?? vi.fn().mockResolvedValue([]),
      listAvailableSkills: vi.fn().mockResolvedValue({ skills: [] }),
      getAgentSkills: vi.fn().mockResolvedValue({ agentId: "a1", skills: [] }),
      updateAgentSkills: vi.fn(),
      installSkill:
        logic.installSkill ??
        vi.fn().mockResolvedValue({
          skillName: "default",
          skillPath: "/skills/default"
        })
    }))
  }));

  return import("./skills");
}

describe("createSkillsRouter", () => {
  const skillsPath = "/api/dip-studio/v1/skills";
  const skillsInstallPath = "/api/dip-studio/v1/skills/install";
  const digitalHumanSkillsPath = "/api/dip-studio/v1/digital-human/:id/skills";

  it("registers POST /api/dip-studio/v1/skills/install", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => []
    });
    const router = createSkillsRouter() as Router;

    expect(findHandler(router, "post", skillsInstallPath)).toBeDefined();
  });

  it("installs skill from multipart file field", async () => {
    const installSkill = vi.fn().mockResolvedValue({
      skillName: "weather",
      skillPath: "/repo/skills/weather"
    });
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      installSkill
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "post", skillsInstallPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

    await handler?.(
      createMultipartSkillRequest(zip, { overwrite: "true" }),
      response,
      next
    );

    expect(installSkill).toHaveBeenCalledWith(zip, { overwrite: true });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      skillName: "weather",
      skillPath: "/repo/skills/weather"
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards optional skillName for flat-layout installs", async () => {
    const installSkill = vi.fn().mockResolvedValue({
      skillName: "my-skill",
      skillPath: "/repo/skills/my-skill"
    });
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      installSkill
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "post", skillsInstallPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

    await handler?.(
      createMultipartSkillRequest(zip, { skillName: "my-skill" }),
      response,
      next
    );

    expect(installSkill).toHaveBeenCalledWith(zip, { skillName: "my-skill" });
  });

  it("derives skillName from upload filename when multipart skillName is absent", async () => {
    const installSkill = vi.fn().mockResolvedValue({
      skillName: "weather",
      skillPath: "/repo/skills/weather"
    });
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      installSkill
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "post", skillsInstallPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();
    const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

    await handler?.(
      createMultipartSkillRequest(zip, {}, "weather.skill"),
      response,
      next
    );

    expect(installSkill).toHaveBeenCalledWith(zip, { skillName: "weather" });
  });

  it("rejects missing or empty multipart file", async () => {
    const installSkill = vi.fn();
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      installSkill
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "post", skillsInstallPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { file: undefined, query: {} } as unknown as Request,
      response,
      next
    );

    expect(installSkill).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400
      })
    );

    next.mockClear();
    await handler?.(
      createMultipartSkillRequest(Buffer.alloc(0)),
      response,
      next
    );
    expect(installSkill).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400
      })
    );
  });

  it("registers GET /api/dip-studio/v1/skills", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => []
    });
    const router = createSkillsRouter() as Router;

    expect(findHandler(router, "get", skillsPath)).toBeDefined();
  });

  it("returns available skills on success", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [
        { name: "planner", description: "plan tasks", built_in: false },
        { name: "writer", description: "write docs", built_in: false }
      ]
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "get", skillsPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.({} as Request, response, next);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      { name: "planner", description: "plan tasks", built_in: false },
      { name: "writer", description: "write docs", built_in: false }
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  it("registers GET /api/dip-studio/v1/digital-human/:id/skills", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => []
    });
    const router = createSkillsRouter() as Router;

    expect(findHandler(router, "get", digitalHumanSkillsPath)).toBeDefined();
  });

  it("returns configured digital human skills on success", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      listDigitalHumanSkills: async (id) => [
        { name: `${id}-planner`, description: "plan tasks", built_in: false }
      ]
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "get", digitalHumanSkillsPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { params: { id: "a1" } } as unknown as Request,
      response,
      next
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([
      { name: "a1-planner", description: "plan tasks", built_in: false }
    ]);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects empty digital human id", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => []
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "get", digitalHumanSkillsPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { params: { id: " " } } as unknown as Request,
      response,
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "id path parameter is required"
      })
    );
  });

  it("wraps unexpected errors", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => {
        throw new Error("boom");
      }
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "get", skillsPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.({} as Request, response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        message: "Failed to query enabled skills"
      })
    );
  });

  it("wraps unexpected digital human skills errors", async () => {
    const { createSkillsRouter } = await importRouterWithLogicMock({
      listEnabledSkills: async () => [],
      listDigitalHumanSkills: async () => {
        throw new Error("boom");
      }
    });
    const router = createSkillsRouter() as Router;
    const handler = findHandler(router, "get", digitalHumanSkillsPath);
    const response = createResponseDouble();
    const next = vi.fn<NextFunction>();

    await handler?.(
      { params: { id: "a1" } } as unknown as Request,
      response,
      next
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 502,
        message: "Failed to query digital human skills"
      })
    );
  });
});
