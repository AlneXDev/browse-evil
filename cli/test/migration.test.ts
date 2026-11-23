import { afterEach, describe, expect, test } from "bun:test"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parse } from "jsonc-parser"
import { home as userHome } from "../src/setup/environment.ts"
import { legacyRootsLeft, legacyRuntime } from "../src/setup/legacy.ts"
import { adoptLegacyRuntime } from "../src/setup/legacy-runtime.ts"
import { migrateLegacy } from "../src/setup/migrate.ts"
import { node, oldRuntimeHome, withoutHomeOverride } from "./support/legacy-runtime.ts"

const homes: string[] = []
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true })
})

const write = (file: string, text: string, mode = 0o644) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, { mode })
  fs.chmodSync(file, mode)
}

/** A realistic pre-XDG install: ~/.browsevil with settings, tokens, logs, the executable and old versions, plus the
 * opencodevil-browser data root that the last release wrote. */
function legacyHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "browsevil-migrate-"))
  homes.push(home)
  const old = path.join(home, ".browsevil")
  const oldData = path.join(home, ".local", "share", "opencodevil-browser")
  write(path.join(old, "settings.json"), JSON.stringify({ entry: path.join(old, "bin", "browsevil"), version: "0.0.9" }))
  write(path.join(old, "config.json"), JSON.stringify({ hostname: "127.0.0.1" }))
  write(path.join(old, "browser-tokens.json"), JSON.stringify({ profile: { token: "x", pairedAt: 1 } }), 0o600)
  write(path.join(old, "sessions.json"), JSON.stringify({ version: 1, sessions: [] }))
  write(path.join(old, "logs", "relay.log"), "relay started\n")
  write(path.join(old, "bin", "browsevil"), "#!/bin/sh\necho old\n", 0o755)
  write(path.join(old, "versions", "0.0.9", "browsevil"), "old version\n")
  write(path.join(oldData, "relay-token"), "token\n", 0o600)
  write(path.join(oldData, "secrets", "github.json"), "{\"profile\":\"private\"}\n", 0o600)
  write(path.join(oldData, "bin", "opencodevil-browser.mjs"), "// shim\n")
  return { home, old, oldData }
}

describe("stored credentials of removed features", () => {
  test("migration removes site secret and secret profile folders, idempotently and without throwing", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "browsevil-remove-secrets-"))
    homes.push(home)
    const data = path.join(home, ".local", "share", "browsevil")
    write(path.join(data, "site-secrets", "example.json"), "{}\n", 0o600)
    write(path.join(data, "secrets", "profile.json"), "{}\n", 0o600)
    write(path.join(data, "relay-token"), "token\n", 0o600)
    const previousHome = process.env.OPENCODE_BROWSEVIL_HOME
    delete process.env.OPENCODE_BROWSEVIL_HOME
    try {
      migrateLegacy(home)
      expect(fs.existsSync(path.join(data, "site-secrets"))).toBe(false)
      expect(fs.existsSync(path.join(data, "secrets"))).toBe(false)
      expect(fs.readFileSync(path.join(data, "relay-token"), "utf8")).toBe("token\n")
      // A second run is a no-op and a missing data root is fine.
      expect(migrateLegacy(home)).toMatchObject({ moved: 0, rewritten: 0, removed: [] })
    } finally {
      if (previousHome === undefined) delete process.env.OPENCODE_BROWSEVIL_HOME
      else process.env.OPENCODE_BROWSEVIL_HOME = previousHome
    }
  })
})

