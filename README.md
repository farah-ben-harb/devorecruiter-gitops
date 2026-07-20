# DevoRecruiter GitOps

This repository contains the desired Kubernetes deployment state for DevoRecruiter. It is intentionally separate from the application source monorepo so runtime configuration can be reviewed, promoted, and deployed independently from application code.

## Scope

This repository will contain:

- Helm charts
- environment values
- Argo CD project definitions
- Argo CD application definitions
- exact Docker image SHA references

This repository must not contain:

- application source code
- Dockerfiles
- CI build logic
- cloud credentials
- Kubernetes Secret values
- kubeconfig files
- Terraform state
- local runtime data

## Repository Layout

```text
argocd/
  applications/
  projects/
charts/
  api-back/
  api-bff/
  frontend/
environments/
  dev/
```

## Helm Charts

The current Phase 5 charts are:

- `charts/frontend`: Angular frontend served by nginx on port 80.
- `charts/api-bff`: NestJS BFF API served on port 3000.
- `charts/api-back`: FastAPI RAG service served on port 8000.

Each chart renders a Deployment, Service, ConfigMap, and disabled-by-default Ingress. The FastAPI chart also includes an optional PersistentVolumeClaim for Chroma data.

## Secret Handling

Secrets are intentionally not stored in this repository. Charts reference externally-created Kubernetes Secrets such as:

- `devorecruiter-api-bff-secrets`
- `devorecruiter-api-back-secrets`

Those Secrets should be created later through a secure process such as Sealed Secrets, External Secrets Operator, Azure Key Vault integration, or manual cluster bootstrap for local development.

## Current Phase

Phase 5 is repository and Helm basics only.

No Kubernetes deployment is performed in this phase.
No Azure resource is created in this phase.
No Argo CD installation is performed in this phase.
