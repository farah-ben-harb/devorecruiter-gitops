import type { McpInfraEnvironment } from "../config/environment.js";

export function requireMutationEnabled(environment: McpInfraEnvironment): void {
  if (!environment.enableMutations) {
    throw new Error("Mutating MCP tools are disabled. Set MCP_INFRA_ENABLE_MUTATIONS=true only when you intentionally want write actions.");
  }
}

export function requireConfirmation(actual: string | undefined, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Confirmation mismatch. Expected confirmation exactly: ${expected}`);
  }
}

export function requireDestructiveEnabled(environment: McpInfraEnvironment): void {
  if (!environment.enableDestructive) {
    throw new Error("Destructive MCP tools are disabled. Set MCP_INFRA_ENABLE_DESTRUCTIVE=true only for an approved recovery or teardown window.");
  }
}

export function requirePodDeletionEnabled(environment: McpInfraEnvironment): void {
  if (!environment.enablePodDeletion) {
    throw new Error(
      "Pod deletion is disabled. Set MCP_INFRA_ENABLE_POD_DELETION=true only when explicit pod deletion should be available."
    );
  }
}
