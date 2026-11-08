# Dynatrace GitOps Preparation

This directory prepares Dynatrace integration without storing tenant tokens in Git.

Current status: `IMPLEMENTED` as a GitOps-ready template, `BLOCKED` for live verification until Kubernetes access and Dynatrace tenant credentials are available.

## Recommended Option

Use Dynatrace Operator with a DynaKube custom resource after the live K3s audit confirms:

- Kubernetes version;
- available CPU and memory on the Azure Student VM;
- existing CRDs and namespaces;
- whether OneAgent, ActiveGate, or any previous Dynatrace component already exists.

## Secret Handling

Create the secret manually or through an approved secret manager. Do not commit token values.

```powershell
kubectl create namespace dynatrace
kubectl -n dynatrace create secret generic dynakube `
  --from-literal="apiToken=<REDACTED>" `
  --from-literal="dataIngestToken=<REDACTED>"
```

## Operator Install Preview

Official Dynatrace documentation supports installing the Operator with Helm or manifests. For this project, Helm is preferred after validation:

```powershell
helm install dynatrace-operator oci://public.ecr.aws/dynatrace/dynatrace-operator `
  --namespace dynatrace `
  --create-namespace `
  --atomic
```

Do not run this until the live cluster audit is complete.

## Project Monitoring Model

The dashboard and alerting model in this folder is centered on three layers:

1. Kubernetes workload health for `devorecruiter-dev`.
2. Application service health for the detected Dynatrace services inside that namespace.
3. Logs, Kubernetes events, and Davis problems for fast triage.

The dashboard uses Grail/DQL data sources and keeps the namespace and workload filters editable so you can reuse the same view for dev, test, or prod-style namespaces.

### Main Metrics

| Signal | Why it matters |
| --- | --- |
| `dt.kubernetes.container.cpu_usage` | Shows whether a workload is actually using CPU and whether it is trending toward saturation. |
| `dt.kubernetes.container.memory_working_set` | The best indicator of memory pressure and OOM risk. |
| `dt.kubernetes.container.cpu_throttled` | A direct sign that CPU limits are too tight. |
| `dt.kubernetes.workload.pods_desired` | Tells you whether the deployment is trying to run the expected replica count. |
| `dt.service.request.count` | Confirms the frontend, BFF, and FastAPI paths are still receiving traffic. |
| `dt.service.request.failure_count` | Surfaces application failures before users report them. |
| `dt.service.request.response_time` | Lets you alert on slow APIs and broken downstream dependencies. |
| `fetch logs` and `fetch events` | Gives the fastest path from symptom to root cause. |

### Alerting Strategy

The recommended alerts are split into three groups:

- Kubernetes built-in anomaly detection for pod, backoff, OOM, and saturation issues.
- Custom DQL-based service alerts for failure rate and latency.
- Log-based alerts for sudden error spikes or missing telemetry.

The thresholds in [`alerts.md`](./alerts.md) are intentionally conservative so they can be tuned after a short observation period.

## Dynatrace Alert Config

The file [`dynatrace-alerts.json`](./dynatrace-alerts.json) contains a ready-to-post Settings API payload for Dynatrace.

It creates:

1. Kubernetes workload anomaly detection settings.
2. A service failure-count alert for `devorecruiter-dev`.
3. A p95 service response-time alert for `devorecruiter-dev`.

How to apply it:

1. Open Dynatrace settings or use the Settings API.
2. Create settings objects with the contents of `dynatrace-alerts.json`.
3. If needed, narrow the scope from `environment` to the specific namespace or cluster after import.

This is a direct Dynatrace configuration, not a webhook relay.

## Verification Commands

```powershell
kubectl get pods -n dynatrace
kubectl get dynakube -n dynatrace
kubectl get crd | Select-String -Pattern "dynatrace|dynakube"
kubectl get pods -A | Select-String dynatrace
```

## Rollback

Rollback must be planned before install:

1. remove or revert the DynaKube custom resource;
2. verify managed Dynatrace pods are gone;
3. uninstall the Operator with Helm only if it was installed with Helm;
4. keep token revocation as a separate tenant-side action.

## Dashboard File

The main dashboard lives in [`devorecruiter-dashboard.json`](./devorecruiter-dashboard.json). It is organized as follows:

- top row: volume, errors, warnings, and active problems;
- resource row: CPU, memory, throttling, and desired pods;
- service row: request volume, failures, and p95 response time;
- investigation row: error hotspots, recent events, and recent error logs.
