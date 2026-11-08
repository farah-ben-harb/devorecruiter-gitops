import type { McpInfraEnvironment } from "../config/environment.js";

export type DynatraceConnectionStatus = {
  configured: boolean;
  environmentUrl?: string;
  reachable?: boolean;
  statusCode?: number;
  message: string;
};

export type DynatraceMonitoringPlan = {
  target: string;
  action: "preview";
  requiredSecrets: string[];
  kubernetesObjects: string[];
  verificationCommands: string[];
  notes: string[];
};

export async function getDynatraceConnectionStatus(environment: McpInfraEnvironment): Promise<DynatraceConnectionStatus> {
  if (!environment.dynatraceEnvironmentUrl || !environment.dynatraceApiToken) {
    return {
      configured: false,
      message: "Dynatrace is not configured. Set DYNATRACE_ENVIRONMENT_URL and DYNATRACE_API_TOKEN in the local MCP .env file."
    };
  }

  const response = await dynatraceFetch(environment, "/api/v2/problems?pageSize=1");

  return {
    configured: true,
    environmentUrl: environment.dynatraceEnvironmentUrl,
    reachable: response.ok,
    statusCode: response.status,
    message: response.ok ? "Dynatrace API is reachable." : `Dynatrace API returned HTTP ${response.status}.`
  };
}

export async function listDynatraceProblems(environment: McpInfraEnvironment, pageSize: number): Promise<unknown> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const response = await dynatraceFetch(environment, `/api/v2/problems?pageSize=${safePageSize}`);

  return parseDynatraceResponse(response);
}

export async function getDynatraceProblem(environment: McpInfraEnvironment, problemId: string): Promise<unknown> {
  assertSafeDynatraceId(problemId);
  const response = await dynatraceFetch(environment, `/api/v2/problems/${encodeURIComponent(problemId)}`);

  return parseDynatraceResponse(response);
}

export async function queryDynatraceMetrics(environment: McpInfraEnvironment, metricSelector: string, from = "now-2h", to = "now"): Promise<unknown> {
  assertSafeMetricSelector(metricSelector);
  const params = new URLSearchParams({ metricSelector, from, to });
  const response = await dynatraceFetch(environment, `/api/v2/metrics/query?${params.toString()}`);

  return parseDynatraceResponse(response);
}

export function planMonitoringConfiguration(target: "kubernetes" | "services" | "dashboards" | "alerts"): DynatraceMonitoringPlan {
  const base: DynatraceMonitoringPlan = {
    target,
    action: "preview",
    requiredSecrets: ["DYNATRACE_API_TOKEN=<REDACTED>", "DYNATRACE_DATA_INGEST_TOKEN=<REDACTED>"],
    kubernetesObjects: ["Namespace/dynatrace", "Secret/dynakube", "DynaKube/dynakube"],
    verificationCommands: [
      "kubectl get pods -n dynatrace",
      "kubectl get dynakube -n dynatrace",
      "kubectl get pods -A | Select-String dynatrace"
    ],
    notes: [
      "Prefer Dynatrace Operator with DynaKube for K3s after live cluster audit.",
      "Do not store tokens in Git, Helm values, Terraform state, or logs.",
      "Create dashboards and alerting profiles only after baseline traffic is understood."
    ]
  };

  if (target === "alerts") {
    base.notes.push("Start with warning thresholds and tune after observing normal latency, error rate, restarts, CPU, and memory.");
  }

  if (target === "dashboards") {
    base.notes.push("Dashboard should include frontend, BFF, FastAPI, n8n, PostgreSQL, Argo CD, node, and namespace health.");
  }

  return base;
}

export function previewAlertConfiguration(): unknown {
  return {
    action: "preview",
    writes: false,
    thresholds: [
      { signal: "HTTP 5xx rate", initialThreshold: "> 5% for 10 minutes", severity: "warning" },
      { signal: "Kubernetes restarts", initialThreshold: "> 3 restarts in 10 minutes", severity: "warning" },
      { signal: "Pod not ready", initialThreshold: "> 5 minutes", severity: "warning" },
      { signal: "Node memory", initialThreshold: "> 85% for 15 minutes", severity: "warning" },
      { signal: "Argo CD app health", initialThreshold: "Degraded or OutOfSync for 10 minutes", severity: "warning" }
    ],
    confirmationRequiredForWrite: true
  };
}

export function previewDashboardConfiguration(): unknown {
  return {
    action: "preview",
    writes: false,
    sections: [
      "Global DevoRecruiter health",
      "Frontend availability and latency",
      "BFF health, HTTP errors, and dependencies",
      "FastAPI health, latency, and AI/RAG errors",
      "n8n executions and failures",
      "PostgreSQL availability and resource usage",
      "K3s node CPU, memory, disk, network",
      "Argo CD sync and health status"
    ],
    confirmationRequiredForWrite: true
  };
}

async function dynatraceFetch(environment: McpInfraEnvironment, path: string): Promise<Response> {
  if (!environment.dynatraceEnvironmentUrl || !environment.dynatraceApiToken) {
    throw new Error("Dynatrace configuration is missing. Set DYNATRACE_ENVIRONMENT_URL and DYNATRACE_API_TOKEN in tools/mcp-infra/.env.");
  }

  return fetch(`${environment.dynatraceEnvironmentUrl}${path}`, {
    headers: {
      Authorization: `Api-Token ${environment.dynatraceApiToken}`,
      Accept: "application/json"
    }
  });
}

async function parseDynatraceResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : {};

  if (!response.ok) {
    return {
      ok: false,
      statusCode: response.status,
      payload
    };
  }

  return payload;
}

function assertSafeDynatraceId(problemId: string): void {
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(problemId)) {
    throw new Error("Dynatrace problem ID is not safe.");
  }
}

function assertSafeMetricSelector(metricSelector: string): void {
  if (!/^[A-Za-z0-9_.:,()[\]\-+*\/"'=<>%\s]{1,500}$/.test(metricSelector)) {
    throw new Error("Dynatrace metric selector contains unsupported characters.");
  }
}
