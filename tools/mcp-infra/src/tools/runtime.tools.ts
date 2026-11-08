import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import { getEnvironment } from "../config/environment.js";
import { getRuntimeInfo } from "../runtime.js";
import { getServerStatus, SERVER_VERSION } from "../server-metadata.js";
import { runSshCommand } from "../utils/ssh.js";
import { jsonResult, readOnlyAnnotations } from "./shared.js";

export function registerRuntimeTools(server: McpServer): void {
  server.registerTool(
    "server_info",
    {
      title: "Server Info",
      description: "Return safe runtime metadata for the local DevoRecruiter MCP infra server.",
      inputSchema: {
        includeEnvironment: z
          .boolean()
          .default(false)
          .describe("When true, include non-secret environment names and safety settings used by this server.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ includeEnvironment }) => {
      const environment = getEnvironment();
      const payload = {
        ...getRuntimeInfo(),
        version: SERVER_VERSION,
        status: getServerStatus(),
        capabilities: ["tools", "resources", "prompts", "gitops", "kubernetes-readonly", "argocd-readonly", "guarded-mutations"],
        environment: includeEnvironment
          ? {
              gitopsRoot: environment.gitopsRoot,
              allowedNamespace: environment.allowedNamespace,
              allowedArgoProject: environment.allowedArgoProject,
              kubernetesMode: environment.kubernetesMode,
              kubernetesContext: environment.kubernetesContext,
              vmConfigured: Boolean(environment.vmHost && environment.vmUser),
              enableMutations: environment.enableMutations,
              commandTimeoutMs: environment.commandTimeoutMs,
              auditLogPath: environment.auditLogPath
            }
          : undefined
      };

      return jsonResult(payload);
    }
  );

  server.registerTool(
    "mcp_ssh_check",
    {
      title: "MCP SSH Check",
      description: "Run a harmless echo command through the MCP SSH client to verify Azure VM connectivity.",
      annotations: readOnlyAnnotations()
    },
    async () => {
      const environment = getEnvironment();
      const result = await runSshCommand(environment, "echo mcp-ssh-ok");

      return jsonResult({
        target: result.target,
        code: result.code,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      });
    }
  );
}
