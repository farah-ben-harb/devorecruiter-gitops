import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { getEnvironment } from "../src/config/environment.js";
import { createMcpServer } from "../src/server.js";
import { runSshCommand } from "../src/utils/ssh.js";

type ToolCallResult = Awaited<ReturnType<Client["callTool"]>>;

function firstText(result: ToolCallResult): string {
  const content = (result as { content?: unknown }).content;

  if (!Array.isArray(content)) {
    throw new Error("Expected MCP tool result content to be an array.");
  }

  const first = content[0] as { type?: unknown; text?: unknown } | undefined;

  if (first?.type !== "text" || typeof first.text !== "string") {
    throw new Error("Expected first MCP tool result item to be text.");
  }

  return first.text;
}

async function callJson<T>(client: Client, name: string, args?: Record<string, unknown>): Promise<T> {
  const result = await client.callTool({
    name,
    ...(args ? { arguments: args } : {})
  });

  return JSON.parse(firstText(result)) as T;
}

async function runOptionalSshCheck(command: string): Promise<{ command: string; ok: boolean; stdout: string; stderr: string }> {
  const environment = getEnvironment();

  try {
    const result = await runSshCommand(environment, command);

    return {
      command,
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim()
    };
  } catch (error) {
    return {
      command,
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main(): Promise<void> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "dynatrace-readonly-validator", version: "0.1.0" });
  const server = createMcpServer();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const dynatraceStatus = await callJson(client, "dynatrace_connection_status");
    const monitoringPlan = await callJson<{ target: string; kubernetesObjects: string[] }>(client, "plan_monitoring_configuration", {
      target: "kubernetes"
    });
    const checks = await Promise.all([
      runOptionalSshCheck("sudo k3s kubectl get ns | grep -i dynatrace || true"),
      runOptionalSshCheck("sudo k3s kubectl get crd | grep -Ei 'dynatrace|dynakube' || true"),
      runOptionalSshCheck("sudo k3s kubectl get pods -A -o wide | grep -i dynatrace || true"),
      runOptionalSshCheck("sudo k3s kubectl get dynakube -A 2>&1 || true"),
      runOptionalSshCheck("sudo k3s kubectl get secret default -n dynatrace 2>&1 || true"),
      runOptionalSshCheck("systemctl list-units --type=service --all | grep -i dynatrace || true"),
      runOptionalSshCheck("ps -eo pid,comm,args | grep -Ei 'dynatrace|oneagent' | grep -v grep || true"),
      runOptionalSshCheck("test -d /opt/dynatrace && find /opt/dynatrace -maxdepth 3 -type d | head -50 || true"),
      runOptionalSshCheck("test -d /var/lib/dynatrace && find /var/lib/dynatrace -maxdepth 3 -type d | head -50 || true")
    ]);

    const evidence = {
      dynatraceApi: dynatraceStatus,
      plannedKubernetesObjects: monitoringPlan.kubernetesObjects,
      clusterEvidence: {
        namespaceFound: checks[0]?.stdout.length ? true : false,
        crdFound: checks[1]?.stdout.length ? true : false,
        podFound: checks[2]?.stdout.length ? true : false,
        dynakubeOutput: checks[3]?.stdout ?? "",
        dynakubesRunning: (checks[3]?.stdout.match(/\bRunning\b/g) ?? []).length >= 1,
        dynakubeSecretsFound:
          checks[4]?.stdout.includes("default") &&
          !checks[4]?.stdout.includes("NotFound")
      },
      hostEvidence: {
        serviceFound: checks[5]?.stdout.length ? true : false,
        processFound: checks[6]?.stdout.length ? true : false,
        optDirectoryFound: checks[7]?.stdout.length ? true : false,
        varDirectoryFound: checks[8]?.stdout.length ? true : false
      },
      checks
    };

    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
