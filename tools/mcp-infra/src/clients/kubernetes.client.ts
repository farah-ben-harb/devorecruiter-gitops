import type { McpInfraEnvironment } from "../config/environment.js";
import { assertAllowedNamespace, assertSafeKubernetesName } from "../security/validation.js";
import { buildKubectlCommand, runKubectlCommand } from "../utils/kubectl.js";

export type KubernetesPodSummary = {
  name: string;
  namespace: string;
  phase: string;
  ready: string;
  restarts: number;
  ageTimestamp?: string;
};

export type KubernetesServiceSummary = {
  name: string;
  namespace: string;
  type: string;
  clusterIp?: string;
  ports: string[];
};

export type KubernetesDeploymentSummary = {
  name: string;
  namespace: string;
  ready: string;
  available: number;
  replicas: number;
  imageTags: string[];
};

export type KubernetesEventSummary = {
  namespace: string;
  type?: string;
  reason?: string;
  object?: string;
  message?: string;
  lastTimestamp?: string;
};

type KubernetesList<T> = {
  items?: T[];
};

type PodItem = {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    ownerReferences?: {
      kind?: string;
      name?: string;
      controller?: boolean;
    }[];
  };
  status?: {
    phase?: string;
    containerStatuses?: {
      ready?: boolean;
      restartCount?: number;
    }[];
  };
};

type ServiceItem = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    type?: string;
    clusterIP?: string;
    ports?: {
      port?: number;
      targetPort?: number | string;
      protocol?: string;
    }[];
  };
};

type DeploymentItem = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    replicas?: number;
    template?: {
      spec?: {
        containers?: {
          image?: string;
        }[];
      };
    };
  };
  status?: {
    readyReplicas?: number;
    availableReplicas?: number;
    replicas?: number;
  };
};

type EventItem = {
  metadata?: {
    namespace?: string;
  };
  type?: string;
  reason?: string;
  involvedObject?: {
    kind?: string;
    name?: string;
  };
  message?: string;
  lastTimestamp?: string;
  eventTime?: string;
};

export async function listPods(environment: McpInfraEnvironment, namespace: string): Promise<KubernetesPodSummary[]> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  const data = await runKubectlJson<KubernetesList<PodItem>>(environment, ["-n", namespace, "get", "pods", "-o", "json"]);

  return (data.items ?? []).map(item => {
    const statuses = item.status?.containerStatuses ?? [];
    const readyCount = statuses.filter(status => status.ready).length;

    return {
      name: item.metadata?.name ?? "",
      namespace: item.metadata?.namespace ?? namespace,
      phase: item.status?.phase ?? "Unknown",
      ready: `${readyCount}/${statuses.length}`,
      restarts: statuses.reduce((sum, status) => sum + (status.restartCount ?? 0), 0),
      ...(item.metadata?.creationTimestamp ? { ageTimestamp: item.metadata.creationTimestamp } : {})
    };
  });
}

export async function listServices(environment: McpInfraEnvironment, namespace: string): Promise<KubernetesServiceSummary[]> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  const data = await runKubectlJson<KubernetesList<ServiceItem>>(environment, ["-n", namespace, "get", "services", "-o", "json"]);

  return (data.items ?? []).map(item => ({
    name: item.metadata?.name ?? "",
    namespace: item.metadata?.namespace ?? namespace,
    type: item.spec?.type ?? "Unknown",
    ...(item.spec?.clusterIP ? { clusterIp: item.spec.clusterIP } : {}),
    ports: (item.spec?.ports ?? []).map(port => `${port.port ?? "?"}:${port.targetPort ?? "?"}/${port.protocol ?? "TCP"}`)
  }));
}

