import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { McpInfraEnvironment } from "../config/environment.js";

export type AuditOutcome = "planned" | "success" | "failed" | "blocked";

export type AuditEvent = {
  action: string;
  target: string;
  outcome: AuditOutcome;
  details?: Record<string, unknown>;
};

export async function recordAuditEvent(environment: McpInfraEnvironment, event: AuditEvent): Promise<void> {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event
  };

  await mkdir(dirname(environment.auditLogPath), { recursive: true });
  await writeFile(environment.auditLogPath, `${JSON.stringify(entry)}\n`, { flag: "a" });
}

export async function readRecentAuditEvents(environment: McpInfraEnvironment, limit: number): Promise<unknown[]> {
  try {
    const content = await readFile(environment.auditLogPath, "utf8");

    return content
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map(line => JSON.parse(line) as unknown);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}
