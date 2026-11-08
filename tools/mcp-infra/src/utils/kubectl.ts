import type { McpInfraEnvironment } from "../config/environment.js";
import { quoteRemoteArg, runCommand } from "./command.js";
import { runSshCommand } from "./ssh.js";

export type KubectlCommandResult = {
  target: string;
  command: string;
  stdout: string;
  stderr: string;
};

export function buildKubectlCommand(environment: McpInfraEnvironment, args: string[]): string {
  if (environment.kubernetesMode === "local") {
    const contextArgs = environment.kubernetesContext ? ["--context", environment.kubernetesContext] : [];
    return ["kubectl", ...contextArgs, ...args].map(quotePreviewArg).join(" ");
  }

  return ["sudo", "k3s", "kubectl", ...args.map(quoteRemoteArg)].join(" ");
}

export async function runKubectlCommand(
  environment: McpInfraEnvironment,
  args: string[]
): Promise<KubectlCommandResult> {
  if (environment.kubernetesMode === "local") {
    const contextArgs = environment.kubernetesContext ? ["--context", environment.kubernetesContext] : [];
    const result = await runCommand("kubectl", [...contextArgs, ...args], environment.commandTimeoutMs);

    return {
      target: `local:${environment.kubernetesContext ?? "current-context"}`,
      command: buildKubectlCommand(environment, args),
      stdout: result.stdout,
      stderr: result.stderr
    };
  }

  const result = await runSshCommand(environment, buildKubectlCommand(environment, args));
  return {
    target: result.target,
    command: result.command,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

function quotePreviewArg(value: string): string {
  if (/^[A-Za-z0-9_./:=@-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}
