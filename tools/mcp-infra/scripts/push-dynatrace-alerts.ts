import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getEnvironment } from "../src/config/environment.js";

type DynatraceSettingsResponse = {
  id?: string;
  warning?: string[];
  error?: string[];
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const gitopsRoot = resolve(scriptDir, "..", "..", "..");
const alertsFile = resolve(gitopsRoot, "monitoring", "dynatrace", "dynatrace-alerts.json");

async function main(): Promise<void> {
  const environment = getEnvironment();
  const settingsApiUrl =
    environment.dynatraceSettingsApiUrl ??
    (environment.dynatraceEnvironmentUrl
      ? `${environment.dynatraceEnvironmentUrl}/api/v2/settings/objects`
      : undefined);

  if (!settingsApiUrl) {
    throw new Error(
      "Missing Dynatrace settings API URL. Set DYNATRACE_SETTINGS_API_URL or DYNATRACE_ENVIRONMENT_URL in tools/mcp-infra/.env."
    );
  }

  if (!environment.dynatraceApiToken) {
    throw new Error("Missing Dynatrace API token. Set DYNATRACE_API_TOKEN in tools/mcp-infra/.env.");
  }

  const body = await readFile(alertsFile, "utf8");
  const response = await fetch(settingsApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${environment.dynatraceApiToken}`,
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8"
    },
    body
  });

  const text = await response.text();
  let payload: DynatraceSettingsResponse | unknown = text;

  try {
    payload = text ? (JSON.parse(text) as DynatraceSettingsResponse) : {};
  } catch {
    payload = text;
  }

  console.log(
    JSON.stringify(
      {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        settingsApiUrl,
        response: payload
      },
      null,
      2
    )
  );

  if (!response.ok) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
