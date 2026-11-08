import { mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import type { McpInfraEnvironment } from "../config/environment.js";
import { CommandExecutionError, runCommand } from "../utils/command.js";

export type TerraformCommandSummary = {
  command: string;
  args: string[];
  stdout: string;
  stderr: string;
};

export type TerraformStatus = {
  terraformRoot: string;
  hasTerraformSource: boolean;
  hasLockFile: boolean;
  backend: "azurerm";
  mutationsEnabled: boolean;
  destructiveEnabled: boolean;
};

export type TerraformPlanKind = "normal" | "destroy";

export type TerraformPlanResult = {
  kind: TerraformPlanKind;
  planPath: string;
  summary: string;
  add: number;
  change: number;
  destroy: number;
  planText: string;
};

export async function getTerraformVersion(environment: McpInfraEnvironment): Promise<unknown> {
  const result = await runLocalTerraform(environment, ["version", "-json"]);

  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    return { raw: result.stdout.trim() };
  }
}

export async function getTerraformStatus(environment: McpInfraEnvironment): Promise<TerraformStatus> {
  let entries: string[];
  try {
    entries = await readdir(environment.terraformRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    entries = [];
  }

  return {
    terraformRoot: environment.terraformRoot,
    hasTerraformSource: entries.some(entry => entry.endsWith(".tf")),
    hasLockFile: entries.includes(".terraform.lock.hcl"),
    backend: "azurerm",
    mutationsEnabled: environment.enableMutations,
    destructiveEnabled: environment.enableDestructive
  };
}

export async function validateTerraform(environment: McpInfraEnvironment): Promise<TerraformCommandSummary[]> {
  return [
    await runLocalTerraform(environment, ["fmt", "-check", "-recursive"]),
    await runLocalTerraform(environment, ["init", "-backend=false"]),
    await runLocalTerraform(environment, ["validate", "-no-color"])
  ];
}

export async function getTerraformOutputs(environment: McpInfraEnvironment): Promise<unknown> {
  const result = await runLocalTerraformAllowingMissingState(environment, ["output", "-json"]);

  if (!result.ok) {
    return { available: false, reason: result.error };
  }

  return result.stdout.trim() ? (JSON.parse(result.stdout) as unknown) : {};
}

export async function listManagedResources(environment: McpInfraEnvironment): Promise<string[] | { available: false; reason: string }> {
  const result = await runLocalTerraformAllowingMissingState(environment, ["state", "list"]);

  if (!result.ok) {
    return { available: false, reason: result.error };
  }

  return result.stdout
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .sort();
}

export async function getStateSummary(environment: McpInfraEnvironment): Promise<unknown> {
  const resources = await listManagedResources(environment);

  if (!Array.isArray(resources)) {
    return resources;
  }

  return {
    managedResourceCount: resources.length,
    resources
  };
}

export async function createTerraformPlan(environment: McpInfraEnvironment, kind: TerraformPlanKind): Promise<TerraformPlanResult> {
  await runLocalTerraform(environment, ["init", "-backend=false"]);
  const planPath = await getPlanPath(environment, kind);
  const planArgs = kind === "destroy" ? ["plan", "-destroy", "-input=false", "-no-color", "-out", planPath] : ["plan", "-input=false", "-no-color", "-out", planPath];

  const plan = await runLocalTerraform(environment, planArgs);
  const show = await runLocalTerraform(environment, ["show", "-no-color", planPath]);
  const parsed = parsePlanCounts(show.stdout);

  return {
    kind,
    planPath,
    summary: plan.stdout.trim(),
    ...parsed,
    planText: show.stdout
  };
}

export async function showTerraformPlan(environment: McpInfraEnvironment, kind: TerraformPlanKind): Promise<string> {
  const planPath = await getPlanPath(environment, kind);
  const result = await runLocalTerraform(environment, ["show", "-no-color", planPath]);

  return result.stdout;
}

export async function estimateTerraformChanges(environment: McpInfraEnvironment, kind: TerraformPlanKind): Promise<Omit<TerraformPlanResult, "summary" | "planText">> {
  const planText = await showTerraformPlan(environment, kind);

  return {
    kind,
    planPath: await getPlanPath(environment, kind),
    ...parsePlanCounts(planText)
  };
}

export async function applySavedTerraformPlan(environment: McpInfraEnvironment): Promise<TerraformCommandSummary> {
  const planPath = await getPlanPath(environment, "normal");

  return runLocalTerraform(environment, ["apply", "-input=false", "-no-color", planPath]);
}

export async function destroyWithSavedTerraformPlan(environment: McpInfraEnvironment): Promise<TerraformCommandSummary> {
  const planPath = await getPlanPath(environment, "destroy");

  return runLocalTerraform(environment, ["apply", "-input=false", "-no-color", planPath]);
}

async function getPlanPath(environment: McpInfraEnvironment, kind: TerraformPlanKind): Promise<string> {
  const planDir = join(environment.terraformRoot, ".mcp-plans");
  await mkdir(planDir, { recursive: true });

  return join(planDir, kind === "destroy" ? "destroy.tfplan" : "normal.tfplan");
}

async function runLocalTerraform(environment: McpInfraEnvironment, args: string[]): Promise<TerraformCommandSummary> {
  const result = await runCommand("terraform", [`-chdir=${environment.terraformRoot}`, ...args], environment.commandTimeoutMs);

  return {
    command: result.command,
    args: result.args,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

async function runLocalTerraformAllowingMissingState(
  environment: McpInfraEnvironment,
  args: string[]
): Promise<{ ok: true; stdout: string } | { ok: false; error: string }> {
  try {
    const result = await runLocalTerraform(environment, args);

    return { ok: true, stdout: result.stdout };
  } catch (error) {
    if (error instanceof CommandExecutionError) {
      return { ok: false, error: [error.stderr, error.stdout, error.message].filter(Boolean).join("\n").trim() };
    }

    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function parsePlanCounts(planText: string): { add: number; change: number; destroy: number } {
  const match = /Plan:\s+(\d+)\s+to add,\s+(\d+)\s+to change,\s+(\d+)\s+to destroy\./.exec(planText);

  if (!match) {
    return { add: 0, change: 0, destroy: 0 };
  }

  return {
    add: Number.parseInt(match[1] ?? "0", 10),
    change: Number.parseInt(match[2] ?? "0", 10),
    destroy: Number.parseInt(match[3] ?? "0", 10)
  };
}

export async function readTerraformReadme(environment: McpInfraEnvironment): Promise<string> {
  return readFile(join(environment.terraformRoot, "README.md"), "utf8");
}
