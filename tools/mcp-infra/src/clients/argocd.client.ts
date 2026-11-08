import type { McpInfraEnvironment } from "../config/environment.js";
import { assertAllowedArgoProject, assertSafeKubernetesName } from "../security/validation.js";
import { buildKubectlCommand, runKubectlCommand } from "../utils/kubectl.js";

export type ArgoApplicationSummary = {
  name: string;
  project: string;
  syncStatus: string;
  healthStatus: string;
  revision?: string;
  repoUrl?: string;
  path?: string;
};

type ArgoApplicationList = {
  items?: ArgoApplicationItem[];
};

type ArgoApplicationItem = {
  metadata?: {
    name?: string;
  };
  spec?: {
    project?: string;
    source?: {
      repoURL?: string;
      path?: string;
      targetRevision?: string;
    };
  };
  status?: {
    sync?: {
      status?: string;
      revision?: string;
    };
    health?: {
      status?: string;
    };
  };
};

export async function listArgoApplications(environment: McpInfraEnvironment): Promise<ArgoApplicationSummary[]> {
  const data = await runArgoKubectlJson<ArgoApplicationList>(environment, ["-n", "argocd", "get", "applications", "-o", "json"]);

  return (data.items ?? [])
    .map(toApplicationSummary)
    .filter(app => app.project === environment.allowedArgoProject);
}

export async function getArgoApplication(environment: McpInfraEnvironment, appName: string): Promise<ArgoApplicationSummary> {
  assertSafeKubernetesName(appName);
  const data = await runArgoKubectlJson<ArgoApplicationItem>(environment, ["-n", "argocd", "get", "application", appName, "-o", "json"]);
  const summary = toApplicationSummary(data);

  assertAllowedArgoProject(summary.project, environment.allowedArgoProject);

  return summary;
}

export async function syncArgoApplication(environment: McpInfraEnvironment, appName: string): Promise<string> {
  assertSafeKubernetesName(appName);
  await getArgoApplication(environment, appName);

  return runArgoKubectlText(environment, [
    "-n",
    "argocd",
    "patch",
    "application",
    appName,
    "--type",
    "merge",
    "-p",
    '{"operation":{"sync":{}}}'
  ]);
}

export function buildArgoSyncPreviewCommand(environment: McpInfraEnvironment, appName: string): string {
  assertSafeKubernetesName(appName);
  return buildKubectlCommand(environment, [
    "-n",
    "argocd",
    "patch",
    "application",
    appName,
    "--type",
    "merge",
    "-p",
    '{"operation":{"sync":{}}}'
  ]);
}

async function runArgoKubectlJson<T>(environment: McpInfraEnvironment, args: string[]): Promise<T> {
  const output = await runArgoKubectlText(environment, args);

  return JSON.parse(output) as T;
}

async function runArgoKubectlText(environment: McpInfraEnvironment, args: string[]): Promise<string> {
  const result = await runKubectlCommand(environment, args);
  return result.stdout;
}

function toApplicationSummary(item: ArgoApplicationItem): ArgoApplicationSummary {
  return {
    name: item.metadata?.name ?? "",
    project: item.spec?.project ?? "",
    syncStatus: item.status?.sync?.status ?? "Unknown",
    healthStatus: item.status?.health?.status ?? "Unknown",
    ...(item.status?.sync?.revision ? { revision: item.status.sync.revision } : {}),
    ...(item.spec?.source?.repoURL ? { repoUrl: item.spec.source.repoURL } : {}),
    ...(item.spec?.source?.path ? { path: item.spec.source.path } : {})
  };
}
