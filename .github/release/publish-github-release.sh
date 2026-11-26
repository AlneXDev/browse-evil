#!/usr/bin/env bash
# publish-github-release.sh <build dir> <attestation dir>: creates the evil-v<version> GitHub release with the extension zip,
# the npm tarball, their SHA256SUMS and the provenance bundle, and BROWSE_RELEASE_NOTES (a summary line, then the
# changelog sections). The tag must exist (tag-release.sh). Immutable releases lock assets once published, so they go
# to a draft first.
. "$(dirname "$0")/lib.sh"

tag="evil-v$BROWSE_VERSION"
assets=$(mktemp -d)
zip="opencode-evil-browse-extension-$BROWSE_VERSION.zip" tarball="opencode-browsevil-$BROWSE_VERSION.tgz"
for file in "$1/$zip" "$1/$tarball"; do
  test -s "$file" || die "Missing $file"
  verify_attestation "$file"
  cp "$file" "$assets/"
done
if [ -s "$1/browsevil.exe" ]; then
  cp "$1/browsevil.exe" "$assets/"
  (cd "$assets" && sha256 -- "$zip" "$tarball" browsevil.exe > SHA256SUMS && cat SHA256SUMS)
else
  (cd "$assets" && sha256 -- "$zip" "$tarball" > SHA256SUMS && cat SHA256SUMS)
fi
cp "$2/attestation.sigstore.json" "$assets/"

{
  notes_summary
  echo
  notes_body | grep -vE '^(Icon|Media):' || true
  echo
  echo "## Install"
  echo
  if [ -s "$1/browsevil.exe" ]; then
    echo 'Download browsevil.exe from this release, then run `browsevil install`.'
  else
    echo 'This release ships the unpacked extension zip; build browsevil.exe locally for the CLI.'
  fi
  echo
  echo "## Verify"
  echo
  echo '```sh'
  echo "sha256sum -c SHA256SUMS"
  echo "gh attestation verify $zip --repo $GITHUB_REPOSITORY"
  echo "gh attestation verify $tarball --repo $GITHUB_REPOSITORY"
  echo '```'
} > "$assets.md"
cat "$assets.md"
if dry_run; then exit 0; fi

gh release view "$tag" > /dev/null 2>&1 ||
  gh release create "$tag" --draft --verify-tag --title "$tag" --notes-file "$assets.md"
gh release upload "$tag" "$assets"/* --clobber
gh release edit "$tag" --draft=false --latest
summary "GitHub release: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/releases/tag/$tag"
