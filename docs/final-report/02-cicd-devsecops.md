# CI/CD And DevSecOps

The application pipeline already includes path-aware CI, Gitleaks, npm audit, pip-audit, Semgrep, Docker builds, Trivy image scans, image publication, and GitOps image tag updates.

Terraform validation has been extended with:

- `terraform fmt -check -recursive`;
- `terraform init -backend=false`;
- `terraform validate`;
- TFLint;
- Checkov;
- Trivy config scanning;
- PR plan artifact when Azure CI credentials exist.

Status: `IMPLEMENTED`.

Live GitHub Actions execution status: `BLOCKED` until workflow runs are reviewed.
