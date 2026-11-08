# Helm, Argo CD, And GitOps

GitOps charts and Argo CD Applications are present for:

- frontend;
- api-bff;
- api-back;
- n8n;
- PostgreSQL.

Status: `VERIFIED`.

Live status: MCP validation saw 5 Argo CD applications, all `Healthy` and `Synced`.

Known static risk: some chart `appVersion` values do not match the deployed image tags in `environments/dev/*-values.yaml`. This does not normally block Kubernetes deployment, but it weakens traceability.

Required verification:

```powershell
helm lint charts/frontend
helm template charts/frontend -f environments/dev/frontend-values.yaml
kubectl get applications -n argocd
kubectl get pods -n devorecruiter-dev
```
