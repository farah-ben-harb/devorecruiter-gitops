import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "../src/server.js";

type ToolCallResult = Awaited<ReturnType<Client["callTool"]>>;

function firstText(result: ToolCallResult): string {
  const content = (result as { content?: unknown }).content;

  if (!Array.isArray(content)) {
    throw new Error("Expected MCP tool result content to be an array.");
  }

  const first = content[0] as { type?: unknown; text?: unknown } | undefined;

  if (first?.type !== "text" || typeof first.text !== "string") {
    throw new Error("Expected first MCP tool result item to be text.");
  }

  return first.text;
}

async function callJson<T>(client: Client, name: string, args?: Record<string, unknown>): Promise<T> {
  const result = await client.callTool({
    name,
    ...(args ? { arguments: args } : {})
  });

  return JSON.parse(firstText(result)) as T;
}

async function main(): Promise<void> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "mcp-live-readonly-validator", version: "0.1.0" });
  const server = createMcpServer();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const serverInfo = await callJson<{ version: string; status: string; environment?: { enableMutations?: boolean } }>(client, "server_info", {
      includeEnvironment: true
    });
    const gitopsImages = await callJson<{ images: { service: string; repository: string; tag: string }[] }>(client, "gitops_list_image_tags");
    const pods = await callJson<{ pods: { name: string; phase: string; ready: string }[] }>(client, "k8s_list_pods", {
      namespace: "devorecruiter-dev"
    });
    const services = await callJson<{ services: { name: string; type: string; clusterIp?: string }[] }>(client, "k8s_list_services", {
      namespace: "devorecruiter-dev"
    });
    const applications = await callJson<{ applications: { name: string; syncStatus: string; healthStatus: string }[] }>(client, "argocd_list_apps");
    const syncDryRun = await callJson<{ dryRun: boolean; command: string }>(client, "argocd_sync_app", {
      appName: "devorecruiter-frontend-dev"
    });

    console.log(
      JSON.stringify(
        {
          server: {
            version: serverInfo.version,
            status: serverInfo.status,
            mutationsEnabled: serverInfo.environment?.enableMutations ?? false
          },
          gitops: {
            imageCount: gitopsImages.images.length,
            services: gitopsImages.images.map(image => image.service)
          },
          kubernetes: {
            podCount: pods.pods.length,
            runningPods: pods.pods.filter(pod => pod.phase === "Running").length,
            serviceCount: services.services.length
          },
          argocd: {
            appCount: applications.applications.length,
            healthyApps: applications.applications.filter(app => app.healthStatus === "Healthy").length,
            syncedApps: applications.applications.filter(app => app.syncStatus === "Synced").length,
            dryRunSyncProtected: syncDryRun.dryRun
          }
        },
        null,
        2
      )
    );
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
