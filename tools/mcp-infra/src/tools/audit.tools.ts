import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { getEnvironment } from "../config/environment.js";
import { readRecentAuditEvents } from "../security/audit.js";
import { jsonResult, readOnlyAnnotations } from "./shared.js";

export function registerAuditTools(server: McpServer): void {
  server.registerTool(
    "audit_recent_events",
    {
      title: "Recent MCP Audit Events",
      description: "Read recent local MCP audit events.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20)
      },
      annotations: readOnlyAnnotations()
    },
    async ({ limit }) => {
      const environment = getEnvironment();
      return jsonResult({ auditLogPath: environment.auditLogPath, events: await readRecentAuditEvents(environment, limit) });
    }
  );
}
