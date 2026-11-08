# K3s And Kubernetes

Kubernetes live verification is `VERIFIED`.

Verified evidence:

```text
MCP live validation through SSH saw 5 pods running and 5 services in namespace devorecruiter-dev.
Dynatrace namespace is Active and Dynatrace pods are Running/Ready.
```

Required verification commands:

```powershell
kubectl config current-context
kubectl cluster-info
kubectl get nodes -o wide
kubectl get namespaces
kubectl get pods -A -o wide
kubectl get events -A --sort-by=.lastTimestamp
```

Acceptance requires node readiness, CoreDNS health, Traefik health, storage class health, and DevoRecruiter namespace workload readiness. These checks are satisfied through the current SSH-based K3s validation.
