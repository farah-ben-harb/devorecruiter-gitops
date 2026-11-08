import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import {
  getDynatraceConnectionStatus,
  getDynatraceProblem,
  listDynatraceProblems,
  planMonitoringConfiguration,
  previewAlertConfiguration,
  previewDashboardConfiguration,
  queryDynatraceMetrics
} from "../../clients/dynatrace.client.js";
import { getEnvironment } from "../../config/environment.js";
import { jsonResult, readOnlyAnnotations } from "../shared.js";

export function registerDynatraceTools(server: McpServer): void {
  server.registerTool(
    "dynatrace_connection_status",
    {
      title: "Dynatrace Connection Status",
      description: "Check whether Dynatrace API configuration is present and reachable.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(await getDynatraceConnectionStatus(getEnvironment()))
  );

  server.registerTool(
    "list_dynatrace_problems",
    {
      title: "List Dynatrace Problems",
      description: "List recent Dynatrace problems through the official API.",
      inputSchema: {
        pageSize: z.number().int().min(1).max(100).default(20)
      },
      annotations: readOnlyAnnotations()
    },
    async ({ pageSize }) => jsonResult(await listDynatraceProblems(getEnvironment(), pageSize))
  );

  server.registerTool(
    "get_dynatrace_problem",
    {
      title: "Get Dynatrace Problem",
      description: "Read one Dynatrace problem by ID.",
      inputSchema: {
        problemId: z.string()
      },
      annotations: readOnlyAnnotations()
    },
    async ({ problemId }) => jsonResult(await getDynatraceProblem(getEnvironment(), problemId))
  );

  server.registerTool(
    "query_dynatrace_metrics",
    {
      title: "Query Dynatrace Metrics",
      description: "Query Dynatrace metrics with a bounded selector.",
      inputSchema: {
        metricSelector: z.string(),
        from: z.string().default("now-2h"),
        to: z.string().default("now")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ metricSelector, from, to }) => jsonResult(await queryDynatraceMetrics(getEnvironment(), metricSelector, from, to))
  );

  server.registerTool(
    "get_kubernetes_health",
    {
      title: "Get Dynatrace Kubernetes Health",
      description: "Preview the metrics query used to inspect Kubernetes health in Dynatrace.",
      annotations: readOnlyAnnotations()
    },
    async () =>
      jsonResult({
        action: "preview",
        metricSelectors: ["builtin:kubernetes.workload.pods", "builtin:kubernetes.node.cpu_usage", "builtin:kubernetes.node.memory_working_set"],
        note: "Run query_dynatrace_metrics after confirming the metric names available in the tenant."
      })
  );

  server.registerTool(
    "get_service_health",
    {
      title: "Get Dynatrace Service Health",
      description: "Preview service health signals for DevoRecruiter applications.",
      annotations: readOnlyAnnotations()
    },
    async () =>
      jsonResult({
        action: "preview",
        services: ["frontend", "api-bff", "api-back", "n8n", "postgres"],
        signals: ["availability", "latency", "request_count", "error_rate"]
      })
  );

  server.registerTool(
    "get_host_health",
    {
      title: "Get Dynatrace Host Health",
      description: "Preview host health signals for the Azure K3s VM.",
      annotations: readOnlyAnnotations()
    },
    async () =>
      jsonResult({
        action: "preview",
        signals: ["cpu", "memory", "disk", "network", "availability"],
        note: "Requires Dynatrace host visibility from OneAgent or Operator full-stack mode."
      })
  );

  server.registerTool(
    "get_recent_alerts",
    {
      title: "Get Recent Dynatrace Alerts",
      description: "Alias preview for recent Dynatrace problems and alerting events.",
      inputSchema: {
        pageSize: z.number().int().min(1).max(100).default(20)
      },
      annotations: readOnlyAnnotations()
    },
    async ({ pageSize }) => jsonResult(await listDynatraceProblems(getEnvironment(), pageSize))
  );

  server.registerTool(
    "plan_monitoring_configuration",
    {
      title: "Plan Monitoring Configuration",
      description: "Plan Dynatrace monitoring without writing to the tenant or cluster.",
      inputSchema: {
        target: z.enum(["kubernetes", "services", "dashboards", "alerts"]).default("kubernetes")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ target }) => jsonResult(planMonitoringConfiguration(target))
  );

  server.registerTool(
    "preview_alert_configuration",
    {
      title: "Preview Alert Configuration",
      description: "Preview initial alert thresholds without writing to Dynatrace.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(previewAlertConfiguration())
  );

  server.registerTool(
    "preview_dashboard_configuration",
    {
      title: "Preview Dashboard Configuration",
      description: "Preview dashboard sections without writing to Dynatrace.",
      annotations: readOnlyAnnotations()
    },
    async () => jsonResult(previewDashboardConfiguration())
  );
}