describe("migration from the old layouts", () => {
  test("moves every file, rewrites agent entries, deletes the old roots, and is idempotent", () => {
    const { home, old, oldData } = legacyHome()
    const oldBinary = path.join(old, "bin", "browsevil")
    const claude = path.join(home, ".claude.json")
    write(claude, JSON.stringify({ mcpServers: { browsevil: { type: "stdio", command: oldBinary, args: ["mcp"] } } }))
    const opencodevil = path.join(home, ".config", "opencodevil", "opencodevil.json")
    write(opencodevil, JSON.stringify({
      mcp: { servers: { browsevil: { type: "local", command: ["/usr/bin/node", path.join(oldData, "bin", "opencodevil-browser.mjs"), "mcp"] } } },
    }))
    const previousHome = process.env.OPENCODE_BROWSEVIL_HOME
    delete process.env.OPENCODE_BROWSEVIL_HOME
    try {
      const first = migrateLegacy(home)
      expect(first.moved).toBeGreaterThan(0)
      expect(first.rewritten).toBeGreaterThanOrEqual(2)
      expect(fs.existsSync(old)).toBe(false)
      expect(fs.existsSync(oldData)).toBe(false)

      const config = path.join(home, ".config", "browsevil")
      const data = path.join(home, ".local", "share", "browsevil")
      const state = path.join(home, ".local", "state", "browsevil")
      expect(JSON.parse(fs.readFileSync(path.join(config, "settings.json"), "utf8")).version).toBe("0.0.9")
      expect(JSON.parse(fs.readFileSync(path.join(config, "settings.json"), "utf8")).entry).toBe(path.join(home, ".local", "bin", process.platform === "win32" ? "browsevil.exe" : "browsevil"))
      expect(fs.readFileSync(path.join(config, "config.json"), "utf8")).toContain("127.0.0.1")
      expect(fs.existsSync(path.join(data, "browser-tokens.json"))).toBe(true)
      expect(fs.existsSync(path.join(data, "sessions.json"))).toBe(true)
      expect(fs.readFileSync(path.join(data, "relay-token"), "utf8")).toBe("token\n")
      // Stored credentials of removed features are not carried over.
      expect(fs.existsSync(path.join(data, "secrets"))).toBe(false)
      expect(fs.readFileSync(path.join(state, "logs", "relay.log"), "utf8")).toContain("relay started")
      expect(fs.existsSync(path.join(home, ".local", "bin", "browsevil"))).toBe(true)
      expect(fs.existsSync(path.join(home, ".local", "lib"))).toBe(false)
      if (process.platform !== "win32") {
        expect(fs.statSync(path.join(data, "relay-token")).mode & 0o777).toBe(0o600)
        expect(fs.statSync(path.join(home, ".local", "bin", "browsevil")).mode & 0o777).toBe(0o755)
      }
      const newBinary = path.join(home, ".local", "bin", process.platform === "win32" ? "browsevil.exe" : "browsevil")
      expect(JSON.parse(fs.readFileSync(claude, "utf8")).mcpServers.browsevil).toEqual({ type: "stdio", command: newBinary, args: ["mcp"] })
      expect(JSON.parse(fs.readFileSync(opencodevil, "utf8")).mcp.servers.browsevil.command).toEqual(["browsevil", "mcp"])

      // A second run finds nothing to move or rewrite.
      expect(migrateLegacy(home)).toMatchObject({ moved: 0, rewritten: 0, removed: [] })
    } finally {
      if (previousHome === undefined) delete process.env.OPENCODE_BROWSEVIL_HOME
      else process.env.OPENCODE_BROWSEVIL_HOME = previousHome
    }
  })

  test("keeps ~/.browsevil when an agent config still points at the old binary", () => {
    const { home, old } = legacyHome()
    // A malformed agent config can't be rewritten safely; deleting the executable would leave it pointing at nothing.
    write(path.join(home, ".claude.json"), `{"mcpServers":{"browsevil":{"command":${JSON.stringify(path.join(old, "bin", "browsevil"))}`)
    const previousHome = process.env.OPENCODE_BROWSEVIL_HOME
    delete process.env.OPENCODE_BROWSEVIL_HOME
    try {
      migrateLegacy(home)
      expect(fs.existsSync(path.join(old, "bin", "browsevil"))).toBe(true)
      expect(fs.readFileSync(path.join(home, ".claude.json"), "utf8")).toContain(path.join(old, "bin", "browsevil"))
      // The next run still retries instead of treating the move as finished.
      expect(migrateLegacy(home).removed).not.toContain(old)
      expect(fs.existsSync(path.join(old, "bin", "browsevil"))).toBe(true)
    } finally {
      if (previousHome === undefined) delete process.env.OPENCODE_BROWSEVIL_HOME
      else process.env.OPENCODE_BROWSEVIL_HOME = previousHome
    }
  })

  test("never overwrites a file the new version already has", () => {
    const { home, old } = legacyHome()
    write(path.join(home, ".config", "browsevil", "settings.json"), "{\"entry\":\"new\"}\n")
    const previousHome = process.env.OPENCODE_BROWSEVIL_HOME
    delete process.env.OPENCODE_BROWSEVIL_HOME
    try {
      migrateLegacy(home)
      expect(fs.readFileSync(path.join(home, ".config", "browsevil", "settings.json"), "utf8")).toBe("{\"entry\":\"new\"}\n")
      expect(fs.existsSync(old)).toBe(false)
    } finally {
      if (previousHome === undefined) delete process.env.OPENCODE_BROWSEVIL_HOME
      else process.env.OPENCODE_BROWSEVIL_HOME = previousHome
    }
  })
})

