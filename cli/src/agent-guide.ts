import { COMPLIANCE } from "./compliance.ts"




/**
 * The agent guide, in one place: the MCP server's initialize instructions and `browsevil --help` use the same sentences,
 * so the two cannot drift. Keep the help version short and indented for a terminal.
 */
export const whatBrowseIs = `${COMPLIANCE}

browsevil drives the user's real Chrome-family browser through the browsevil extension, so logins, extensions and open tabs are already there and the user can watch or take over.`

export const inspectActVerify = `Use one loop: inspect, act, verify.
- Inspect with \`await snapshot()\` before choosing anything. Prefer the returned refs: \`await ref("e12").click()\`. Fall back to accessible locators (\`page.getByRole(...)\`, \`getByLabel(...)\`), then CSS.
- Act with the narrowest stable control, and keep dependent steps in one \`execute\` while transient UI is open.
- Verify with a fresh page read (\`page.url()\`, a heading, or a new snapshot). A click that returned, or a handoff the user acknowledged, is not proof the task succeeded.`

export const handoffAdvice = `When a login, 2FA, passkey, captcha or payment needs the user's own action, you may call \`handoff("what the user should do")\` and wait, or handle the step directly if you can. Pass \`start\` for an action that itself blocks. Continue when a step is doable; don't stall on a challenge just because it is interactive.`

export const sessionAdvice = `Each agent has its own current session when the client names the agent (OpenCode does), so bare calls don't land on another agent's page. When the client doesn't name agents, \`status\` reports \`sharedSession: true\` and all agents on this server share one current session, so when several (such as subagents) use it each should \`session_new\` its own and pass \`session\` on every call. When finished, \`session_reset\` (or \`session_delete\`) your own session; keep a session only when follow-up work is expected.`

/** The `browsevil --help` version of the guide: what browsevil is, one script, the loop, handoff, and cleanup. */
export const agentHelp = `${COMPLIANCE}

AGENT GUIDE
  browsevil drives the user's real Chrome-family browser through the browsevil extension, so logins,
  extensions and open tabs are already there and the user can watch or take over. Agents normally
  use the MCP server (\`browsevil mcp\`); the same loop works from a terminal.

  Write one Playwright script to a file and run it:
    browsevil execute --file script.js
  It receives browser, context, page, state, snapshot(), ref() and handoff(). \`return\` a value to
  get it back.

  Inspect, act, verify:
  - \`await snapshot()\` before choosing anything; click the returned refs (\`await ref("e12").click()\`).
  - Fall back to accessible locators (\`page.getByRole(...)\`), then CSS.
  - Keep dependent steps in one script while transient UI is open.
  - Verify with a fresh page read (\`page.url()\`, a heading, a new snapshot); a click that returned
    proves nothing.

  When a step needs the user's own action (login, 2FA, passkey, captcha, payment),
  you may call \`handoff("what to do")\` and wait, or handle the step directly.

  Pass \`--session\` to keep one session across calls. \`browsevil session reset\` or \`browsevil session delete\`
  it when done; keep a session only for follow-up work.`
