@'
# DevoRecruiter GitOps

This repository contains the desired Kubernetes deployment state for DevoRecruiter.

It is intentionally separate from the source monorepo.

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

## Current phase

Phase 5 is repository and Helm basics only.

No Kubernetes deployment is performed in this phase.
No Azure resource is created in this phase.
No Argo CD installation is performed in this phase.
'@ | Set-Content -Path README.md -Encoding ascii