describe("migration after the old self-managed runtime was taken over", () => {
  const takenOver = Date.parse("2026-11-08T16:00:00Z")
  /** The old runtime once a relay from a current install took it over (legacy-runtime.ts). */
  function takenOverHome() {
    const fixture = oldRuntimeHome(homes)
    adoptLegacyRuntime(legacyRuntime(fixture.home), fixture.runtime, takenOver)
    return fixture
  }

  test("a dev extension the browser loads from the old folder keeps loading, from the folder updates replace", () => {
    const { home, oldData } = takenOverHome()
    write(path.join(oldData, "extension", "manifest.json"), JSON.stringify({ version: "1" }))
    const loaded = path.join(oldData, "extension", "manifest.json")
    const folder = path.join(home, ".cache", "browsevil", "extension")
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 60_000))
    expect(fs.lstatSync(path.join(oldData, "extension")).isSymbolicLink()).toBe(true)
    // A dev relay updates the extension by swapping the cache folder; the path the browser loaded sees it.
    fs.renameSync(folder, `${folder}-old`)
    write(path.join(folder, "manifest.json"), JSON.stringify({ version: "2" }))
    expect(JSON.parse(fs.readFileSync(loaded, "utf8")).version).toBe("2")
    // Past the grace period everything else in the old folder goes, the link stays, and migration has nothing left.
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 11 * 60_000))
    expect(fs.readdirSync(oldData)).toEqual(["extension"])
    expect(JSON.parse(fs.readFileSync(loaded, "utf8")).version).toBe("2")
    expect(legacyRootsLeft(home)).toBe(false)
  })

  test("a run stopped before its extension link was in place is finished by the next one", () => {
    const { home, oldData } = takenOverHome()
    // The folder already moved to the cache and the old path is gone, but the link never got renamed into place.
    const folder = path.join(home, ".cache", "browsevil", "extension")
    write(path.join(folder, "manifest.json"), JSON.stringify({ version: "1" }))
    fs.symlinkSync(folder, path.join(oldData, "extension.link-2147483646"), "junction")
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 11 * 60_000))
    expect(fs.readdirSync(oldData)).toEqual(["extension"])
    expect(fs.lstatSync(path.join(oldData, "extension")).isSymbolicLink()).toBe(true)
    expect(JSON.parse(fs.readFileSync(path.join(oldData, "extension", "manifest.json"), "utf8")).version).toBe("1")
  })

  test("browsevil entries in opencodevil.jsonc and in configs settings.json recorded move to `browsevil mcp` before the shim goes", () => {
    const { home, oldData, shim, opencodevil } = takenOverHome()
    fs.rmSync(opencodevil)
    const jsonc = path.join(home, ".config", "opencodevil", "opencodevil.jsonc")
    const entry = { type: "local", command: [node, shim, "mcp"] }
    write(jsonc, `{\n  // mine\n  "mcp": { "servers": { "browsevil": ${JSON.stringify(entry)} } }\n}\n`)
    const project = path.join(home, "project", ".opencodevil", "opencodevil.jsonc")
    write(project, JSON.stringify({ mcp: { servers: { browsevil: entry } } }))
    write(path.join(oldData, "settings.json"), JSON.stringify({ opencodevilConfigs: [project] }))
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 11 * 60_000))
    for (const file of [jsonc, project]) {
      const server = parse(fs.readFileSync(file, "utf8")).mcp.servers.browsevil
      expect(server.command).toEqual(["browsevil", "mcp"])
      expect(server).toMatchObject({ cwd: userHome, pool: true })
    }
    expect(fs.readFileSync(jsonc, "utf8")).toContain("// mine")
    expect(fs.existsSync(oldData)).toBe(false)
  })

  test("a file deleted from the new folders during the grace period stays deleted", () => {
    const { home, oldData } = takenOverHome()
    write(path.join(oldData, "browser-tokens.json"), "{}\n", 0o600)
    const secret = path.join(home, ".local", "share", "browsevil", "browser-tokens.json")
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 60_000))
    expect(fs.existsSync(secret)).toBe(true)
    fs.rmSync(secret)
    withoutHomeOverride(() => migrateLegacy(home, takenOver + 2 * 60_000))
    expect(fs.existsSync(secret)).toBe(false)
    // The shim still finds current.json meanwhile.
    expect(fs.existsSync(path.join(oldData, "runtime", "current.json"))).toBe(true)
  })
})
