# DevoRecruiter MCP Infra

Local TypeScript MCP server for learning and operating the DevoRecruiter GitOps, K3s, Argo CD, Helm, Terraform, Dynatrace, and Azure VM platform.

## Purpose

This server exposes controlled infrastructure context to an MCP-compatible client. It helps diagnose and operate the DevoRecruiter dev platform without giving the model unrestricted terminal access.

## Capabilities

## Project Structure

```text
tools/mcp-infra/
├── src/
│   ├── server.ts                  # Composes the MCP server.
│   ├── server-metadata.ts         # Server name, version, resource URIs.
│   ├── runtime.ts                 # Basic runtime metadata.
│   ├── clients/                   # Low-level integrations.
│   │   ├── gitops.client.ts       # Reads and updates GitOps files safely.
│   │   ├── kubernetes.client.ts   # Reads K3s data through SSH.
│   │   ├── argocd.client.ts       # Reads/syncs Argo CD apps through K3s.
│   │   ├── terraform.client.ts    # Runs fixed Terraform workflows.
│   │   └── dynatrace.client.ts    # Reads Dynatrace API data.
│   ├── tools/                     # MCP tools grouped by domain.
│   │   ├── shared.ts              # Shared result/annotation helpers.
│   │   ├── runtime.tools.ts       # server_info and mcp_ssh_check.
│   │   ├── audit.tools.ts         # audit_recent_events.
│   │   ├── gitops/
│   │   │   └── gitops.tools.ts
│   │   ├── kubernetes/
│   │   │   └── kubernetes.tools.ts
│   │   ├── argocd/
│   │   │   └── argocd.tools.ts
│   │   ├── terraform/
│   │   │   └── terraform.tools.ts
│   │   └── dynatrace/
│   │       └── dynatrace.tools.ts
│   ├── resources/
│   │   └── infra.resources.ts     # MCP resources exposed as virtual read-only files.
│   ├── prompts/
│   │   └── infra.prompts.ts       # Reusable MCP prompt templates.
│   ├── security/                  # Safety gates and audit.
│   ├── config/                    # Local .env parsing.
│   └── utils/                     # SSH and command utilities.
├── scripts/
│   └── validate-live-readonly.ts  # End-to-end read-only validation.
├── tests/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

GitOps tools:

- `gitops_list_environment_files`
- `gitops_read_environment_file`
- `gitops_list_charts`
- `gitops_list_image_tags`
- `gitops_plan_image_update`
- `gitops_update_image_tag`

Kubernetes tools:

- `k8s_list_pods`
- `k8s_list_services`
- `k8s_list_deployments`
- `k8s_get_pod_logs`
- `k8s_list_events`
- `k8s_describe_pod`
- `k8s_restart_pod`
- `k8s_restart_deployment`
- `k8s_delete_pod`
- `k8s_preview_command`

Argo CD tools:

- `argocd_list_apps`
- `argocd_get_app`
- `argocd_sync_app`

Terraform tools:

- `terraform_version`
- `terraform_status`
- `terraform_validate`
- `terraform_show_state_summary`
- `terraform_outputs`
- `list_managed_resources`
- `terraform_plan`
- `terraform_plan_destroy`
- `terraform_show_plan`
- `terraform_estimate_changes`
- `terraform_apply_saved_plan`
- `terraform_destroy`

Dynatrace tools:

- `dynatrace_connection_status`
- `list_dynatrace_problems`
- `get_dynatrace_problem`
- `query_dynatrace_metrics`
- `get_kubernetes_health`
- `get_service_health`
- `get_host_health`
- `get_recent_alerts`
- `plan_monitoring_configuration`
- `preview_alert_configuration`
- `preview_dashboard_configuration`

Audit and runtime tools:

- `server_info`
- `mcp_ssh_check`
- `audit_recent_events`

Resources:

- `mcp-infra://runtime`
- `mcp-infra://security/policy`
- `mcp-infra://gitops/images`
- `terraform://infrastructure/summary`
- `terraform://state/resources`
- `k3s://cluster/summary`
- `argocd://applications`
- `dynatrace://problems/active`
- `dynatrace://kubernetes/health`
- `dynatrace://services/health`

Prompts:

- `explain_mcp_architecture`
- `diagnose_pod`
- `update_image`
- `deploy_application`
- `diagnose_kubernetes_workload`
- `diagnose_argocd_outofsync`
- `plan_gitops_image_update`
- `review_terraform_plan`
- `diagnose_terraform_failure`
- `diagnose_dynatrace_problem`
- `verify_deployment_end_to_end`
- `prepare_incident_report`

## Safety Model

The server is read-only by default.

Read-only operations can:

