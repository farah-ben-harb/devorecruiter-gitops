import { readFile } from "node:fs/promises";

import { Client } from "ssh2";

import type { McpInfraEnvironment } from "../config/environment.js";

export type SshCommandResult = {
  target: string;
  command: string;
  stdout: string;
  stderr: string;
  code: number | null;
};

export class SshCommandError extends Error {
  readonly result?: SshCommandResult;

  constructor(message: string, result?: SshCommandResult) {
    super(message);
    this.name = "SshCommandError";

    if (result) {
      this.result = result;
    }
  }
}

export async function runSshCommand(environment: McpInfraEnvironment, command: string): Promise<SshCommandResult> {
  const { host, username, privateKey } = await getSshConnectionConfig(environment);
  const target = `${username}@${host}`;

  return new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        client.end();
        reject(new SshCommandError(`SSH command timed out after ${environment.commandTimeoutMs}ms.`));
      }
    }, environment.commandTimeoutMs);

    client
      .on("ready", () => {
        client.exec(command, (error, stream) => {
          if (error) {
            clearTimeout(timeout);
            settled = true;
            client.end();
            reject(error);
            return;
          }

          let stdout = "";
          let stderr = "";

          stream
            .on("close", (code: number | null) => {
              clearTimeout(timeout);
              settled = true;
              client.end();

              const result = {
                target,
                command,
                stdout,
                stderr,
                code
              };

              if (code && code !== 0) {
                reject(new SshCommandError(`Remote command failed with exit code ${code}.`, result));
                return;
              }

              resolve(result);
            })
            .on("data", (data: Buffer) => {
              stdout += data.toString("utf8");
            })
            .stderr.on("data", (data: Buffer) => {
              stderr += data.toString("utf8");
            });
        });
      })
      .on("error", error => {
        clearTimeout(timeout);
        if (!settled) {
          settled = true;
          reject(error);
        }
      })
      .connect({
        host,
        username,
        privateKey,
        readyTimeout: environment.commandTimeoutMs
      });
  });
}

async function getSshConnectionConfig(environment: McpInfraEnvironment): Promise<{ host: string; username: string; privateKey: Buffer }> {
  if (!environment.vmHost || !environment.vmUser) {
    throw new Error("VM SSH configuration is missing. Set MCP_INFRA_VM_HOST and MCP_INFRA_VM_USER in tools/mcp-infra/.env.");
  }

  if (!environment.sshKeyPath) {
    throw new Error("SSH key path is missing. Set MCP_INFRA_SSH_KEY_PATH in tools/mcp-infra/.env.");
  }

  return {
    host: environment.vmHost,
    username: environment.vmUser,
    privateKey: await readFile(environment.sshKeyPath)
  };
}
