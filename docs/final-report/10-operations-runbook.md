# Operations Runbook

## Azure Login

```powershell
az login --tenant "604f1a96-cbe8-43f8-abbf-f8eaf5d85730"
```

## Kubernetes Context

```powershell
kubectl config get-contexts
kubectl config use-context <context>
```

## Terraform

```powershell
Set-Location "D:\Stage DevoTeam\devorecruiter\infrastructure\terraform"
terraform fmt -recursive
terraform init -backend=false
terraform validate
terraform plan -input=false
```

## MCP

```powershell
Set-Location "D:\Stage DevoTeam\devorecruiter-gitops\tools\mcp-infra"
npm run typecheck
npm run build
npm test
```

## Dynatrace

Follow `monitoring/dynatrace/README.md`. Do not create tokens in Git.
