# Project Architecture

```mermaid
flowchart TD
  TF["Terraform"] --> AZ["Azure infrastructure"]
  AZ --> VM["Azure VM"]
  VM --> K3S["K3s"]
  GHA["GitHub Actions"] --> IMG["Docker images"]
  IMG --> GITOPS["GitOps values"]
  GITOPS --> ARGO["Argo CD"]
  ARGO --> K3S
  K3S --> APPS["Frontend / BFF / FastAPI / n8n / PostgreSQL"]
  APPS --> DT["Dynatrace"]
  MCP["MCP server"] --> GITOPS
  MCP --> K3S
  MCP --> ARGO
  MCP --> TF
  MCP --> DT
```

Terraform owns Azure infrastructure only. GitOps owns Kubernetes desired state. Argo CD synchronizes Git to K3s. Dynatrace observes infrastructure, Kubernetes, and applications. MCP exposes controlled READ, PLAN, WRITE, and DESTRUCTIVE operations.
