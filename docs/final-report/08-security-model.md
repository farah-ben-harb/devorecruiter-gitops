# Security Model

Principles:

- Git is the source of truth for persistent Kubernetes changes.
- Terraform writes require saved plans.
- Destructive Terraform operations require `MCP_INFRA_ENABLE_MUTATIONS=true`, `MCP_INFRA_ENABLE_DESTRUCTIVE=true`, and exact confirmation.
- Kubernetes access is namespace-restricted.
- Argo CD access is project-restricted.
- Dynatrace tokens come from local environment only.
- Secrets are not committed, printed, or documented.

Write flow:

```mermaid
sequenceDiagram
  participant User
  participant MCP
  participant Plan
  participant System
  User->>MCP: request change
  MCP->>Plan: produce read-only plan
  MCP-->>User: diff, risk, rollback
  User->>MCP: exact confirmation
  MCP->>System: fixed write operation
  MCP-->>User: audit and verification steps
```
