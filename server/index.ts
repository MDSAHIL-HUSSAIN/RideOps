import "dotenv/config";
import { config } from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import copilot from "../api/copilot";
import knownIssues from "../api/known-issues";
import workflows from "../api/workflows";

config({ path: ".env.local", override: true });

const app = express();
app.use(express.json({ limit: "1mb" }));

type WebHandler = { fetch(request: Request): Response | Promise<Response> };

function useWebHandler(handler: WebHandler) {
  return async (req: express.Request, res: express.Response) => {
    try {
      const origin = `${req.protocol}://${req.get("host")}`;
      const headers = new Headers();
      Object.entries(req.headers).forEach(([key, value]) => {
        if (Array.isArray(value))
          value.forEach((item) => headers.append(key, item));
        else if (value !== undefined) headers.set(key, value);
      });
      headers.delete("content-length");

      const hasBody = !["GET", "HEAD"].includes(req.method);
      const request = new Request(new URL(req.originalUrl, origin), {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      });
      const response = await handler.fetch(request);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res
        .status(response.status)
        .send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.error("API handler failed", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

app.all("/api/copilot", useWebHandler(copilot));
app.all("/api/known-issues", useWebHandler(knownIssues));
app.all("/api/workflows", useWebHandler(workflows));

const directory = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(directory, "../dist");
app.use(express.static(dist));
app.get("/{*splat}", (_req, res) =>
  res.sendFile(path.join(dist, "index.html")),
);

const port = Number(process.env.PORT || 3001);
app.listen(port, () =>
  console.log(`RideOps API running at http://localhost:${port}`),
);
