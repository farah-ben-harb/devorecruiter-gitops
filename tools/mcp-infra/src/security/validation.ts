export function assertAllowedNamespace(namespace: string, allowedNamespace: string): void {
  if (namespace !== allowedNamespace) {
    throw new Error(`Namespace '${namespace}' is not allowed. Allowed namespace: '${allowedNamespace}'.`);
  }
}

export function assertAllowedArgoProject(project: string, allowedProject: string): void {
  if (project !== allowedProject) {
    throw new Error(`Argo CD project '${project}' is not allowed. Allowed project: '${allowedProject}'.`);
  }
}

export function assertSafeKubernetesName(name: string): void {
  if (!/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
    throw new Error(`Kubernetes resource name '${name}' is not safe.`);
  }
}

export function assertSafeDockerTag(tag: string): void {
  if (!/^[A-Za-z0-9_.-]{1,128}$/.test(tag)) {
    throw new Error(`Docker tag '${tag}' is not safe.`);
  }
}
