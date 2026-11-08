import { getEnvironment } from "../src/config/environment.js";
import { runSshCommand } from "../src/utils/ssh.js";

type Step = {
  name: string;
  command: string;
};

const steps: Step[] = [
  {
    name: "install_helm_if_missing",
    command: "command -v helm || sudo snap install helm --classic"
  },
  {
    name: "helm_version",
    command: "helm version --short"
  },
  {
    name: "install_or_show_dynatrace_operator",
    command:
      "sudo env KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm status dynatrace-operator -n dynatrace || sudo env KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm install dynatrace-operator oci://public.ecr.aws/dynatrace/dynatrace-operator --create-namespace --namespace dynatrace --atomic"
  },
  {
    name: "operator_status",
    command: "sudo env KUBECONFIG=/etc/rancher/k3s/k3s.yaml helm status dynatrace-operator -n dynatrace"
  },
  {
    name: "operator_pods",
    command: "sudo k3s kubectl get pods -n dynatrace -o wide"
  },
  {
    name: "dynatrace_crds",
    command: "sudo k3s kubectl get crd | grep -Ei 'dynatrace|dynakube' || true"
  }
];

async function main(): Promise<void> {
  const environment = getEnvironment();
  environment.commandTimeoutMs = Math.max(environment.commandTimeoutMs, 180000);
  const results = [];

  for (const step of steps) {
    try {
      const result = await runSshCommand(environment, step.command);
      results.push({
        name: step.name,
        ok: true,
        stdout: result.stdout.trim(),
        stderr: result.stderr.trim()
      });
    } catch (error) {
      results.push({
        name: step.name,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
      break;
    }
  }

  console.log(JSON.stringify(results, null, 2));

  if (results.some(result => !result.ok)) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
