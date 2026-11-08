# Limitations And Roadmap

## Current Limitations

- GitHub Actions CI run evidence has not been reviewed.
- Argo CD CLI is not installed locally.
- Docker daemon is not running.
- Dynatrace MCP classic problem/metric reads need a scoped API token or Platform API migration.
- The pasted Dynatrace Platform token must be rotated and the Kubernetes secret updated.

## Roadmap

1. Rotate the pasted Dynatrace Platform token and update the Kubernetes `dynatrace/default` secret.
2. Add a scoped classic Dynatrace API token for MCP problem/metric tools, or migrate those tools to Platform APIs.
3. Review GitHub Actions runs for CI evidence.
4. Run MCP Inspector and Claude Desktop STDIO validation.
5. Keep Dynatrace in the lightweight single-DynaKube profile unless the VM size is increased.
