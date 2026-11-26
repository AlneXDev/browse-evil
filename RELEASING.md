# Releasing browsevil (evil fork)

This fork does **not** publish to Anomaly's release service, npm, or the Chrome Web Store. Those upstream jobs are
disabled in `.github/workflows/release.yml` (`if: false`) and the upstream text that used to live here is historical.

Supported distribution:

- Tag `evil-v<version>` (see `.github/release/tag-release.sh`).
- Build the unpacked extension zip `opencode-evil-browse-extension-<version>.zip`
  (`scripts/package.ts`) and, locally, `browsevil.exe` (`bun script/compile.ts windows-x64`).
- Publish the GitHub release with `.github/release/publish-github-release.sh`; it uploads the zip, the npm tarball from
  `scripts/npm-package.ts`, SHA256SUMS and the attestation, plus `browsevil.exe` when present in the build directory.
- The extension is loaded **unpacked** from the zip, never from the Chrome Web Store.
- Updates are manual and GitHub-only; the release service and package-manager update paths are disabled.

