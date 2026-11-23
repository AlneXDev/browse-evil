// The self-managed runtime releases before 0.0.11 left, for the takeover and migration tests.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

export const node = Bun.which("node") ?? "node"

/** The old relay's token, in the format the relay accepts (one it doesn't, it replaces). */
export const relayToken = "old-relay-token-aaaaaaaaaaaaaaaaaaaaaaaaaaa"

export const write = (file: string, text: string, mode = 0o644) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, { mode })
  fs.chmodSync(file, mode)
}

/** A CLI stand-in: prints who it is for a command, or answers every MCP request with it. */
export const fakeCli = (label: string) => `import { createInterface } from "node:readline"
const info = { label: ${JSON.stringify(label)}, argv1: process.argv[1], args: process.argv.slice(2), home: process.env.OPENCODE_BROWSEVIL_HOME ?? null }
if (process.argv[2] !== "mcp") {
  console.log(JSON.stringify(info))
  process.exit(0)
}
createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line)
  if (message.id !== undefined) process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: info }) + "\\n")
})
`

/**
 * A home with 0.0.15-dev.108 under runtime/versions run by the old shim (the real one, fixtures/legacy-shim.mjs), a
 * relay token, an opencodevil entry that runs the shim with an absolute node as old installs wrote it, and npm's global
 * package of a current release beside it (a stand-in CLI until a test installs a real build there).
 */
export function oldRuntimeHome(homes: string[]) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "browsevil-takeover-"))
  homes.push(home)
  const oldData = path.join(home, ".local", "share", "opencodevil-browser")
  const shim = path.join(oldData, "bin", "opencodevil-browser.mjs")
  write(shim, fs.readFileSync(path.join(import.meta.dir, "..", "fixtures", "legacy-shim.mjs"), "utf8"), 0o755)
  write(path.join(oldData, "runtime", "current.json"), JSON.stringify({ version: "0.0.15-dev.108", previous: "0.0.11-dev.75", channel: "dev" }), 0o600)
  const oldEntry = path.join(oldData, "runtime", "versions", "0.0.15-dev.108", "node_modules", "@opencodevil", "browsevil", "dist", "cli.mjs")
  write(path.join(path.dirname(path.dirname(oldEntry)), "package.json"), JSON.stringify({ name: "@opencode/browsevil", version: "0.0.15-dev.108" }))
  write(oldEntry, fakeCli("0.0.15-dev.108"))
  write(path.join(oldData, "relay-token"), `${relayToken}\n`, 0o600)
  const packageDir = path.join(home, "global", "lib", "node_modules", "@opencodevil", "browsevil")
  const current = path.join(packageDir, "dist", "cli.mjs")
  write(path.join(packageDir, "package.json"), JSON.stringify({ name: "@opencode/browsevil", version: "0.0.16-dev.130" }))
  write(current, fakeCli("0.0.16-dev.130"))
  const opencodevil = path.join(home, ".config", "opencodevil", "opencodevil.json")
  write(opencodevil, JSON.stringify({ mcp: { servers: { browsevil: { type: "local", command: [node, shim, "mcp"] } } } }))
  const runtime = { kind: "npm" as const, entry: current, version: "0.0.16-dev.130" }
  return { home, oldData, shim, oldEntry, packageDir, current, opencodevil, runtime }
}

/** Runs `run` with OPENCODE_BROWSEVIL_HOME unset, as migration needs, and restores it after (once a promise settles). */
export function withoutHomeOverride<T>(run: () => T): T {
  const previous = process.env.OPENCODE_BROWSEVIL_HOME
  const restore = () => {
    if (previous === undefined) delete process.env.OPENCODE_BROWSEVIL_HOME
    else process.env.OPENCODE_BROWSEVIL_HOME = previous
  }
  delete process.env.OPENCODE_BROWSEVIL_HOME
  let result: T
  try {
    result = run()
  } catch (error) {
    restore()
    throw error
  }
  if (result instanceof Promise) return result.finally(restore) as T
  restore()
  return result
}
