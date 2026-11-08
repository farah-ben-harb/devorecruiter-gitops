import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import {
  listGitOpsCharts,
  listGitOpsEnvironmentFiles,
  listGitOpsImageSummaries,
  planGitOpsImageUpdate,
  readGitOpsEnvironmentFile,
  updateGitOpsImageTag
} from "../../clients/gitops.client.js";
import { getEnvironment } from "../../config/environment.js";
import { assertApprovedMutation } from "../../security/approval.js";
import { recordAuditEvent } from "../../security/audit.js";
import { guardedMutationAnnotations, jsonResult, readOnlyAnnotations, textResult } from "../shared.js";

export function registerGitOpsTools(server: McpServer): void {
  server.registerTool(
    "gitops_list_environment_files",
    {
      title: "List GitOps Environment Files",
      description: "List read-only GitOps values files from the dev environment.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const files = await listGitOpsEnvironmentFiles(environment.gitopsRoot);

      return jsonResult({
        gitopsRoot: environment.gitopsRoot,
        environment: "dev",
        files
      });
    }
  );

  server.registerTool(
    "gitops_read_environment_file",
    {
      title: "Read GitOps Environment File",
      description: "Read one approved GitOps dev environment values file.",
      inputSchema: {
        fileName: z.string().describe("File name from environments/dev, for example frontend-values.yaml.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ fileName }) => {
      const environment = getEnvironment();
      const content = await readGitOpsEnvironmentFile(environment.gitopsRoot, fileName);

      return textResult(content);
    }
  );

  server.registerTool(
    "gitops_list_charts",
    {
      title: "List Helm Charts",
      description: "List Helm chart directories in the GitOps repository.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const charts = await listGitOpsCharts(environment.gitopsRoot);

      return jsonResult({ gitopsRoot: environment.gitopsRoot, charts });
    }
  );

  server.registerTool(
    "gitops_list_image_tags",
    {
      title: "List GitOps Image Tags",
      description: "Summarize image repositories and tags currently pinned in dev values files.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const images = await listGitOpsImageSummaries(environment.gitopsRoot);

      return jsonResult({ environment: "dev", images });
    }
  );

  server.registerTool(
    "gitops_plan_image_update",
    {
      title: "Plan GitOps Image Update",
      description: "Plan a local GitOps image tag update without writing any file.",
      inputSchema: {
        service: z.string().describe("Service name, for example frontend, api-bff, api-back, n8n, or postgres."),
        nextTag: z.string().describe("New Docker image tag.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ service, nextTag }) => {
      const environment = getEnvironment();
      const plan = await planGitOpsImageUpdate(environment.gitopsRoot, service, nextTag);
      await recordAuditEvent(environment, {
        action: "gitops_plan_image_update",
        target: `${service}:${nextTag}`,
        outcome: "planned",
        details: plan
      });

      return jsonResult(plan);
    }
  );

  server.registerTool(
    "gitops_update_image_tag",
    {
      title: "Update GitOps Image Tag",
      description: "Update one local GitOps dev values file. Disabled unless MCP_INFRA_ENABLE_MUTATIONS=true and confirmation is exact.",
      inputSchema: {
        service: z.string().describe("Service name, for example frontend, api-bff, api-back, n8n, or postgres."),
        nextTag: z.string().describe("New Docker image tag."),
        dryRun: z.boolean().default(true).describe("When true, return the plan without writing files."),
        confirmation: z.string().optional().describe("Required when dryRun=false. Must be: UPDATE_IMAGE <service> <nextTag>")
      },
      annotations: guardedMutationAnnotations()
    },
    async ({ service, nextTag, dryRun, confirmation }) => {
      const environment = getEnvironment();
      const plan = await planGitOpsImageUpdate(environment.gitopsRoot, service, nextTag);

      if (dryRun) {
        await recordAuditEvent(environment, {
          action: "gitops_update_image_tag",
          target: `${service}:${nextTag}`,
          outcome: "planned",
          details: { dryRun: true, plan }
        });

        return jsonResult({ dryRun: true, plan });
      }

      assertApprovedMutation(environment, confirmation, `UPDATE_IMAGE ${service} ${nextTag}`);
      const updatedPlan = await updateGitOpsImageTag(environment.gitopsRoot, service, nextTag);
      await recordAuditEvent(environment, {
        action: "gitops_update_image_tag",
        target: `${service}:${nextTag}`,
        outcome: "success",
        details: updatedPlan
      });

      return jsonResult({ dryRun: false, plan: updatedPlan });
    }
  );
}
