# Testing And Evidence

| Feature | File | Test | Evidence | Status |
| --- | --- | --- | --- | --- |
| Terraform validate | `devorecruiter/infrastructure/terraform` | `terraform fmt -recursive`; `terraform init -backend=false -reconfigure`; `terraform validate` | configuration valid with AzureRM v4.81.0 lock file | `VERIFIED` |
| Terraform plan | `devorecruiter/infrastructure/terraform` | import existing Azure resources; `terraform plan -input=false -no-color` with `enable_infrastructure=true` | `No changes. Your infrastructure matches the configuration.` | `VERIFIED` |
| K3s health | cluster through MCP SSH | `npm run validate:live` | MCP saw 5 pods, 5 running, 5 services in `devorecruiter-dev` | `VERIFIED` |
| Argo CD sync | `argocd/applications` through MCP SSH | `npm run validate:live` | MCP saw 5 apps, 5 Healthy, 5 Synced, sync dry-run protected | `VERIFIED` |
| Dynatrace Kubernetes | cluster through MCP SSH and `dtwiz` | `dtwiz install kubernetes`; `npm run validate:dynatrace`; `dtwiz watch` | DynaKube `default-agents` Running; ActiveGate/log monitoring/operator/webhook/CSI pods Ready; tenant logs ingested | `VERIFIED` |
| Dynatrace MCP API reads | MCP Dynatrace tools | direct `/api/v2/problems` probe | Platform token valid for `dtwiz`, but `/api/v2/problems` returns `403`; classic API token still needed for MCP problem/metric tools | `LIMITED` |
| MCP Tool READ | `tools/mcp-infra` | `npm run typecheck`; `npm run build`; `npm test` | 2 test files passed, 19 tests passed on 2026-11-08 | `VERIFIED LOCALLY` |
| MCP Tool PLAN | `tools/mcp-infra` | `npm test` | plan tools registered and dry-run behavior tested | `VERIFIED` |
| MCP Tool WRITE | `tools/mcp-infra` | guarded dry-run tests | previews and default dry-run behavior passed; no live write was executed by this test suite | `DRY-RUN VERIFIED` |

The historical live acceptance was `VERIFIED_WITH_LIMITATIONS`: core platform and Dynatrace Kubernetes ingestion were observed, while MCP Dynatrace problem/metric API reads still needed a scoped classic API token or a Platform API migration. A fresh live check on 2026-11-08 could not complete because local `kubectl` was unavailable and the SSH connection timed out; current cluster health is therefore unverified.
