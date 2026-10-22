#!/bin/bash
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
repo="$(tr -d '[:space:]' < "$root/release-repository.txt")"
case "$repo" in
  */*) ;;
  *) echo 'Invalid release repository.' >&2; exit 1 ;;
esac
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js first. The app uses it to connect to the Codex agent.' >&2
  exit 1
fi
if ! command -v codex >/dev/null 2>&1; then
  echo 'Install the Codex CLI and run codex login first.' >&2
  exit 1
fi

case "$(uname -m)" in
  arm64) asset_name='CanvasFocusBrowser-macos-arm64.zip' ;;
  x86_64) asset_name='CanvasFocusBrowser-macos-x64.zip' ;;
  *) echo 'Only Apple silicon and Intel Macs are supported.' >&2; exit 1 ;;
esac

tmp="$(mktemp -d "${TMPDIR:-/tmp}/canvas-focus-install.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

release_json="$(curl -fsSL -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/$repo/releases/latest")"
asset_info="$(printf '%s' "$release_json" | node -e '
let input="";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const release=JSON.parse(input);
  const asset=release.assets.find(item => item.name === process.argv[1]);
  if (!asset || !/^sha256:[a-f0-9]{64}$/i.test(asset.digest || "")) process.exit(2);
  process.stdout.write([release.tag_name, asset.browser_download_url, asset.digest.slice(7)].join("\n"));
});
' "$asset_name")" || { echo "The latest release lacks $asset_name or its checksum." >&2; exit 1; }
version="$(printf '%s\n' "$asset_info" | sed -n '1p')"
download_url="$(printf '%s\n' "$asset_info" | sed -n '2p')"
expected_hash="$(printf '%s\n' "$asset_info" | sed -n '3p')"

echo "Downloading Canvas Focus Browser $version..."
curl -fL --retry 3 -o "$tmp/browser.zip" "$download_url"
actual_hash="$(shasum -a 256 "$tmp/browser.zip" | awk '{print $1}')"
if [[ "$actual_hash" != "$expected_hash" ]]; then
  echo 'Browser archive SHA-256 mismatch.' >&2
  exit 1
fi
ditto -x -k "$tmp/browser.zip" "$tmp/unpacked"
app_source="$(find "$tmp/unpacked" -maxdepth 2 -type d -name 'CanvasFocusBrowser.app' -print -quit)"
if [[ -z "$app_source" ]]; then
  echo 'The archive does not contain CanvasFocusBrowser.app.' >&2
  exit 1
fi

skill_root="${CODEX_HOME:-$HOME/.codex}/skills"
mkdir -p "$skill_root/canvas-coursework" "$skill_root/humanizer" "$skill_root/browser-skill"
cp "$root/SKILL.md" "$root/package.json" "$skill_root/canvas-coursework/"
cp -R "$root/references" "$root/scripts" "$root/agents" "$skill_root/canvas-coursework/"
ditto -x -k "$root/humanizer-skill.zip" "$skill_root/humanizer"
ditto -x -k "$root/browser-skill.zip" "$skill_root/browser-skill"

applications="$HOME/Applications"
destination="$applications/Canvas Focus Browser.app"
mkdir -p "$applications"
if [[ -e "$destination" ]]; then
  backup="$applications/Canvas Focus Browser previous $(date +%Y%m%d%H%M%S).app"
  mv "$destination" "$backup"
  echo "Previous app preserved at $backup"
fi
ditto "$app_source" "$destination"
echo "Installed Canvas Focus Browser in $destination"
echo 'Restart Codex to discover the skill, then open the app from Applications.'
