# DevoRecruiter GitOps

This repository defines the desired Kubernetes state for DevoRecruiter.

It is intentionally separate from the application source monorepo so deployment changes can be reviewed, promoted, and rolled out independently from application code.

## Architecture

```mermaid
flowchart LR
    App[DevoRecruiter Source Repo] --> Build[CI Pipeline]
    Build --> Image[Container Image]
    Image --> GitOps[This Repository]
    GitOps --> ArgoCD[Argo CD]
    ArgoCD --> Cluster[Kubernetes Cluster]
```

## Scope

This repository should contain:

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

- `charts/` reusable or application charts
- `environments/` environment-specific values and overlays
- `argocd/` Argo CD project and application definitions

## Deployment Flow

1. The application repository builds and tests the software.
2. The image is published with an immutable tag.
3. This repository is updated with the new tag or release reference.
4. Argo CD reconciles the cluster state to match Git.

For the current development environment, the intended rollout order is:

1. PostgreSQL and its external password Secret.
2. n8n and its encryption/database Secrets.
3. FastAPI and its `GROQ_API_KEY`, `HF_TOKEN` (optional), and `RAG_INTERNAL_SECRET` values.
4. BFF and its application credentials plus the same `RAG_INTERNAL_SECRET` value.
5. Frontend and the externally managed TLS Secret.

The BFF and FastAPI Secrets must contain the same inter-service HMAC value under
`rag-internal-secret`. The value is never committed here. OAuth must use the
HTTPS frontend hostname and the callback path `/api/auth/google/callback`; the
legacy access-token query flag is intentionally absent.

The application and n8n ingresses reference externally provisioned TLS Secrets
(`devorecruiter-tls`, `devorecruiter-api-tls`, and `n8n-tls`). This repository does
not create certificates or cloud resources.

## Branching and Commits

- Use branches such as `feat/<area>`, `fix/<area>`, `docs/<area>`, or `gitops/<area>`
- Keep commit messages short and descriptive
- Prefer Conventional Commits such as `chore(gitops): update image reference`
- Avoid mixing infrastructure policy changes with unrelated app changes

## Contributing

- Update only the deployment state you intend to change
- Keep secrets outside Git
- Document rollout risk when a manifest change may affect availability

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

## Validation

Pull requests run Helm lint, render all five charts with the development values,
validate the rendered Kubernetes resources with kubeconform, and scan the Git
tree and history with Gitleaks. These checks are static validations only; they
do not prove that a cluster, ingress controller, external Secrets provider, or
OAuth provider is configured successfully.
