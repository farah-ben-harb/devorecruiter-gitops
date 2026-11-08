import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerInfraPrompts } from "./prompts/infra.prompts.js";
import { registerInfraResources } from "./resources/infra.resources.js";
export {
  ARGOCD_APPLICATIONS_RESOURCE_URI,
  DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
  DYNATRACE_PROBLEMS_RESOURCE_URI,
  DYNATRACE_SERVICES_HEALTH_RESOURCE_URI,
  getServerStatus,
  GITOPS_IMAGES_RESOURCE_URI,
  K3S_CLUSTER_SUMMARY_RESOURCE_URI,
  RUNTIME_RESOURCE_URI,
  SECURITY_POLICY_RESOURCE_URI,
  SERVER_NAME,
  SERVER_VERSION,
  TERRAFORM_STATE_RESOURCE_URI,
  TERRAFORM_SUMMARY_RESOURCE_URI
} from "./server-metadata.js";
import { SERVER_NAME, SERVER_VERSION } from "./server-metadata.js";
import { registerAuditTools } from "./tools/audit.tools.js";
import { registerArgoCdTools } from "./tools/argocd/argocd.tools.js";
import { registerDynatraceTools } from "./tools/dynatrace/dynatrace.tools.js";
import { registerGitOpsTools } from "./tools/gitops/gitops.tools.js";
import { registerKubernetesTools } from "./tools/kubernetes/kubernetes.tools.js";
import { registerRuntimeTools } from "./tools/runtime.tools.js";
import { registerTerraformTools } from "./tools/terraform/terraform.tools.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerRuntimeTools(server);
  registerGitOpsTools(server);
  registerKubernetesTools(server);
  registerArgoCdTools(server);
  registerTerraformTools(server);
  registerDynatraceTools(server);
  registerAuditTools(server);
  registerInfraResources(server);
  registerInfraPrompts(server);

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}
