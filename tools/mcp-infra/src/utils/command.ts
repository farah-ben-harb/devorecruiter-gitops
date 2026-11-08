import { execFile, type ExecFileException } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CommandResult = {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
};

export class CommandExecutionError extends Error {
  readonly command: string;
  readonly args: string[];
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | string | undefined;
  readonly timedOut: boolean;

  constructor(command: string, args: string[], error: ExecFileException & { stdout?: string; stderr?: string }) {
    super(error.message);
    this.name = "CommandExecutionError";
    this.command = command;
    this.args = args;
    this.stdout = error.stdout ?? "";
    this.stderr = error.stderr ?? "";
    this.code = error.code;
    this.timedOut = Boolean(error.killed);
  }
}

export async function runCommand(command: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  let result: { stdout: string; stderr: string };

  try {
    result = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true
    });
  } catch (error) {
    throw new CommandExecutionError(command, args, error as ExecFileException & { stdout?: string; stderr?: string });
  }

  return {
    command,
    args,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

export function quoteRemoteArg(value: string): string {
  return `'${value.replace(/'/g, "'\"'\"'")}'`;
}
