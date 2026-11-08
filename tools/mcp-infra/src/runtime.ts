export type RuntimeInfo = {
  name: string;
  mode: "local";
  transport: "stdio";
};

export function getRuntimeInfo(): RuntimeInfo {
  return {
    name: "devorecruiter-mcp-infra",
    mode: "local",
    transport: "stdio"
  };
}
