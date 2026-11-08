export const SERVER_VERSION = "0.4.0";
export const SERVER_NAME = "devorecruiter-mcp-infra";
export const RUNTIME_RESOURCE_URI = "mcp-infra://runtime";
export const SECURITY_POLICY_RESOURCE_URI = "mcp-infra://security/policy";
export const GITOPS_IMAGES_RESOURCE_URI = "mcp-infra://gitops/images";
export const TERRAFORM_SUMMARY_RESOURCE_URI = "terraform://infrastructure/summary";
export const TERRAFORM_STATE_RESOURCE_URI = "terraform://state/resources";
export const K3S_CLUSTER_SUMMARY_RESOURCE_URI = "k3s://cluster/summary";
export const ARGOCD_APPLICATIONS_RESOURCE_URI = "argocd://applications";
export const DYNATRACE_PROBLEMS_RESOURCE_URI = "dynatrace://problems/active";
export const DYNATRACE_KUBERNETES_HEALTH_RESOURCE_URI = "dynatrace://kubernetes/health";
export const DYNATRACE_SERVICES_HEALTH_RESOURCE_URI = "dynatrace://services/health";

export type McpServerStatus = "initialized";

export function getServerStatus(): McpServerStatus {
  return "initialized";
}
