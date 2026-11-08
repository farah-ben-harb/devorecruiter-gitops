import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { listArgoApplications } from "../clients/argocd.client.js";
import { planMonitoringConfiguration } from "../clients/dynatrace.client.js";
import { listGitOpsImageSummaries } from "../clients/gitops.client.js";
import { listPods } from "../clients/kubernetes.client.js";
import { getStateSummary, getTerraformStatus, readTerraformReadme } from "../clients/terraform.client.js";
import { getEnvironment } from "../config/environment.js";
import { getRuntimeInfo } from "../runtime.js";
import {
  ARGOCD_APPLICATIONS_RESOURCE_URI,
  DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
  DYNATRACE_PROBLEMS_RESOURCE_URI,
  DYNATRACE_SERVICES_HEALTH_RESOURCE_URI,
  getServerStatus,
  GITOPS_IMAGES_RESOURCE_URI,
  K3S_CLUSTER_SUMMARY_RESOURCE_URI,
  RUNTIME_RESOURCE_URI,
  SECURITY_POLICY_RESOURCE_URI,
  SERVER_VERSION,
  TERRAFORM_STATE_RESOURCE_URI,
  TERRAFORM_SUMMARY_RESOURCE_URI
} from "../server-metadata.js";

export function registerInfraResources(server: McpServer): void {
  server.registerResource(
    "runtime-info",
    RUNTIME_RESOURCE_URI,
    {
      title: "Runtime Info",
      description: "Read-only metadata describing the local MCP server runtime.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      return {
        contents: [
          {
            uri: RUNTIME_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                ...getRuntimeInfo(),
                version: SERVER_VERSION,
                status: getServerStatus(),
                gitopsRoot: environment.gitopsRoot,
                terraformRoot: environment.terraformRoot,
                allowedNamespace: environment.allowedNamespace,
                allowedArgoProject: environment.allowedArgoProject,
                enableMutations: environment.enableMutations,
                enableDestructive: environment.enableDestructive,
                enablePodDeletion: environment.enablePodDeletion,
                dynatraceConfigured: Boolean(environment.dynatraceEnvironmentUrl && environment.dynatraceApiToken)
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  server.registerResource(
    "security-policy",
    SECURITY_POLICY_RESOURCE_URI,
    {
      title: "Security Policy",
      description: "Read-only description of MCP operational safety boundaries.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: SECURITY_POLICY_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              readOnlyByDefault: true,
              mutationsRequireEnvironmentFlag: "MCP_INFRA_ENABLE_MUTATIONS=true",
              destructiveToolsRequireEnvironmentFlag: "MCP_INFRA_ENABLE_DESTRUCTIVE=true",
              podDeletionRequiresEnvironmentFlag: "MCP_INFRA_ENABLE_POD_DELETION=true",
              mutationsRequireExactConfirmation: true,
              terraformDoesNotAcceptArbitraryCommands: true,
              dynatraceTokensAreReadFromLocalEnvironmentOnly: true,
              kubernetesNamespaceRestricted: true,
              argoProjectRestricted: true,
              secretsAreNotPrinted: true,
              auditEnabled: true
            },
            null,
            2
          )
        }
      ]
    })
  );

  server.registerResource(
    "gitops-images",
    GITOPS_IMAGES_RESOURCE_URI,
    {
      title: "GitOps Image Tags",
      description: "Current dev image repositories and tags from GitOps values files.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      return {
        contents: [
          {
            uri: GITOPS_IMAGES_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(await listGitOpsImageSummaries(environment.gitopsRoot), null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "terraform-summary",
    TERRAFORM_SUMMARY_RESOURCE_URI,
    {
      title: "Terraform Infrastructure Summary",
      description: "Terraform root, safety status, and local README guidance.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      return {
        contents: [
          {
            uri: TERRAFORM_SUMMARY_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                status: await getTerraformStatus(environment),
                readme: await readTerraformReadme(environment)
              },
              null,
              2
            )
          }
        ]
      };
    }
  );

  server.registerResource(
    "terraform-state-resources",
    TERRAFORM_STATE_RESOURCE_URI,
    {
      title: "Terraform State Resources",
      description: "Terraform-managed resources from local or remote state when configured.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      return {
        contents: [
          {
            uri: TERRAFORM_STATE_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(await getStateSummary(environment), null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "k3s-cluster-summary",
    K3S_CLUSTER_SUMMARY_RESOURCE_URI,
    {
      title: "K3s Cluster Summary",
      description: "Allowed namespace pod summary through the Azure VM SSH path.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      let payload: unknown;

      try {
        payload = { namespace: environment.allowedNamespace, pods: await listPods(environment, environment.allowedNamespace) };
      } catch (error) {
        payload = { available: false, reason: error instanceof Error ? error.message : String(error) };
      }

      return {
        contents: [
          {
            uri: K3S_CLUSTER_SUMMARY_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "argocd-applications",
    ARGOCD_APPLICATIONS_RESOURCE_URI,
    {
      title: "Argo CD Applications",
      description: "Allowed Argo CD applications through the Azure VM SSH path.",
      mimeType: "application/json"
    },
    async () => {
      const environment = getEnvironment();
      let payload: unknown;

      try {
        payload = { project: environment.allowedArgoProject, applications: await listArgoApplications(environment) };
      } catch (error) {
        payload = { available: false, reason: error instanceof Error ? error.message : String(error) };
      }

      return {
        contents: [
          {
            uri: ARGOCD_APPLICATIONS_RESOURCE_URI,
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2)
          }
        ]
      };
    }
  );

  server.registerResource(
    "dynatrace-active-problems",
    DYNATRACE_PROBLEMS_RESOURCE_URI,
    {
      title: "Dynatrace Active Problems",
      description: "Dynatrace problem access placeholder. Use list_dynatrace_problems for live API reads.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: DYNATRACE_PROBLEMS_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify({ liveTool: "list_dynatrace_problems", writes: false }, null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "dynatrace-kubernetes-health",
    DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
    {
      title: "Dynatrace Kubernetes Health",
      description: "Planned Kubernetes health monitoring view.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify(planMonitoringConfiguration("kubernetes"), null, 2)
        }
      ]
    })
  );

  server.registerResource(
    "dynatrace-services-health",
    DYNATRACE_SERVICES_HEALTH_RESOURCE_URI,
    {
      title: "Dynatrace Services Health",
      description: "Planned service health monitoring view.",
      mimeType: "application/json"
    },
    async () => ({
      contents: [
        {
          uri: DYNATRACE_SERVICES_HEALTH_RESOURCE_URI,
          mimeType: "application/json",
          text: JSON.stringify(planMonitoringConfiguration("services"), null, 2)
        }
      ]
    })
  );
}
