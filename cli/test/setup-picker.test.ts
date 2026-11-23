import { describe, expect, test } from "bun:test"
import { stripVTControlCharacters } from "node:util"
import { agentRow, agentSummary, type AgentOption } from "../src/setup/agent-picker.ts"

const plain = (text: string) => stripVTControlCharacters(text)
const opencodevil: AgentOption = { value: "opencodevil", label: "OpenCode" }
const claude: AgentOption = { value: "claude", label: "Claude Code" }

describe("agent picker", () => {
  test("the focused row gets the pointer and a bright name; others dim", () => {
    expect(plain(agentRow(opencodevil, true, ["opencodevil"]))).toBe("❯ ◼ OpenCode")
    expect(plain(agentRow(opencodevil, false, ["opencodevil"]))).toBe("  ◼ OpenCode")
    expect(plain(agentRow(claude, false, []))).toBe("  ◻ Claude Code")
  })

  test("the collapsed summary names the picked agents, in the order shown, or none", () => {
    expect(agentSummary(["OpenCode", "Claude Code"])).toBe("OpenCode, Claude Code")
    expect(agentSummary([])).toBe("none")
  })
})
