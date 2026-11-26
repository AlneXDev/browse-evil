import { compareVersions } from "./auto-update.ts"
// evil-v2: updates come from the evil build's own GitHub release, never from Anomaly's feed.
import { createHash } from "node:crypto"
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { installedBinaryPath } from "../paths.ts"

export const GITHUB_REPO = "AlneXDev/browse-evil"
export const GITHUB_RELEASE_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`
const API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
const ASSET_NAME = "browsevil.exe"

type GithubAsset = {
  readonly name: string
  readonly browser_download_url: string
  readonly size?: number
  readonly digest?: string
}
type GithubRelease = { readonly tag_name: string; readonly assets: readonly GithubAsset[] }

export type GithubUpdate = {
  readonly latest: string
  readonly url: string
  readonly digest: string | undefined
  readonly size: number | undefined
}

const versionOf = (tag: string) => tag.replace(/^evil-v/, "").replace(/^v/, "")

/** The newest evil release, if it offers a Windows CLI newer than the running one. */
export async function checkGithubUpdate(current: string, fetchFn: typeof fetch = fetch): Promise<GithubUpdate | undefined> {
  const response = await fetchFn(API_URL, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "browsevil-evil" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) throw new Error(`GitHub returned ${response.status} for ${GITHUB_RELEASE_PAGE}`)
  const release = await response.json() as GithubRelease
  const asset = release.assets?.find((item) => item.name === ASSET_NAME)
  if (!asset) throw new Error(`the latest evil release has no ${ASSET_NAME} asset`)
  const latest = versionOf(release.tag_name ?? "")
  if (!latest || latest === current) return undefined
  if (compareVersions(latest, current) <= 0) return undefined
  return { latest, url: asset.browser_download_url, digest: asset.digest, size: asset.size }
}

/** Downloads the release exe, verifies its sha256 when GitHub supplies one, and swaps it into place. */
export async function installGithubUpdate(update: GithubUpdate, fetchFn: typeof fetch = fetch, destination = installedBinaryPath()): Promise<string> {
  const response = await fetchFn(update.url, { signal: AbortSignal.timeout(10 * 60_000) })
  if (!response.ok) throw new Error(`download failed with HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (update.size && bytes.length !== update.size) throw new Error(`size mismatch: got ${bytes.length}, expected ${update.size}`)
  if (update.digest) {
    const expected = update.digest.replace(/^sha256:/, "").toLowerCase()
    const actual = createHash("sha256").update(bytes).digest("hex")
    if (actual !== expected) throw new Error(`sha256 mismatch: got ${actual}, expected ${expected}`)
  }
  const staged = `${destination}.new`
  const previous = `${destination}.old-${Date.now()}`
  writeFileSync(staged, bytes)
  if (existsSync(destination)) renameSync(destination, previous)
  renameSync(staged, destination)
  try { if (existsSync(previous)) rmSync(previous, { force: true }) } catch { /* the running relay may still hold it */ }
  return update.latest
}
