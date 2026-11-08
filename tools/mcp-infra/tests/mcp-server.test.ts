import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ARGOCD_APPLICATIONS_RESOURCE_URI,
  DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
  DYNATRACE_PROBLEMS_RESOURCE_URI,
  DYNATRACE_SERVICES_HEALTH_RESOURCE_URI,
  GITOPS_IMAGES_RESOURCE_URI,
  K3S_CLUSTER_SUMMARY_RESOURCE_URI,
  RUNTIME_RESOURCE_URI,
  SECURITY_POLICY_RESOURCE_URI,
  TERRAFORM_STATE_RESOURCE_URI,
  TERRAFORM_SUMMARY_RESOURCE_URI,
  createMcpServer
} from "../src/server.js";

function getFirstTextContent(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = (result as { content?: unknown }).content;

  if (!Array.isArray(content)) {
    throw new Error("Expected MCP tool result content to be an array.");
  }

  const firstContent = content[0] as { type?: unknown; text?: unknown } | undefined;

  if (firstContent?.type !== "text" || typeof firstContent.text !== "string") {
    throw new Error("Expected first MCP tool result item to be text content.");
  }

  return firstContent.text;
}

describe("DevoRecruiter MCP server", () => {
  let client: Client;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "mcp-infra-test-client", version: "0.1.0" });
    server = createMcpServer();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await Promise.all([client.close(), server.close()]);
  });

  it("advertises the server_info tool", async () => {
    const tools = await client.listTools();

    expect(tools.tools.map(tool => tool.name)).toEqual(
      expect.arrayContaining([
        "server_info",
        "mcp_ssh_check",
        "gitops_list_environment_files",
        "gitops_read_environment_file",
        "gitops_list_charts",
        "gitops_list_image_tags",
        "gitops_plan_image_update",
        "gitops_update_image_tag",
        "k8s_list_pods",
        "k8s_list_services",
        "k8s_list_deployments",
        "k8s_get_pod_logs",
        "k8s_list_events",
        "k8s_describe_pod",
        "k8s_restart_pod",
        "k8s_restart_deployment",
        "k8s_delete_pod",
        "k8s_preview_command",
        "argocd_list_apps",
        "argocd_get_app",
        "argocd_sync_app",
        "terraform_version",
        "terraform_status",
        "terraform_validate",
        "terraform_show_state_summary",
        "terraform_outputs",
        "list_managed_resources",
        "terraform_plan",
        "terraform_plan_destroy",
        "terraform_show_plan",
        "terraform_estimate_changes",
        "terraform_apply_saved_plan",
        "terraform_destroy",
        "dynatrace_connection_status",
        "list_dynatrace_problems",
        "get_dynatrace_problem",
        "query_dynatrace_metrics",
        "get_kubernetes_health",
        "get_service_health",
        "get_host_health",
        "get_recent_alerts",
        "plan_monitoring_configuration",
        "preview_alert_configuration",
        "preview_dashboard_configuration",
        "audit_recent_events"
      ])
    );
  });

  it("calls the server_info tool", async () => {
    const result = await client.callTool({
      name: "server_info",
      arguments: {
        includeEnvironment: true
      }
    });

    const text = getFirstTextContent(result);
    expect(JSON.parse(text)).toMatchObject({
      name: "devorecruiter-mcp-infra",
      mode: "local",
      transport: "stdio",
      status: "initialized",
      version: "0.4.0"
    });
  });

  it("reads the runtime-info resource", async () => {
    const resources = await client.listResources();
    expect(resources.resources.map(resource => resource.uri)).toEqual(
      expect.arrayContaining([
        RUNTIME_RESOURCE_URI,
        SECURITY_POLICY_RESOURCE_URI,
        GITOPS_IMAGES_RESOURCE_URI,
        TERRAFORM_SUMMARY_RESOURCE_URI,
        TERRAFORM_STATE_RESOURCE_URI,
        K3S_CLUSTER_SUMMARY_RESOURCE_URI,
        ARGOCD_APPLICATIONS_RESOURCE_URI,
        DYNATRACE_PROBLEMS_RESOURCE_URI,
        DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI,
        DYNATRACE_SERVICES_HEALTH_RESOURCE_URI
      ])
    );

    const result = await client.readResource({ uri: RUNTIME_RESOURCE_URI });
    expect(result.contents[0]).toMatchObject({
      uri: RUNTIME_RESOURCE_URI,
      mimeType: "application/json"
    });
  });

  it("lists GitOps dev environment files", async () => {
    const result = await client.callTool({
      name: "gitops_list_environment_files"
    });

    const payload = JSON.parse(getFirstTextContent(result)) as { files: string[] };

    expect(payload.files).toEqual(
      expect.arrayContaining(["api-back-values.yaml", "api-bff-values.yaml", "frontend-values.yaml"])
    );
  });

  it("reads an approved GitOps dev environment values file", async () => {
    const result = await client.callTool({
      name: "gitops_read_environment_file",
      arguments: {
        fileName: "frontend-values.yaml"
      }
    });

    expect(getFirstTextContent(result)).toContain("devorecruiter-front");
  });

  it("lists Helm charts", async () => {
    const result = await client.callTool({
      name: "gitops_list_charts"
    });

    const payload = JSON.parse(getFirstTextContent(result)) as { charts: string[] };

    expect(payload.charts).toEqual(expect.arrayContaining(["frontend", "api-bff", "api-back", "n8n", "postgres"]));
  });

  it("summarizes GitOps image tags", async () => {
    const result = await client.callTool({
      name: "gitops_list_image_tags"
    });

    const payload = JSON.parse(getFirstTextContent(result)) as { images: { service: string; tag: string }[] };

    expect(payload.images.map(image => image.service)).toEqual(expect.arrayContaining(["frontend", "api-bff", "api-back"]));
    expect(payload.images.every(image => image.tag.length > 0)).toBe(true);
  });

  it("plans GitOps image tag updates without writing files", async () => {
    const result = await client.callTool({
      name: "gitops_plan_image_update",
      arguments: {
        service: "frontend",
        nextTag: "test-sha"
      }
    });

    expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
      service: "frontend",
      fileName: "frontend-values.yaml",
      nextTag: "test-sha"
    });
  });

  it("keeps protected GitOps updates in dry-run mode by default", async () => {
    const result = await client.callTool({
      name: "gitops_update_image_tag",
      arguments: {
        service: "frontend",
        nextTag: "test-sha"
      }
    });

    expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
      dryRun: true,
      plan: {
        service: "frontend",
        nextTag: "test-sha"
      }
    });
  });

  it("previews Kubernetes commands without connecting to the VM", async () => {
    const result = await client.callTool({
      name: "k8s_preview_command",
      arguments: {
        namespace: "devorecruiter-dev",
        resource: "pods"
      }
    });

    expect(getFirstTextContent(result)).toContain("kubectl");
    expect(getFirstTextContent(result)).toContain("pods");
  });

  it("keeps pod restart and deletion tools in dry-run mode by default", async () => {
    const restartResult = await client.callTool({
      name: "k8s_restart_pod",
      arguments: {
        namespace: "devorecruiter-dev",
        podName: "devorecruiter-frontend-abc123"
      }
    });
    const deleteResult = await client.callTool({
      name: "k8s_delete_pod",
      arguments: {
        namespace: "devorecruiter-dev",
        podName: "devorecruiter-frontend-abc123"
      }
    });

    expect(JSON.parse(getFirstTextContent(restartResult))).toMatchObject({
      dryRun: true,
      controllerManagedOnly: true
    });
    expect(JSON.parse(getFirstTextContent(deleteResult))).toMatchObject({
      dryRun: true,
      gracePeriodSeconds: 30
    });
  });

  it("keeps Argo CD sync in dry-run mode by default", async () => {
    const result = await client.callTool({
      name: "argocd_sync_app",
      arguments: {
        appName: "devorecruiter-frontend-dev"
      }
    });

    expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
      dryRun: true
    });
  });

  it("reports Terraform status without applying anything", async () => {
    const previousRoot = process.env["MCP_INFRA_TERRAFORM_ROOT"];
    process.env["MCP_INFRA_TERRAFORM_ROOT"] = "tests/fixtures/terraform";
    try {
      const result = await client.callTool({ name: "terraform_status" });
      expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
        hasTerraformSource: true,
        hasLockFile: false,
        backend: "azurerm",
        mutationsEnabled: expect.any(Boolean),
        destructiveEnabled: expect.any(Boolean)
      });
    } finally {
      if (previousRoot === undefined) delete process.env["MCP_INFRA_TERRAFORM_ROOT"];
      else process.env["MCP_INFRA_TERRAFORM_ROOT"] = previousRoot;
    }
  });

  it("reports an absent Terraform root without failing the MCP call", async () => {
    const previousRoot = process.env["MCP_INFRA_TERRAFORM_ROOT"];
    process.env["MCP_INFRA_TERRAFORM_ROOT"] = "tests/fixtures/absent-terraform-root";
    try {
      const result = await client.callTool({ name: "terraform_status" });
      expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
        hasTerraformSource: false,
        hasLockFile: false,
        backend: "azurerm"
      });
    } finally {
      if (previousRoot === undefined) delete process.env["MCP_INFRA_TERRAFORM_ROOT"];
      else process.env["MCP_INFRA_TERRAFORM_ROOT"] = previousRoot;
    }
  });

  it("reports missing Dynatrace config without exposing tokens", async () => {
    const previousUrl = process.env["DYNATRACE_ENVIRONMENT_URL"];
    const previousToken = process.env["DYNATRACE_API_TOKEN"];

    process.env["DYNATRACE_ENVIRONMENT_URL"] = "";
    process.env["DYNATRACE_API_TOKEN"] = "";

    const result = await client.callTool({ name: "dynatrace_connection_status" });

    if (previousUrl === undefined) {
      delete process.env["DYNATRACE_ENVIRONMENT_URL"];
    } else {
      process.env["DYNATRACE_ENVIRONMENT_URL"] = previousUrl;
    }

    if (previousToken === undefined) {
      delete process.env["DYNATRACE_API_TOKEN"];
    } else {
      process.env["DYNATRACE_API_TOKEN"] = previousToken;
    }

    expect(JSON.parse(getFirstTextContent(result))).toMatchObject({
      configured: false
    });
  });

  it("reads the security policy resource", async () => {
    const result = await client.readResource({ uri: SECURITY_POLICY_RESOURCE_URI });
    expect(result.contents[0]).toMatchObject({
      uri: SECURITY_POLICY_RESOURCE_URI,
      mimeType: "application/json"
    });
  });

  it("returns the architecture explanation prompt", async () => {
    const prompts = await client.listPrompts();
    expect(prompts.prompts.map(prompt => prompt.name)).toEqual(
      expect.arrayContaining([
        "explain_mcp_architecture",
        "diagnose_pod",
        "recover_pod",
        "update_image",
        "deploy_application",
        "diagnose_kubernetes_workload",
        "diagnose_argocd_outofsync",
        "plan_gitops_image_update",
        "review_terraform_plan",
        "diagnose_terraform_failure",
        "diagnose_dynatrace_problem",
        "verify_deployment_end_to_end",
        "prepare_incident_report"
      ])
    );

    const result = await client.getPrompt({
      name: "explain_mcp_architecture",
      arguments: {
        focus: "devops"
      }
    });

    expect(result.messages[0]?.content).toMatchObject({
      type: "text"
    });
  });
});
