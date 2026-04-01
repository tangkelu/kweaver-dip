import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { discoverSkillNames } from "./skills-discovery";
import {
  installSkillFromZipBuffer,
  SkillInstallError,
  skillInstallErrorHttpStatus
} from "./skills-install";
import {
  SkillUninstallError,
  skillUninstallErrorHttpStatus,
  uninstallSkillFromRepo
} from "./skills-uninstall";

/** Maximum `.skill` upload size for the Gateway install route (bytes). */
const MAX_SKILL_INSTALL_BYTES = 32 * 1024 * 1024;

/**
 * Reads the raw request body with a hard size cap.
 *
 * @param req Incoming HTTP request.
 * @param maxBytes Maximum allowed body length.
 * @returns Concatenated body buffer.
 */
function readRequestBodyLimited(
  req: IncomingMessage,
  maxBytes: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy();
        reject(
          new SkillInstallError(
            "TOO_LARGE",
            `Request body exceeds ${maxBytes} bytes`
          )
        );
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

/**
 * Registers skills CLI command, `/v1/config/agents/skills/install`, `/v1/config/agents/skills/{name}`,
 * and `/v1/config/agents/skills` HTTP routes.
 *
 * @param api OpenClaw plugin API.
 * @param repoRoot Repository / studio root (parent of `skills/`).
 * @param bundledSkillsDir Plugin-relative bundled skills directory.
 */
export function registerSkillsControl(
  api: OpenClawPluginApi,
  repoRoot: string,
  bundledSkillsDir: string
): void {
  const repoSkillsDir = path.join(repoRoot, "skills");

  api.registerHttpRoute({
    path: "/v1/config/agents/skills/install",
    match: "prefix",
    auth: "gateway",
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: "Method not allowed. Use POST with a raw application/zip body."
          })
        );
        return true;
      }

      const url = new URL(req.url || "", "http://localhost");
      const overwrite = url.searchParams.get("overwrite") === "true";
      const nameParam = url.searchParams.get("name");
      const name =
        nameParam !== null && nameParam.trim().length > 0
          ? nameParam.trim()
          : undefined;

      try {
        const body = await readRequestBodyLimited(req, MAX_SKILL_INSTALL_BYTES);
        const result = installSkillFromZipBuffer(body, repoSkillsDir, {
          overwrite,
          maxBytes: MAX_SKILL_INSTALL_BYTES,
          name
        });
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            name: result.name,
            skillPath: result.skillPath
          })
        );
        return true;
      } catch (e: unknown) {
        if (e instanceof SkillInstallError) {
          res.statusCode = skillInstallErrorHttpStatus(e.code);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e.message, code: e.code }));
          return true;
        }
        api.logger.error?.(`dip skills install failed: ${String(e)}`);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            error: e instanceof Error ? e.message : String(e)
          })
        );
        return true;
      }
    }
  });

  api.registerCommand({
    name: "skills-manage",
    description: "Manage agent skills (list, enable, disable)",
    acceptsArgs: true,
    handler: async (ctx: any): Promise<any> => {
      const args = (ctx.args || "").trim().split(/\s+/);
      const sub = args[0]?.toLowerCase();

      if (sub === "list") {
        const allSkillNames = discoverSkillNames(repoSkillsDir, bundledSkillsDir, ctx.config);
        const configSkills = ctx.config.skills?.entries || {};
        if (allSkillNames.length === 0) return { text: "No skills discovered." };

        const lines = allSkillNames.map(name => {
          const enabled = (configSkills as any)[name]?.enabled !== false;
          return `- ${name}: ${enabled ? "✅ enabled" : "❌ disabled"}`;
        });
        return { text: "Available skills:\n" + lines.join("\n") };
      }

      if (sub === "enable" || sub === "disable") {
        const skillName = args[1];
        if (!skillName) return { text: `Usage: /skills-manage ${sub} <name>` };

        const currentConfig = await api.runtime.config.loadConfig();
        const nextCfg = JSON.parse(JSON.stringify(currentConfig));

        if (!nextCfg.skills) nextCfg.skills = {};
        if (!nextCfg.skills.entries) nextCfg.skills.entries = {};
        if (!nextCfg.skills.entries[skillName]) nextCfg.skills.entries[skillName] = {};

        const enabled = sub === "enable";
        nextCfg.skills.entries[skillName].enabled = enabled;

        await api.runtime.config.writeConfigFile(nextCfg);
        return { text: `Global skill "${skillName}" is now ${enabled ? "enabled" : "disabled"}.` };
      }

      return { text: "Usage: /skills-manage [list | enable <name> | disable <name>]" };
    }
  });

  api.registerHttpRoute({
    path: "/v1/config/agents/skills",
    match: "prefix",
    auth: "gateway",
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "", "http://localhost");
      const isBasePath =
        url.pathname === "/v1/config/agents/skills" ||
        url.pathname === "/v1/config/agents/skills/";

      if (req.method === "DELETE") {
        const name = extractSkillNameFromPath(url.pathname);

        if (name === undefined) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: "Path parameter name is required"
            })
          );
          return true;
        }

        try {
          const result = uninstallSkillFromRepo(
            name,
            repoSkillsDir,
            bundledSkillsDir
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ name: result.name }));
          return true;
        } catch (e: unknown) {
          if (e instanceof SkillUninstallError) {
            res.statusCode = skillUninstallErrorHttpStatus(e.code);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message, code: e.code }));
            return true;
          }
          api.logger.error?.(`dip skills uninstall failed: ${String(e)}`);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : String(e)
            })
          );
          return true;
        }
      }

      if (!isBasePath) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Not found" }));
        return true;
      }

      if (req.method === "GET") {
        const agentId = url.searchParams.get("agentId");
        const config = await api.runtime.config.loadConfig();

        if (!agentId) {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          const responseSkills = discoverSkillNames(repoSkillsDir, bundledSkillsDir, config);
          res.end(JSON.stringify({ skills: responseSkills }));
          return true;
        }

        const agent = (config.agents?.list as any[])?.find((a: any) => a.id === agentId);
        if (!agent) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Agent "${agentId}" not found` }));
          return true;
        }

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        const agentSkills = agent.skills;
        let responseSkills = agentSkills;
        if (agentSkills === undefined) {
          responseSkills = discoverSkillNames(repoSkillsDir, bundledSkillsDir, config, [agentId]);
        }
        res.end(JSON.stringify({ agentId, skills: responseSkills }));
        return true;
      }

      if (req.method === "POST" || req.method === "PUT") {
        try {
          const body = await new Promise<any>((resolve, reject) => {
            let data = "";
            req.on("data", (chunk: any) => (data += chunk));
            req.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch {
                reject(new Error("Invalid JSON body"));
              }
            });
            req.on("error", reject);
          });

          const { agentId, skills } = body;
          if (!agentId || !Array.isArray(skills)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "agentId (string) and skills (array) are required" }));
            return true;
          }

          const currentConfig = await api.runtime.config.loadConfig();
          const nextCfg = JSON.parse(JSON.stringify(currentConfig));

          if (!nextCfg.agents) nextCfg.agents = {};
          if (!nextCfg.agents.list) nextCfg.agents.list = [];

          const agentIndex = (nextCfg.agents.list as any[]).findIndex((a: any) => a.id === agentId);
          if (agentIndex === -1) {
            res.statusCode = 404;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: `Agent "${agentId}" not found in list` }));
            return true;
          }

          nextCfg.agents.list[agentIndex].skills = skills;

          await api.runtime.config.writeConfigFile(nextCfg);

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, agentId, skills }));
          return true;
        } catch (e: any) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: e.message }));
          return true;
        }
      }

      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed. Use GET to read or POST/PUT to update." }));
      return true;
    }
  });
}

function extractSkillNameFromPath(pathname: string | null): string | undefined {
  if (!pathname) {
    return undefined;
  }

  const normalized = pathname.replace(/\/+$/, "");
  const prefix = "/v1/config/agents/skills";

  if (normalized.length <= prefix.length || !normalized.startsWith(prefix)) {
    return undefined;
  }

  const suffix = normalized.slice(prefix.length);
  if (!suffix.startsWith("/")) {
    return undefined;
  }

  const name = suffix.slice(1);
  return name.length > 0 ? decodeURIComponent(name) : undefined;
}
