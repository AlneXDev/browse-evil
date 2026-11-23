import { expect, test } from "bun:test"
import { installChrome, settle } from "../chrome-stub"
import { installFakeRelaySocket } from "../relay-stub"

// A scanned port whose relay completed the HMAC proof is the proven port: when it closes, it is just restarting, and a
// scan that finds it again must keep dialling it. It also stays in the form, but a code typed without a port still
// goes to 29698 (never a scan-only port). Run by ../isolated.test.ts.

const stub = installChrome()
;(globalThis as { __OPENCODE_BROWSEVIL_BUILD__?: string }).__OPENCODE_BROWSEVIL_BUILD__ = "test"

const PORT = 29699
const TOKEN = "proven-token-0123456789abcdefghijklmnopqrst"
const CODE = "ZZZZZZZZ"
const current = installFakeRelaySocket({ port: PORT, token: TOKEN })
globalThis.fetch = (async (input: string | URL) => {
  const url = String(input)
  if (url.endsWith("/relay-pairing.json")) return new Response("not found", { status: 404 })
  return new URL(url).pathname === "/version" && new URL(url).port === String(PORT)
    ? Response.json({ version: "0.0.2", instanceId: "relay-29699", pid: 1 })
    : new Response("not found", { status: 404 })
}) as unknown as typeof fetch

await stub.chrome.storage.local.set({
  agentRelayDiscoveredPort: PORT,
  agentRelayDiscoveredKind: "scan",
  agentRelayTokens: { [`127.0.0.1:${PORT}`]: TOKEN },
})
const { createAgentRelay } = await import("../../src/background/agent-relay")
const relay = createAgentRelay({ changed: () => {}, badgesChanged: () => {} })
const stored = async (key: string): Promise<unknown> => (await stub.chrome.storage.local.get(key))[key]
async function until(check: () => boolean | Promise<boolean>) {
  for (let i = 0; i < 400 && !(await check()); i++) {
    await settle()
    await Bun.sleep(5)
  }
  expect(await check()).toBe(true)
}

test("a proven scanned port survives its own close and a scan keeps dialling it", async () => {
  await until(() => relay.state().status === "connected")
  expect(await stored("agentRelayProvenPort")).toBe(PORT)
  expect(relay.state().relay).toEqual({ address: `localhost:${PORT}`, remote: false })
  const first = current()
  first.drop(1006)
  await until(() => current() !== first && relay.state().status === "connected")
  expect(current().url).toBe(`ws://127.0.0.1:${PORT}/extension`)
  // The scan neither cleared the discovered port nor moved it.
  expect(await stored("agentRelayDiscoveredPort")).toBe(PORT)
  expect(await stored("agentRelayProvenPort")).toBe(PORT)
})

test("a code-only submit while the proven port fails still goes to 29698", async () => {
  // The proven relay just failed; the code-only form sends no address, so the shown port must not become a hint.
  current().drop(1006)
  void relay.connectTo("", CODE)
  await until(async () => (await stored("agentRelayCodePort")) === 29698)
  expect(await stored("agentRelayCodePort")).toBe(29698)
  expect(await stored("agentRelayDiscoveredPort")).toBeUndefined()
})
