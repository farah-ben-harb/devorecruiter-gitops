# MCP Implementation

MCP server location:

```text
devorecruiter-gitops/tools/mcp-infra
```

Status: `IMPLEMENTED`.

Implemented domains:

- GitOps tools;
- Kubernetes read tools through SSH;
- Argo CD read and guarded sync tools;
- Terraform read, plan, guarded apply, and disabled-by-default destroy tools;
- Dynatrace read and plan preview tools;
- resources;
- prompts;
- audit logging;
- exact confirmation checks;
- destructive mode gate.

Architecture:

```mermaid
flowchart LR
  Claude["Claude Desktop"] --> STDIO["STDIO JSON-RPC"]
  STDIO --> MCP["MCP Infra Server"]
  MCP --> GitOps["GitOps files"]
  MCP --> SSH["SSH to Azure VM"]
  SSH --> K3S["k3s kubectl"]
  MCP --> TF["Terraform CLI"]
  MCP --> DT["Dynatrace API"]
```

The server never accepts arbitrary Terraform commands.
