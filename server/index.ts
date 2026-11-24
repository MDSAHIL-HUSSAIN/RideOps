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
app.all("/api/copilot", copilot);
app.all("/api/known-issues", knownIssues);
app.all("/api/workflows", workflows);

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
