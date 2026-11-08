import type { McpInfraEnvironment } from "../config/environment.js";
import {
  requireConfirmation,
  requireDestructiveEnabled,
  requireMutationEnabled,
  requirePodDeletionEnabled
} from "./permissions.js";

export function assertApprovedMutation(environment: McpInfraEnvironment, confirmation: string | undefined, expected: string): void {
  requireMutationEnabled(environment);
  requireConfirmation(confirmation, expected);
}

export function assertApprovedDestructiveMutation(environment: McpInfraEnvironment, confirmation: string | undefined, expected: string): void {
  requireMutationEnabled(environment);
  requireDestructiveEnabled(environment);
  requireConfirmation(confirmation, expected);
}

export function assertApprovedPodDeletion(environment: McpInfraEnvironment, confirmation: string | undefined, expected: string): void {
  requireMutationEnabled(environment);
  requirePodDeletionEnabled(environment);
  requireConfirmation(confirmation, expected);
}
