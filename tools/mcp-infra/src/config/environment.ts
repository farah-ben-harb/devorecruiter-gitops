import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCAL_ENV_PATH = resolve(PROJECT_ROOT, ".env");

function loadLocalEnvFile(): Record<string, string> {
  if (!existsSync(LOCAL_ENV_PATH)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(LOCAL_ENV_PATH, "utf8")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#") && line.includes("="))
      .map(line => {
        const separatorIndex = line.indexOf("=");
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

        return [key, value];
      })
  );
}

function readConfigValue(localEnv: Record<string, string>, key: string): string | undefined {
  return process.env[key] ?? localEnv[key];
}

function readBooleanConfigValue(localEnv: Record<string, string>, key: string, defaultValue: boolean): boolean {
  const value = readConfigValue(localEnv, key);

  if (!value) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumberConfigValue(localEnv: Record<string, string>, key: string, defaultValue: number): number {
  const value = readConfigValue(localEnv, key);
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export type McpInfraEnvironment = {
  gitopsRoot: string;
  terraformRoot: string;
  allowedNamespace: string;
  allowedArgoProject: string;
  enableMutations: boolean;
  enableDestructive: boolean;
  enablePodDeletion: boolean;
  commandTimeoutMs: number;
  auditLogPath: string;
  kubernetesMode: "ssh" | "local";
  kubernetesContext?: string;
  dynatraceEnvironmentUrl?: string;
  dynatraceSettingsApiUrl?: string;
  dynatraceApiToken?: string;
  vmHost?: string;
  vmUser?: string;
  sshKeyPath?: string;
};

export function getEnvironment(): McpInfraEnvironment {
  const localEnv = loadLocalEnvFile();
  const requestedKubernetesMode = readConfigValue(localEnv, "MCP_INFRA_KUBERNETES_MODE")?.toLowerCase();
  const environment: McpInfraEnvironment = {
    gitopsRoot: resolve(PROJECT_ROOT, readConfigValue(localEnv, "MCP_INFRA_GITOPS_ROOT") ?? "../../"),
    terraformRoot: resolve(PROJECT_ROOT, readConfigValue(localEnv, "MCP_INFRA_TERRAFORM_ROOT") ?? "../../../devorecruiter/infrastructure/terraform"),
    allowedNamespace: readConfigValue(localEnv, "MCP_INFRA_ALLOWED_NAMESPACE") ?? "devorecruiter-dev",
    allowedArgoProject: readConfigValue(localEnv, "MCP_INFRA_ALLOWED_ARGOCD_PROJECT") ?? "devorecruiter-dev",
    enableMutations: readBooleanConfigValue(localEnv, "MCP_INFRA_ENABLE_MUTATIONS", false),
    enableDestructive: readBooleanConfigValue(localEnv, "MCP_INFRA_ENABLE_DESTRUCTIVE", false),
    enablePodDeletion: readBooleanConfigValue(localEnv, "MCP_INFRA_ENABLE_POD_DELETION", false),
    commandTimeoutMs: readNumberConfigValue(localEnv, "MCP_INFRA_COMMAND_TIMEOUT_MS", 30000),
    auditLogPath: resolve(PROJECT_ROOT, readConfigValue(localEnv, "MCP_INFRA_AUDIT_LOG_PATH") ?? "logs/audit.jsonl"),
    kubernetesMode: requestedKubernetesMode === "local" ? "local" : "ssh"
  };
  const kubernetesContext = readConfigValue(localEnv, "MCP_INFRA_KUBERNETES_CONTEXT");
  const dynatraceEnvironmentUrl = readConfigValue(localEnv, "DYNATRACE_ENVIRONMENT_URL");
  const dynatraceSettingsApiUrl = readConfigValue(localEnv, "DYNATRACE_SETTINGS_API_URL");
  const dynatraceApiToken = readConfigValue(localEnv, "DYNATRACE_API_TOKEN");
  const vmHost = readConfigValue(localEnv, "MCP_INFRA_VM_HOST");
  const vmUser = readConfigValue(localEnv, "MCP_INFRA_VM_USER");
  const sshKeyPath = readConfigValue(localEnv, "MCP_INFRA_SSH_KEY_PATH");

  if (kubernetesContext) {
    environment.kubernetesContext = kubernetesContext;
  }

  if (dynatraceEnvironmentUrl) {
    environment.dynatraceEnvironmentUrl = dynatraceEnvironmentUrl.replace(/\/+$/, "");
  }

  if (dynatraceSettingsApiUrl) {
    environment.dynatraceSettingsApiUrl = dynatraceSettingsApiUrl.replace(/\/+$/, "");
  }

  if (dynatraceApiToken) {
    environment.dynatraceApiToken = dynatraceApiToken;
  }

  if (vmHost) {
    environment.vmHost = vmHost;
  }

  if (vmUser) {
    environment.vmUser = vmUser;
  }

  if (sshKeyPath) {
    environment.sshKeyPath = isAbsolute(sshKeyPath) ? sshKeyPath : resolve(PROJECT_ROOT, sshKeyPath);
  }

  return environment;
}
