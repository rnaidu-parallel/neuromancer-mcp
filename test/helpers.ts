/**
 * helpers.ts — shared test utilities (not a *.test.ts, so the runner skips it).
 *
 * connectPair() wires a real McpServer (built by createServer, the exact production
 * surface) to a real Client over the SDK's in-memory transport — so tool calls go
 * through the same registration/validation path as a deployed server, with no network.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

export interface ConnectedPair {
  client: Client;
  close: () => Promise<void>;
}

export async function connectPair(): Promise<ConnectedPair> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  const client = new Client({ name: "neuromancer-mcp-test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

/** First text block of a tool result, for content assertions. */
export function textOf(result: { content?: Array<{ type: string; text?: string }> }): string {
  const block = result.content?.find((c) => c.type === "text");
  return block?.text ?? "";
}

/** Run `fn` with console.warn/error silenced (notify/contact_me log on the dry-run path). */
export async function quiet<T>(fn: () => Promise<T>): Promise<T> {
  const warn = console.warn;
  const error = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.warn = warn;
    console.error = error;
  }
}
