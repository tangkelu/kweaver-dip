import fs from "node:fs";
import path from "node:path";
import { type IncomingMessage, type ServerResponse } from "node:http";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";

const MIME_MAP: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4"
};

export default function register(api: OpenClawPluginApi) {
  api.registerHttpRoute({
    path: "/v1/archives",
    match: "prefix",
    auth: "gateway",
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      api.logger.debug(`Incoming request to archives-access: ${req.url}`);
      try {
        let workspaceDir = api.config?.workspaceDir || process.cwd();

        const urlStr = req.url || "/";
        const urlObj = new URL(urlStr, "http://localhost");
        const agentId = urlObj.searchParams.get("agent");
        
        if (agentId) {
          const agentsObj = api.config?.agents as any;
          const agentList = agentsObj?.list;
          if (Array.isArray(agentList)) {
            const agentCfg = agentList.find(a => a.id === agentId);
            if (agentCfg && agentCfg.workspace) {
              const baseDir = api.config?.workspaceDir || process.cwd();
              workspaceDir = path.resolve(baseDir, agentCfg.workspace);
            } else {
              api.logger.warn(`Agent workspace not found for: ${agentId}`);
              res.statusCode = 404;
              res.setHeader("Content-Type", "text/plain");
              res.end("Agent workspace not found");
              return true;
            }
          }
        }

        const archivesDir = path.join(workspaceDir, "archives");
        const rawPath = urlObj.pathname;
        let subPath = decodeURIComponent(rawPath).replace(/^\/v1\/archives\/?/, "");
        
        const targetPath = path.resolve(archivesDir, subPath);

        const relative = path.relative(archivesDir, targetPath);
        if (relative.startsWith("..") || path.isAbsolute(relative)) {
          api.logger.warn(`Path traversal attempt blocked: ${targetPath}`);
          res.statusCode = 403;
          res.end("Forbidden");
          return true;
        }

        let stat: fs.Stats;
        try {
          stat = await fs.promises.stat(targetPath);
        } catch (e: any) {
          if (e.code === "ENOENT") {
            res.statusCode = 404;
            res.end("Not Found");
            return true;
          }
          throw e;
        }

        const sessionId = urlObj.searchParams.get("session");

        if (stat.isDirectory()) {
          const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
          let files = entries.map(entry => {
            return {
              name: entry.name,
              type: entry.isDirectory() ? 'directory' : (entry.isFile() ? 'file' : 'other')
            };
          });

          if (sessionId && !subPath) {
            files = files.filter(f => f.name.startsWith(sessionId));
          }
          
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            path: subPath || "/",
            contents: files
          }));
          return true;
        }

        const ext = path.extname(targetPath).toLowerCase();
        const mimeType = MIME_MAP[ext] || "application/octet-stream";
        res.setHeader("Content-Type", mimeType);

        const stream = fs.createReadStream(targetPath);
        res.statusCode = 200;
        stream.pipe(res);
        return true;
      } catch (err: any) {
        api.logger.error(`Error serving archive file: ${err.message}`);
        res.statusCode = 500;
        res.end("Internal Server Error");
        return true;
      }
    }
  });
}
