import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import {
  buildKubectlPreviewCommand,
  deletePod,
  describePod,
  getPodLogs,
  listDeployments,
  listEvents,
  listPods,
  listServices,
  restartDeployment,
  restartManagedPod
} from "../../clients/kubernetes.client.js";
import { getEnvironment } from "../../config/environment.js";
import { assertApprovedMutation, assertApprovedPodDeletion } from "../../security/approval.js";
import { recordAuditEvent } from "../../security/audit.js";
import {
  destructiveMutationAnnotations,
  guardedMutationAnnotations,
  jsonResult,
  readOnlyAnnotations,
  textResult
} from "../shared.js";

export function registerKubernetesTools(server: McpServer): void {
  server.registerTool(
    "k8s_list_pods",
    {
      title: "List Kubernetes Pods",
      description: "List pods in the allowed DevoRecruiter namespace on the Azure VM K3s cluster.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace }) => {
      const environment = getEnvironment();
      return jsonResult({ namespace, pods: await listPods(environment, namespace) });
    }
  );

  server.registerTool(
    "k8s_list_services",
    {
      title: "List Kubernetes Services",
      description: "List services in the allowed DevoRecruiter namespace on the Azure VM K3s cluster.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace }) => {
      const environment = getEnvironment();
      return jsonResult({ namespace, services: await listServices(environment, namespace) });
    }
  );

  server.registerTool(
    "k8s_list_deployments",
    {
      title: "List Kubernetes Deployments",
      description: "List deployments and container images in the allowed DevoRecruiter namespace.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace }) => {
      const environment = getEnvironment();
      return jsonResult({ namespace, deployments: await listDeployments(environment, namespace) });
    }
  );

  server.registerTool(
    "k8s_get_pod_logs",
    {
      title: "Get Kubernetes Pod Logs",
      description: "Read recent logs for one pod in the allowed namespace.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace."),
        podName: z.string().describe("Pod name to inspect."),
        tailLines: z.number().int().min(1).max(1000).default(200).describe("Number of log lines to return.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace, podName, tailLines }) => {
      const environment = getEnvironment();
      return textResult(await getPodLogs(environment, namespace, podName, tailLines));
    }
  );

  server.registerTool(
    "k8s_list_events",
    {
      title: "List Kubernetes Events",
      description: "List recent namespace events for troubleshooting.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace }) => {
      const environment = getEnvironment();
      return jsonResult({ namespace, events: await listEvents(environment, namespace) });
    }
  );

  server.registerTool(
    "k8s_describe_pod",
    {
      title: "Describe Kubernetes Pod",
      description: "Read detailed status, scheduling, probes, containers, and recent events for one pod.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace."),
        podName: z.string().describe("Pod name to inspect.")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace, podName }) => {
      const environment = getEnvironment();
      return textResult(await describePod(environment, namespace, podName));
    }
  );

  server.registerTool(
    "k8s_restart_pod",
    {
      title: "Restart Managed Kubernetes Pod",
      description:
        "Restart one controller-managed pod by deleting it so Kubernetes recreates it. Defaults to dry-run and requires mutations plus exact confirmation.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace."),
        podName: z.string().describe("Controller-managed pod to restart."),
        dryRun: z.boolean().default(true).describe("When true, return the command preview without restarting the pod."),
        confirmation: z
          .string()
          .optional()
          .describe("Required when dryRun=false. Must be: RESTART_POD <namespace> <podName>")
      },
      annotations: guardedMutationAnnotations()
    },
    async ({ namespace, podName, dryRun, confirmation }) => {
      const environment = getEnvironment();
      const command = buildKubectlPreviewCommand(environment, [
        "-n",
        namespace,
        "delete",
        "pod",
        podName,
        "--grace-period=30",
        "--wait=false"
      ]);

      if (dryRun) {
        await recordAuditEvent(environment, {
          action: "k8s_restart_pod",
          target: `${namespace}/${podName}`,
          outcome: "planned",
          details: { dryRun: true, command, controllerManagedOnly: true }
        });
        return jsonResult({ dryRun: true, command, controllerManagedOnly: true });
      }

      assertApprovedMutation(environment, confirmation, `RESTART_POD ${namespace} ${podName}`);
      const output = await restartManagedPod(environment, namespace, podName);
      await recordAuditEvent(environment, {
        action: "k8s_restart_pod",
        target: `${namespace}/${podName}`,
        outcome: "success",
        details: { controllerManagedOnly: true }
      });
      return textResult(output);
    }
  );

  server.registerTool(
    "k8s_restart_deployment",
    {
      title: "Restart Kubernetes Deployment",
      description: "Trigger a rolling restart of one deployment. Defaults to dry-run and requires mutations plus exact confirmation.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace."),
        deploymentName: z.string().describe("Deployment to restart."),
        dryRun: z.boolean().default(true).describe("When true, return the command preview without restarting."),
        confirmation: z
          .string()
          .optional()
          .describe("Required when dryRun=false. Must be: RESTART_DEPLOYMENT <namespace> <deploymentName>")
      },
      annotations: guardedMutationAnnotations()
    },
    async ({ namespace, deploymentName, dryRun, confirmation }) => {
      const environment = getEnvironment();
      const command = buildKubectlPreviewCommand(environment, ["-n", namespace, "rollout", "restart", "deployment", deploymentName]);

      if (dryRun) {
        await recordAuditEvent(environment, {
          action: "k8s_restart_deployment",
          target: `${namespace}/${deploymentName}`,
          outcome: "planned",
          details: { dryRun: true, command }
        });
        return jsonResult({ dryRun: true, command });
      }

      assertApprovedMutation(environment, confirmation, `RESTART_DEPLOYMENT ${namespace} ${deploymentName}`);
      const output = await restartDeployment(environment, namespace, deploymentName);
      await recordAuditEvent(environment, {
        action: "k8s_restart_deployment",
        target: `${namespace}/${deploymentName}`,
        outcome: "success"
      });
      return textResult(output);
    }
  );

  server.registerTool(
    "k8s_delete_pod",
    {
      title: "Delete Kubernetes Pod",
      description:
        "Delete one pod explicitly. Defaults to dry-run and requires mutation/pod-deletion modes plus exact confirmation.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev").describe("Must match the configured allowed namespace."),
        podName: z.string().describe("Pod to delete."),
        gracePeriodSeconds: z.number().int().min(0).max(60).default(30).describe("Grace period before deletion."),
        dryRun: z.boolean().default(true).describe("When true, return the command preview without deleting the pod."),
        confirmation: z
          .string()
          .optional()
          .describe("Required when dryRun=false. Must be: DELETE_POD <namespace> <podName>")
      },
      annotations: destructiveMutationAnnotations()
    },
    async ({ namespace, podName, gracePeriodSeconds, dryRun, confirmation }) => {
      const environment = getEnvironment();
      const command = buildKubectlPreviewCommand(environment, [
        "-n",
        namespace,
        "delete",
        "pod",
        podName,
        `--grace-period=${gracePeriodSeconds}`,
        "--wait=false"
      ]);

      if (dryRun) {
        await recordAuditEvent(environment, {
          action: "k8s_delete_pod",
          target: `${namespace}/${podName}`,
          outcome: "planned",
          details: { dryRun: true, command, gracePeriodSeconds }
        });
        return jsonResult({ dryRun: true, command, gracePeriodSeconds });
      }

      assertApprovedPodDeletion(environment, confirmation, `DELETE_POD ${namespace} ${podName}`);
      const output = await deletePod(environment, namespace, podName, gracePeriodSeconds);
      await recordAuditEvent(environment, {
        action: "k8s_delete_pod",
        target: `${namespace}/${podName}`,
        outcome: "success",
        details: { gracePeriodSeconds }
      });
      return textResult(output);
    }
  );

  server.registerTool(
    "k8s_preview_command",
    {
      title: "Preview Kubectl Command",
      description: "Preview the fixed kubectl command shape used by this MCP server. It does not execute anything.",
      inputSchema: {
        namespace: z.string().default("devorecruiter-dev"),
        resource: z.enum(["pods", "services", "deployments", "events"]).default("pods")
      },
      annotations: readOnlyAnnotations()
    },
    async ({ namespace, resource }) => {
      const environment = getEnvironment();
      return jsonResult({
        command: buildKubectlPreviewCommand(environment, ["-n", namespace, "get", resource, "-o", "json"]),
        allowedNamespace: environment.allowedNamespace
      });
    }
  );
}
