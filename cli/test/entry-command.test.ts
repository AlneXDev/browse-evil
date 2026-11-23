import { describe, expect, test } from "bun:test"
import path from "node:path"
import { entryCommand, entrySpawnCommand, type EntrySpawnOptions } from "../src/paths.ts"

const node = "/usr/bin/node"
const winPath = path.win32

const files = (...paths: string[]) => {
  const known = new Set(paths.map((file) => winPath.normalize(file)))
  return (file: string) => known.has(winPath.normalize(file))
}

const win = (entry: string, options: EntrySpawnOptions = {}) =>
  entrySpawnCommand(entry, node, {
    platform: "win32",
    checkout: false,
    pathModule: winPath,
    env: { PATH: "" },
    existsSync: () => false,
    ...options,
  })

describe("entry commands", () => {
  test("runs a script entry under the same node", () => {
    expect(entryCommand("/opt/browsevil/dist/cli.mjs", node)).toEqual([node, "/opt/browsevil/dist/cli.mjs"])
  })

  test("runs a binary entry itself", () => {
    expect(entryCommand("/home/me/.local/bin/browsevil", node)).toEqual(["/home/me/.local/bin/browsevil"])
  })

  test("leaves a bare command name to the shell elsewhere", () => {
    expect(entrySpawnCommand("browsevil", node, { platform: "linux", running: "/opt/browsevil/dist/cli.mjs" })).toEqual(["browsevil"])
  })

  test("leaves a windows shim alone on linux", () => {
    expect(entrySpawnCommand("browsevil.cmd", node, { platform: "linux" })).toEqual(["browsevil.cmd"])
  })

  test("resolves npm's global shim to the installed cli, not the running npx copy", () => {
    // npm puts browsevil.cmd and node_modules side by side in its global prefix; PATH may quote entries and leave gaps.
    const prefix = "C:\\Users\\me\\AppData\\Roaming\\npm"
    const installed = `${prefix}\\node_modules\\@opencodevil\\browsevil\\dist\\cli.mjs`
    const running = "C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\abc123\\node_modules\\@opencodevil\\browsevil\\dist\\cli.mjs"
    expect(
      win("browsevil", {
        running,
        env: { PATH: `C:\\empty;;"${prefix}";` },
        existsSync: files(`${prefix}\\browsevil.cmd`, installed),
      }),
    ).toEqual([node, installed])
  })

  test("resolves a bare browsevil.exe on PATH to the executable", () => {
    const executable = "C:\\tools\\browsevil.exe"
    expect(win("browsevil", { env: { PATH: "C:\\tools" }, existsSync: files(executable) })).toEqual([executable])
  })

  test("resolves a .cmd entry through its own folder", () => {
    const prefix = "C:\\Users\\me\\AppData\\Roaming\\npm"
    const shim = `${prefix}\\browsevil.cmd`
    const script = `${prefix}\\node_modules\\@opencodevil\\browsevil\\dist\\cli.mjs`
    expect(win(shim, { existsSync: files(shim, script) })).toEqual([node, script])
  })

  test("leaves a bare entry when nothing resolves and the running script is under _npx", () => {
    const running = "C:\\Users\\me\\AppData\\Local\\npm-cache\\_npx\\abc123\\node_modules\\@opencodevil\\browsevil\\dist\\cli.mjs"
    expect(win("browsevil", { running })).toEqual(["browsevil"])
  })

  test("does not fall back to a compiled binary's own executable", () => {
    expect(win("browsevil", { compiled: true, running: "C:\\Users\\me\\Downloads\\browsevil.exe" })).toEqual(["browsevil"])
  })

  test("falls back to a running script outside npx and checkouts", () => {
    const running = "C:\\Users\\me\\AppData\\Roaming\\npm\\node_modules\\@opencodevil\\browsevil\\dist\\cli.mjs"
    expect(win("browsevil", { running })).toEqual([node, running])
  })

  test("does not fall back to a checkout's running script", () => {
    expect(win("browsevil", { running: "/checkout/cli/dist/cli.mjs", checkout: true })).toEqual(["browsevil"])
  })
})
