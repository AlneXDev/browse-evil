// The one-line browsevil installers (served at opencodevil.ai/browsevil/install and install.ps1). This browser's own computer
// gets the lines for its system; another computer's relay is usually a Mac or Linux box, so it gets the shell ones.
const SHELL = "Download browsevil from https://github.com/AlneXDev/browse-evil/releases/tag/evil-v0.1.5 and run ./browsevil install"
const POWERSHELL = "iwr -useb https://github.com/AlneXDev/browse-evil/releases/download/evil-v0.1.5/browsevil.exe -OutFile browsevil.exe; .\\browsevil.exe install"
const NPM = "Download browsevil.exe from https://github.com/AlneXDev/browse-evil/releases/tag/evil-v0.1.5 and run .\\browsevil.exe install"

const windows = typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)

/** One way to install browsevil: the word in the picker, the line to run, and what step 1 says while it's picked. */
export type InstallMethod = {
  id: string
  label: string
  command: string
  title: string
}

const TERMINAL = "Run this in your terminal"

const curl: InstallMethod = { id: "curl", label: "curl", command: SHELL, title: TERMINAL }
const powershell: InstallMethod = { id: "powershell", label: "PowerShell", command: POWERSHELL, title: "Run this in PowerShell" }
const npm: InstallMethod = { id: "npm", label: "GitHub release", command: NPM, title: TERMINAL }
const remoteCurl: InstallMethod = { ...curl, command: `${SHELL} -s -- --remote` }
const remoteNpm: InstallMethod = { ...npm, command: `${NPM} --remote` }

/** Installs browsevil on this computer, the method that suits this system first. */
export const installMethods = windows ? [powershell, npm] : [curl, npm]

/** Installs browsevil on another computer and opens its relay to this one. */
export const remoteInstallMethods = [remoteCurl, remoteNpm]

export const installMethod = installMethods[0]!
export const remoteInstallMethod = remoteInstallMethods[0]!

/** Installs browsevil on this computer. */
export const installCommand = installMethod.command
