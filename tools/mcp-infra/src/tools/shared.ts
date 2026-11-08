export type McpTextResult = {
  content: {
    type: "text";
    text: string;
  }[];
};

export function jsonResult(payload: unknown): McpTextResult {
  return textResult(JSON.stringify(payload, null, 2));
}

export function textResult(text: string): McpTextResult {
  return {
    content: [
      {
        type: "text",
        text
      }
    ]
  };
}

export function readOnlyAnnotations() {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };
}

export function guardedMutationAnnotations() {
  return {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  };
}

export function destructiveMutationAnnotations() {
  return {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false
  };
}
