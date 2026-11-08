import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import { assertSafeDockerTag } from "../security/validation.js";

const DEV_ENVIRONMENT_DIR = join("environments", "dev");
const VALUES_FILE_PATTERN = /^([a-z0-9][a-z0-9-]*)-values\.yaml$/;

export type GitOpsImageSummary = {
  service: string;
  fileName: string;
  repository: string;
  tag: string;
};

export type GitOpsImageUpdatePlan = {
  service: string;
  fileName: string;
  repository: string;
  currentTag: string;
  nextTag: string;
  wouldChange: boolean;
};

export async function listGitOpsEnvironmentFiles(gitopsRoot: string): Promise<string[]> {
  const environmentPath = join(gitopsRoot, DEV_ENVIRONMENT_DIR);
  const files = await readdir(environmentPath);

  return files
    .filter(file => file.endsWith("-values.yaml") || file.endsWith(".yaml"))
    .sort();
}

export async function listGitOpsCharts(gitopsRoot: string): Promise<string[]> {
  const chartsPath = join(gitopsRoot, "charts");
  const entries = await readdir(chartsPath, { withFileTypes: true });

  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

export async function readGitOpsEnvironmentFile(gitopsRoot: string, fileName: string): Promise<string> {
  const safeFileName = basename(fileName);
  const allowedFiles = await listGitOpsEnvironmentFiles(gitopsRoot);

  if (!allowedFiles.includes(safeFileName)) {
    throw new Error(`GitOps environment file '${fileName}' is not allowed.`);
  }

  return readFile(join(gitopsRoot, DEV_ENVIRONMENT_DIR, safeFileName), "utf8");
}

export async function listGitOpsImageSummaries(gitopsRoot: string): Promise<GitOpsImageSummary[]> {
  const files = await listGitOpsEnvironmentFiles(gitopsRoot);
  const summaries = await Promise.all(
    files
      .filter(fileName => VALUES_FILE_PATTERN.test(fileName))
      .map(async fileName => {
        const content = await readGitOpsEnvironmentFile(gitopsRoot, fileName);
        const image = parseImageBlock(content);
        const service = fileName.replace(/-values\.yaml$/, "");

        return image
          ? {
              service,
              fileName,
              ...image
            }
          : undefined;
      })
  );

  return summaries.filter((summary): summary is GitOpsImageSummary => Boolean(summary));
}

export async function planGitOpsImageUpdate(gitopsRoot: string, service: string, nextTag: string): Promise<GitOpsImageUpdatePlan> {
  assertSafeDockerTag(nextTag);

  const fileName = getValuesFileName(service);
  const content = await readGitOpsEnvironmentFile(gitopsRoot, fileName);
  const image = parseImageBlock(content);

  if (!image) {
    throw new Error(`No image.repository and image.tag block found in '${fileName}'.`);
  }

  return {
    service,
    fileName,
    repository: image.repository,
    currentTag: image.tag,
    nextTag,
    wouldChange: image.tag !== nextTag
  };
}

export async function updateGitOpsImageTag(gitopsRoot: string, service: string, nextTag: string): Promise<GitOpsImageUpdatePlan> {
  const plan = await planGitOpsImageUpdate(gitopsRoot, service, nextTag);

  if (!plan.wouldChange) {
    return plan;
  }

  const content = await readGitOpsEnvironmentFile(gitopsRoot, plan.fileName);
  const updated = content.replace(
    /(^image:\r?\n(?:^[ \t].*\r?\n)*?^[ \t]+tag:\s*)(["']?)([^"'\r\n#]+)(["']?)(.*)$/m,
    `$1"${
      plan.nextTag
    }"$5`
  );

  if (updated === content) {
    throw new Error(`Unable to update image.tag in '${plan.fileName}'.`);
  }

  await writeFile(join(gitopsRoot, DEV_ENVIRONMENT_DIR, plan.fileName), updated, "utf8");

  return plan;
}

function getValuesFileName(service: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(service)) {
    throw new Error(`GitOps service '${service}' is not safe.`);
  }

  return `${service}-values.yaml`;
}

function parseImageBlock(content: string): { repository: string; tag: string } | undefined {
  const imageBlock = /^image:\r?\n((?:^[ \t]+.*(?:\r?\n|$))+)/m.exec(content)?.[1];

  if (!imageBlock) {
    return undefined;
  }

  const repository = /^[ \t]+repository:\s*["']?([^"'\r\n#]+)["']?/m.exec(imageBlock)?.[1]?.trim();
  const tag = /^[ \t]+tag:\s*["']?([^"'\r\n#]+)["']?/m.exec(imageBlock)?.[1]?.trim();

  return repository && tag ? { repository, tag } : undefined;
}
