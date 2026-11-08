import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

export function registerInfraPrompts(server: McpServer): void {
  server.registerPrompt(
    "explain_mcp_architecture",
    {
      title: "Explain MCP Architecture",
      description: "Generate a guided explanation of how this MCP server connects GitOps, Kubernetes, and Argo CD.",
      argsSchema: {
        focus: z
          .enum(["beginner", "devops", "security"])
          .default("beginner")
          .describe("Choose the explanation angle.")
      }
    },
    async ({ focus }) => ({
      description: "Guided DevoRecruiter MCP architecture explanation prompt.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Explain the DevoRecruiter MCP infra server for a ${focus} audience.`,
              "Cover tools, resources, prompts, STDIO transport, GitOps safety boundaries, Kubernetes access, and Argo CD access.",
              "Keep the explanation practical and connect it to the Azure VM deployment."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "diagnose_pod",
    {
      title: "Diagnose Kubernetes Pod",
      description: "Prompt template for diagnosing a DevoRecruiter pod using MCP read-only tools.",
      argsSchema: {
        podName: z.string().describe("Pod name to diagnose."),
        namespace: z.string().default("devorecruiter-dev")
      }
    },
    async ({ podName, namespace }) => ({
      description: "Kubernetes pod diagnosis workflow.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Diagnose pod ${podName} in namespace ${namespace}.`,
              "Use k8s_list_pods, k8s_get_pod_logs, k8s_list_events, and argocd_get_app if relevant.",
              "Do not suggest destructive commands. Explain likely root cause and safe next steps."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "update_image",
    {
      title: "Update GitOps Image",
      description: "Prompt template for safely updating a GitOps image tag.",
      argsSchema: {
        service: z.string().describe("Service name."),
        nextTag: z.string().describe("New image tag.")
      }
    },
    async ({ service, nextTag }) => ({
      description: "GitOps image update workflow.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Plan an image update for ${service} to tag ${nextTag}.`,
              "First call gitops_plan_image_update.",
              "Only call gitops_update_image_tag with dryRun=false if the user explicitly confirms and MCP_INFRA_ENABLE_MUTATIONS=true."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "recover_pod",
    {
      title: "Recover Kubernetes Pod",
      description: "Safely diagnose and restart a controller-managed DevoRecruiter pod.",
      argsSchema: {
        podName: z.string().describe("Pod name to recover."),
        namespace: z.string().default("devorecruiter-dev")
      }
    },
    async ({ podName, namespace }) => ({
      description: "Guarded Kubernetes pod recovery workflow.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Recover pod ${podName} in namespace ${namespace}.`,
              "First use k8s_describe_pod, k8s_get_pod_logs, and k8s_list_events.",
              "Then call k8s_restart_pod with dryRun=true and explain the impact.",
              "Only execute with dryRun=false after explicit user confirmation using the exact confirmation phrase.",
              "After restart, use k8s_list_pods and Argo CD health tools to verify recovery."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "deploy_application",
    {
      title: "Deploy Application",
      description: "Prompt template for safely syncing an Argo CD application.",
      argsSchema: {
        appName: z.string().describe("Argo CD app name.")
      }
    },
    async ({ appName }) => ({
      description: "Argo CD application deployment workflow.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Prepare a safe deployment sync for Argo CD app ${appName}.`,
              "First inspect argocd_get_app and GitOps state.",
              "Only call argocd_sync_app with dryRun=false if the user explicitly confirms and MCP_INFRA_ENABLE_MUTATIONS=true."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "diagnose_kubernetes_workload",
    {
      title: "Diagnose Kubernetes Workload",
      description: "Diagnose a DevoRecruiter workload with read-only Kubernetes, Argo CD, and Dynatrace context.",
      argsSchema: {
        workloadName: z.string(),
        namespace: z.string().default("devorecruiter-dev")
      }
    },
    async ({ workloadName, namespace }) => ({
      description: "Read-only Kubernetes workload diagnosis.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Diagnose workload ${workloadName} in namespace ${namespace}.`,
              "Use k8s_list_deployments, k8s_list_pods, k8s_list_events, argocd_list_apps, and Dynatrace read tools if configured.",
              "Return evidence, likely cause, safe commands, and rollback options."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "diagnose_argocd_outofsync",
    {
      title: "Diagnose Argo CD OutOfSync",
      description: "Investigate an Argo CD application that is OutOfSync or degraded.",
      argsSchema: {
        appName: z.string()
      }
    },
    async ({ appName }) => ({
      description: "Argo CD OutOfSync diagnosis.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Diagnose Argo CD app ${appName}.`,
              "Use argocd_get_app, GitOps resources, Kubernetes events, and Helm chart context.",
              "Do not sync unless the user explicitly confirms a guarded write."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "plan_gitops_image_update",
    {
      title: "Plan GitOps Image Update",
      description: "Plan a GitOps image tag change with safety checks.",
      argsSchema: {
        service: z.string(),
        nextTag: z.string()
      }
    },
    async ({ service, nextTag }) => ({
      description: "GitOps image update plan.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Plan a GitOps image update for ${service} to ${nextTag}.`,
              "Use gitops_list_image_tags and gitops_plan_image_update.",
              "Explain diff, blast radius, verification, and rollback."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "review_terraform_plan",
    {
      title: "Review Terraform Plan",
      description: "Review a saved Terraform plan before apply.",
      argsSchema: {
        kind: z.enum(["normal", "destroy"]).default("normal")
      }
    },
    async ({ kind }) => ({
      description: "Terraform plan review.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Review the ${kind} Terraform plan.`,
              "Use terraform_show_plan and terraform_estimate_changes.",
              "Identify creates, updates, destroys, security exposure, cost impact, and rollback path."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "diagnose_terraform_failure",
    {
      title: "Diagnose Terraform Failure",
      description: "Diagnose Terraform validation, plan, state, or apply failures.",
      argsSchema: {
        failureStage: z.enum(["fmt", "init", "validate", "plan", "apply", "state"]).default("plan")
      }
    },
    async ({ failureStage }) => ({
      description: "Terraform failure diagnosis.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Diagnose a Terraform ${failureStage} failure.`,
              "Use terraform_status, terraform_validate, terraform_show_state_summary, and any returned error details.",
              "Explain cause, safe fix, and state/rollback risk."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "diagnose_dynatrace_problem",
    {
      title: "Diagnose Dynatrace Problem",
      description: "Diagnose one Dynatrace problem with Kubernetes and GitOps context.",
      argsSchema: {
        problemId: z.string()
      }
    },
    async ({ problemId }) => ({
      description: "Dynatrace problem diagnosis.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Diagnose Dynatrace problem ${problemId}.`,
              "Use get_dynatrace_problem, get_kubernetes_health, get_service_health, k8s_list_events, and Argo CD tools.",
              "Return evidence, timeline, likely cause, mitigation, and follow-up monitoring."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "verify_deployment_end_to_end",
    {
      title: "Verify Deployment End To End",
      description: "Verify Terraform, Azure, K3s, Argo CD, applications, Dynatrace, and MCP evidence.",
      argsSchema: {
        service: z.string().default("all")
      }
    },
    async ({ service }) => ({
      description: "End-to-end deployment verification.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Verify deployment end to end for ${service}.`,
              "Collect Terraform, Azure, K3s, Argo CD, Helm, application smoke, Dynatrace, and MCP evidence.",
              "Mark each item NOT STARTED, IN PROGRESS, BLOCKED, IMPLEMENTED, or VERIFIED only with proof."
            ].join(" ")
          }
        }
      ]
    })
  );

  server.registerPrompt(
    "prepare_incident_report",
    {
      title: "Prepare Incident Report",
      description: "Prepare a source-backed incident report for DevoRecruiter.",
      argsSchema: {
        incidentTitle: z.string()
      }
    },
    async ({ incidentTitle }) => ({
      description: "Incident report preparation.",
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: [
              `Prepare an incident report titled '${incidentTitle}'.`,
              "Include timeline, impact, detection, evidence, root cause, mitigation, rollback, prevention, and open risks.",
              "Do not expose secrets."
            ].join(" ")
          }
        }
      ]
    })
  );
}
