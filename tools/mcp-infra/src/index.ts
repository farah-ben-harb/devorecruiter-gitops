import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export { getRuntimeInfo } from "./runtime.js";
export type { RuntimeInfo } from "./runtime.js";
import { startStdioServer } from "./server.js";

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startStdioServer().catch(error => {
    // With STDIO MCP servers, stdout must stay reserved for JSON-RPC messages.
    console.error("MCP server failed to start:", error);
    process.exit(1);
  });
}
