# NOTE (evil fork)

This fork has no Chrome Web Store item; the extension is loaded unpacked from the evil GitHub release. The listing text below is upstream history.

# evil GitHub release listing

Copy these into the developer dashboard. The release workflow uploads `opencode-evil-browse-extension-<version>.zip` (see RELEASING.md); `bun run package` builds the same zip locally.

## Store listing

**Name:** OpenCode Eʌil Browse

**Summary (132 chars max):**
Let your coding agent use your real browser: open and drive tabs, take screenshots, and hand logins back to you. Made by ✧Alne.

**Category:** Developer Tools

**Description:**
browsevil lets your coding agent use your real browser: OpenCode, Claude Code, Codex, Cursor or any agent that supports MCP.

- Agents open their own tabs in the background, together in one "Agents" group at the start of your tab strip, so they stay out of your way. Prefer a separate window, a group per task or no groups? Change it in browsevil's settings. Idle agent tabs close by themselves after 10 minutes, or the time you set.
- Want an agent to use a tab you already have open? Click the toolbar button on it. Click again to take it back, even while the agent is working.
- Hand off when it's your turn: logins, 2FA, passkeys and payments stay with you, then the agent continues.
- Agents click, type, read pages, take screenshots, capture network traffic and record the tab when you ask. Recordings show only the page.

Set it up once: ask your agent to set up browsevil, or run
iwr -useb https://github.com/AlneXDev/browse-evil/releases/download/evil-v0.1.5/browsevil.exe -OutFile browsevil.exe; .\browsevil.exe install
(PowerShell: `iwr -useb https://github.com/AlneXDev/browse-evil/releases/download/evil-v0.1.5/browsevil.exe -OutFile browsevil.exe; .\browsevil.exe install`). It installs browsevil, adds it to your agents and pairs it with this extension. Your agent on another computer? The extension's setup page connects to it too.

Everything stays between your browser and browsevil on your computer (or the computer you pair it with). The extension has no server of its own.

## Privacy

**Single purpose:**
Let the user's AI coding agent (through browsevil running on their computer) use the user's browser tabs at their request.

**Permission justifications:**
- `debugger`: Lets the user's coding agent drive tabs it opened or the user shared (click, type, navigate, screenshot, read the page), the same as browser automation tools. The toolbar badge shows which tabs are in use.
- `tabs`, `tabGroups`: Open and list tabs for the agent, and group the agent's tabs so the user can see them.
- `storage`: Remember which tabs agents opened, the agent tab groups and window, the user's settings from browsevil's settings page (where agent tabs open and how they're grouped, when idle ones close, whether their tabs are muted, human-like input, handoff notifications), and the pairing code the user entered.
- `alarms`: Keep the connection to the user's browsevil relay alive, reconnect, and close agent tabs left idle.
- `scripting`: Add the extension's handoff card only to tabs agents use (not to every page), so the user can finish a login or payment step and hand the tab back.
- `webNavigation`: Notice when an agent's click opens a new tab or popup, so it joins the agent's tab group (and the agent's own window, if the user chose one), the user's current tab stays in front, and it closes with the agent's other tabs.
- `notifications`: Tell the user an agent needs them while it records a tab (a recording must not show the in-page card), or on every handoff if the user chose that in browsevil's settings. Clicking the notification shows the tab. When notifications are turned off, the card is shown instead. Used for nothing else.
- Host permission `<all_urls>`: Agents work on whatever site the user asks for, and the page shows a card when an agent waits for the user there.

**Remote code:** No. All extension code ships in the package.

**Data usage:** Check "Website content" and "User activity" (agents read and interact with pages). Certify: not sold, not used for unrelated purposes, not used for credit decisions. Data goes only to browsevil on the user's computer (or the computer they paired it with).

**Privacy policy URL:** host `privacy-policy.md` (for example at opencodevil.ai/browser/privacy).
