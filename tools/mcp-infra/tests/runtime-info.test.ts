import { describe, expect, it } from "vitest";

import { getRuntimeInfo } from "../src/index.js";
import { getServerStatus } from "../src/server.js";

describe("getRuntimeInfo", () => {
  it("returns local stdio runtime metadata", () => {
    expect(getRuntimeInfo()).toEqual({
      name: "devorecruiter-mcp-infra",
      mode: "local",
      transport: "stdio"
    });
  });
});

describe("getServerStatus", () => {
  it("reports that Phase 2 has initialized the MCP server", () => {
    expect(getServerStatus()).toBe("initialized");
  });
});