export async function listDeployments(environment: McpInfraEnvironment, namespace: string): Promise<KubernetesDeploymentSummary[]> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  const data = await runKubectlJson<KubernetesList<DeploymentItem>>(environment, ["-n", namespace, "get", "deployments", "-o", "json"]);

  return (data.items ?? []).map(item => {
    const replicas = item.spec?.replicas ?? item.status?.replicas ?? 0;
    const readyReplicas = item.status?.readyReplicas ?? 0;

    return {
      name: item.metadata?.name ?? "",
      namespace: item.metadata?.namespace ?? namespace,
      ready: `${readyReplicas}/${replicas}`,
      available: item.status?.availableReplicas ?? 0,
      replicas,
      imageTags: (item.spec?.template?.spec?.containers ?? []).map(container => container.image ?? "").filter(Boolean)
    };
  });
}

export async function getPodLogs(environment: McpInfraEnvironment, namespace: string, podName: string, tailLines: number): Promise<string> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  assertSafeKubernetesName(podName);
  const boundedTailLines = Math.min(Math.max(tailLines, 1), 1000);

  return runKubectlText(environment, ["-n", namespace, "logs", podName, `--tail=${boundedTailLines}`]);
}

export async function describePod(environment: McpInfraEnvironment, namespace: string, podName: string): Promise<string> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  assertSafeKubernetesName(podName);

  return runKubectlText(environment, ["-n", namespace, "describe", "pod", podName]);
}

export async function restartManagedPod(environment: McpInfraEnvironment, namespace: string, podName: string): Promise<string> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  assertSafeKubernetesName(podName);

  const pod = await runKubectlJson<PodItem>(environment, ["-n", namespace, "get", "pod", podName, "-o", "json"]);
  const controllers = (pod.metadata?.ownerReferences ?? []).filter(owner => owner.controller === true);

  if (controllers.length === 0) {
    throw new Error(
      `Pod '${podName}' is not managed by a Kubernetes controller. Use k8s_delete_pod only if permanent deletion is explicitly intended.`
    );
  }

  return deletePod(environment, namespace, podName, 30);
}

export async function restartDeployment(environment: McpInfraEnvironment, namespace: string, deploymentName: string): Promise<string> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  assertSafeKubernetesName(deploymentName);

  return runKubectlText(environment, ["-n", namespace, "rollout", "restart", "deployment", deploymentName]);
}

export async function deletePod(
  environment: McpInfraEnvironment,
  namespace: string,
  podName: string,
  gracePeriodSeconds: number
): Promise<string> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  assertSafeKubernetesName(podName);
  const boundedGracePeriod = Math.min(Math.max(gracePeriodSeconds, 0), 60);

  return runKubectlText(environment, [
    "-n",
    namespace,
    "delete",
    "pod",
    podName,
    `--grace-period=${boundedGracePeriod}`,
    "--wait=false"
  ]);
}

export async function listEvents(environment: McpInfraEnvironment, namespace: string): Promise<KubernetesEventSummary[]> {
  assertAllowedNamespace(namespace, environment.allowedNamespace);
  const data = await runKubectlJson<KubernetesList<EventItem>>(environment, ["-n", namespace, "get", "events", "-o", "json"]);

  return (data.items ?? []).map(item => ({
    namespace: item.metadata?.namespace ?? namespace,
    ...(item.type ? { type: item.type } : {}),
    ...(item.reason ? { reason: item.reason } : {}),
    ...(item.involvedObject?.kind && item.involvedObject.name ? { object: `${item.involvedObject.kind}/${item.involvedObject.name}` } : {}),
    ...(item.message ? { message: item.message } : {}),
    ...(item.lastTimestamp ?? item.eventTime ? { lastTimestamp: item.lastTimestamp ?? item.eventTime } : {})
  }));
}

export function buildKubectlPreviewCommand(environment: McpInfraEnvironment, args: string[]): string {
  return buildKubectlCommand(environment, args);
}

async function runKubectlJson<T>(environment: McpInfraEnvironment, args: string[]): Promise<T> {
  const output = await runKubectlText(environment, args);

  return JSON.parse(output) as T;
}

async function runKubectlText(environment: McpInfraEnvironment, args: string[]): Promise<string> {
  const result = await runKubectlCommand(environment, args);
  return result.stdout;
}
