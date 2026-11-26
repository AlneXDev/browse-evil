// evil-v2: the normal Anomaly auto-update feed and background tick are disabled;
// updates come only from the evil GitHub release via `browsevil update`.
import { describe, expect, test } from "bun:test"
import { autoUpdateStatus, describeAutoUpdate, updateAvailable } from "../src/update/auto-update.ts"

describe("evil auto-update", () => {
  test("background feed is off", () => {
    const status = autoUpdateStatus({ runtime: { kind: "binary", entry: "/bin/browsevil", version: "0.1.5" }, env: {} })
    expect(status.effective).toBe("off")
    expect(describeAutoUpdate(status)).toContain("evil GitHub release")
  })
  test("no normal-feed update offered", () => {
    expect(updateAvailable({ install: "binary", latest: "0.0.2", version: "0.1.5" })).toBe(false)
  })
})