- read approved GitOps dev values files;
- inspect Helm chart folders;
- list Kubernetes pods, services, deployments, events;
- read pod logs;
- list and inspect Argo CD applications in the allowed project.

Mutating operations are disabled unless all conditions are true:

- `.env` contains `MCP_INFRA_ENABLE_MUTATIONS=true`;
- the tool input includes the exact expected confirmation phrase;
- the target passes namespace, project, service, and name validation.

Protected mutating tools:

- `gitops_update_image_tag` with `dryRun=false`;
- `argocd_sync_app` with `dryRun=false`.
- `k8s_restart_pod` with `dryRun=false` (controller-managed pods only);
- `k8s_restart_deployment` with `dryRun=false`;
- `terraform_apply_saved_plan`.

Destructive tools are disabled unless both `MCP_INFRA_ENABLE_MUTATIONS=true` and `MCP_INFRA_ENABLE_DESTRUCTIVE=true` are set:

- `terraform_destroy`.

Explicit pod deletion uses its own narrower gate. It requires both `MCP_INFRA_ENABLE_MUTATIONS=true` and `MCP_INFRA_ENABLE_POD_DELETION=true`:

- `k8s_delete_pod` with `dryRun=false`.

## Configuration

Create a local `.env` file from `.env.example`.

```powershell
Copy-Item ".env.example" ".env"
notepad ".env"
```

Expected local variables:

```env
MCP_INFRA_GITOPS_ROOT=../../
MCP_INFRA_TERRAFORM_ROOT=../../../devorecruiter/infrastructure/terraform
MCP_INFRA_ALLOWED_NAMESPACE=devorecruiter-dev
MCP_INFRA_ALLOWED_ARGOCD_PROJECT=devorecruiter-dev
MCP_INFRA_VM_HOST=<azure-vm-public-ip>
MCP_INFRA_VM_USER=azureuser
MCP_INFRA_SSH_KEY_PATH=C:\Users\<username>\.ssh\id_rsa
MCP_INFRA_COMMAND_TIMEOUT_MS=30000
MCP_INFRA_AUDIT_LOG_PATH=logs/audit.jsonl
MCP_INFRA_ENABLE_MUTATIONS=false
MCP_INFRA_ENABLE_DESTRUCTIVE=false
MCP_INFRA_ENABLE_POD_DELETION=false
DYNATRACE_ENVIRONMENT_URL=https://<tenant>.live.dynatrace.com
DYNATRACE_API_TOKEN=<REDACTED>
DYNATRACE_DATA_INGEST_TOKEN=<REDACTED>
```

Do not commit `.env`.

## Commands

Validate locally:

```powershell
npm run typecheck
npm run build
npm test
npm run validate:live
```

Run as STDIO MCP server:

```powershell
npm run dev
```

Test with MCP Inspector:

```powershell
npx -y @modelcontextprotocol/inspector npm run dev
```

## Common Workflows

List current GitOps image tags:

```text
Call tool: gitops_list_image_tags
```

Plan an image update:

```json
{
  "service": "frontend",
  "nextTag": "new-git-sha"
}
```

Dry-run an Argo CD sync:

```json
{
  "appName": "devorecruiter-frontend-dev"
}
```

Read backend logs:

```json
{
  "namespace": "devorecruiter-dev",
  "podName": "devorecruiter-api-bff-xxxx",
  "tailLines": 200
}
```

Preview a managed pod restart:

```json
{
  "namespace": "devorecruiter-dev",
  "podName": "devorecruiter-api-bff-xxxx",
  "dryRun": true
}
```

Execute the restart after reviewing the preview:

```json
{
  "namespace": "devorecruiter-dev",
  "podName": "devorecruiter-api-bff-xxxx",
  "dryRun": false,
  "confirmation": "RESTART_POD devorecruiter-dev devorecruiter-api-bff-xxxx"
}
```

Preview an explicit pod deletion:

```json
{
  "namespace": "devorecruiter-dev",
  "podName": "devorecruiter-api-bff-xxxx",
  "gracePeriodSeconds": 30,
  "dryRun": true
}
```

`k8s_delete_pod` additionally requires `MCP_INFRA_ENABLE_POD_DELETION=true`. This separate flag does not enable `terraform_destroy`. Prefer `k8s_restart_pod` for normal recovery because it refuses unmanaged pods.

## Notes

- STDIO stdout is reserved for MCP JSON-RPC messages.
- Diagnostics must go to stderr.
- Audit events are written locally to `logs/audit.jsonl`.
- The server never prints secret values intentionally.
- Kubernetes and Argo CD access is performed through SSH to the Azure VM using fixed command shapes.
