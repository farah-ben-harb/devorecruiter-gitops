# Dynatrace Observability

Dynatrace templates were added under `monitoring/dynatrace`, and the live K3s cluster now runs Dynatrace through the Operator.

Status: `VERIFIED` for Dynatrace Kubernetes installation and tenant ingestion. MCP classic Dynatrace API reads remain limited because the provided Platform token returns `403` for `/api/v2/problems`.

Recommended architecture after live audit:

- Dynatrace Operator;
- DynaKube custom resource;
- Kubernetes monitoring through ActiveGate capability;
- OneAgent cloud-native full-stack only if the VM budget allows it;
- token stored in Kubernetes Secret, GitHub Secrets, or another approved secret mechanism.

Token placeholders:

```text
DYNATRACE_PLATFORM_TOKEN=<REDACTED>
```

No token values are stored in Git.

## Latest Evidence

Command:

```powershell
npm run validate:dynatrace
```

Observed result:

- Helm installed on VM: `v4.2.3`.
- Dynatrace Operator Helm release: `deployed`.
- Dynatrace namespace found in K3s: `true`.
- Dynatrace/DynaKube CRD found in K3s: `true`.
- Dynatrace pod found in K3s: `true`.
- DynaKube `default-agents`: `Running`.
- ActiveGate pod: `1/1 Running`.
- Log monitoring pod: `1/1 Running`.
- Dynatrace Operator pod: `1/1 Running`.
- Dynatrace webhook pods: `1/1 Running`.
- Dynatrace OneAgent CSI driver pod: `4/4 Running`.
- Required secret `default`: `true`.
- `dtwiz watch`: logs ingested in Dynatrace.
- Dynatrace systemd service on VM: `false`.
- Dynatrace Operator processes on VM: `true`.

Conclusion: Dynatrace Operator, DynaKube, ActiveGate, CSI, webhook, log monitoring, and tenant log ingestion are verified. The deployment was consolidated to one DynaKube because the Azure Students VM has 2 vCPU and about 4 GiB RAM.

Security note: the Platform token was pasted in chat during execution, so it should be rotated in Dynatrace and the Kubernetes secret should be updated with the replacement token.
