# Dynatrace Alert Plan for DevoRecruiter

This document summarizes the recommended alert model for the `devorecruiter-dev` namespace.

The goal is to keep the noise low while still catching the failures that matter for this project:

- Kubernetes saturation;
- pod lifecycle issues;
- application error spikes;
- slow API responses;
- missing telemetry.

## 1. Built-in Kubernetes Alerts

Enable Dynatrace's built-in Kubernetes/OpenShift issue detection first. These alerts are the quickest way to catch platform problems and they work per workload even if you configure them higher up at the cluster level.

Recommended alerts:

| Alert | Suggested severity | Why |
| --- | --- | --- |
| Pods stuck in pending | Warning | Usually means scheduling, quota, or image-pull issues. |
| Pods stuck terminating | Warning | Often points to stuck shutdown logic or cluster pressure. |
| Pod backoff events | Critical | Strong signal of CrashLoopBackOff or ImagePullBackOff. |
| Pod eviction events | Critical | Indicates node pressure or resource exhaustion. |
| CPU usage saturation | Warning at 80%, critical at 90% | Shows the workload is close to its CPU ceiling. |
| Memory usage saturation | Warning at 75%, critical at 90% | Memory pressure tends to end in OOM kills. |
| CPU throttling | Warning at 15%, critical at 25% | Means the CPU limit is too restrictive. |
| OOM kills | Critical | Immediate sign that memory is not sized correctly. |

Relevant Dynatrace metrics:

- `dt.kubernetes.container.cpu_usage`
- `dt.kubernetes.container.memory_working_set`
- `dt.kubernetes.container.cpu_throttled`
- `dt.kubernetes.container.oom_kills`
- `dt.kubernetes.workload.pods_desired`
- `dt.kubernetes.events`

## 2. Custom Service Alerts

Use DQL-based anomaly detection for the application layer. This is useful for the frontend, BFF, and FastAPI services because the same namespace can be reused across environments.

### Failure Rate

Alert when the percentage of failed requests is consistently above 5% for 5 to 10 minutes.

Example DQL:

```dql
timeseries {
  failed = sum(dt.service.request.failure_count),
  total = sum(dt.service.request.count)
},
filter: {k8s.namespace.name == "devorecruiter-dev"},
by: {service.name}
| fieldsAdd failure_rate = if(isNull(total[]) or total[] == 0, 0.0, else: failed[] / total[] * 100)
```

Why this matters:

- catches broken deployments;
- catches downstream dependency failures;
- catches auth or integration regressions before users report them.

### Response Time

Alert when p95 response time stays above 2 seconds for 10 minutes.

Example DQL:

```dql
timeseries p95_response_time = percentile(dt.service.request.response_time, 95),
filter: {k8s.namespace.name == "devorecruiter-dev"},
by: {service.name}
```

Why this matters:

- reveals slow database calls;
- reveals slow third-party APIs;
- reveals resource pressure before total failure.

## 3. Log-Based Alerts

Use log-based alerts when the application emits clear error patterns.

Recommended log alerts:

| Alert | Suggested threshold | Why |
| --- | --- | --- |
| Error log spike | More than 20 error logs in 10 minutes | Good for sudden regressions. |
| Exception burst | More than 10 exception lines in 10 minutes | Good for crash loops and failed requests. |
| Missing logs | No logs for 15 minutes | Good for silent outages or ingestion problems. |

Example DQL for an error log alert:

```dql
fetch logs
| filter dt.system.bucket == "default_logs"
| filter k8s.namespace.name == "devorecruiter-dev"
| filter loglevel == "ERROR" or content ~ "error" or content ~ "exception"
| summarize error_count = count()
```

## 4. Suggested Severity Map

Use the following severity mapping as a starting point:

| Condition | Severity |
| --- | --- |
| Single pod restart or short warning spike | Warning |
| Replica mismatch, sustained throttling, or rising error rate | Warning to Major |
| OOM kill, BackOff, missing service traffic, or high latency | Critical |

## 5. Practical Rollout Order

1. Turn on the built-in Kubernetes alerts first.
2. Add service failure-rate and latency alerts for the BFF and FastAPI services.
3. Add log-based alerts once the log volume is stable.
4. Tune thresholds after one or two normal traffic cycles.

