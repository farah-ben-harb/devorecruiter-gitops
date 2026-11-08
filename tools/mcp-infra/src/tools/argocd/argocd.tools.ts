import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { buildArgoSyncPreviewCommand, getArgoApplication, listArgoApplications, syncArgoApplication } from "../../clients/argocd.client.js";
import { getEnvironment } from "../../config/environment.js";
import { assertApprovedMutation } from "../../security/approval.js";
import { recordAuditEvent } from "../../security/audit.js";
import { guardedMutationAnnotations, jsonResult, readOnlyAnnotations, textResult } from "../shared.js";

export function registerArgoCdTools(server: McpServer): void {
  server.registerTool(
    "argocd_list_apps",
    {
      title: "List Argo CD Applications",
      description: "List Argo CD applications in the allowed Argo CD project.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      return jsonResult({ project: environment.allowedArgoProject, applications: await listArgoApplications(environment) });
    }
  );

  server.registerTool(
    "argocd_get_app",
    {
      title: "Get Argo CD Application",
      description: "Get one Argo CD application summary from the allowed project.",
      inputSchema: {
        appName: z.string().describe("Argo CD Application name.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ appName }) => {
      const environment = getEnvironment();
      return jsonResult(await getArgoApplication(environment, appName));
    }
  );

  server.registerTool(
    "argocd_sync_app",
    {
      title: "Sync Argo CD Application",
      description: "Request Argo CD sync for one app. Disabled unless MCP_INFRA_ENABLE_MUTATIONS=true and confirmation is exact.",
      inputSchema: {
        appName: z.string().describe("Argo CD Application name."),
        dryRun: z.boolean().default(true).describe("When true, return the command preview without syncing."),
        confirmation: z.string().optional().describe("Required when dryRun=false. Must be: SYNC_APP <appName>")
      },
      annotations: guardedMutationAnnotations()
    },
    async ({ appName, dryRun, confirmation }) => {
      const environment = getEnvironment();
      const preview = buildArgoSyncPreviewCommand(environment, appName);

      if (dryRun) {
        await recordAuditEvent(environment, {
          action: "argocd_sync_app",
          target: appName,
          outcome: "planned",
          details: { dryRun: true, command: preview }
        });

        return jsonResult({ dryRun: true, command: preview });
      }

      assertApprovedMutation(environment, confirmation, `SYNC_APP ${appName}`);
      const output = await syncArgoApplication(environment, appName);
      await recordAuditEvent(environment, {
        action: "argocd_sync_app",
        target: appName,
        outcome: "success"
      });

      return textResult(output);
    }
  );
}
