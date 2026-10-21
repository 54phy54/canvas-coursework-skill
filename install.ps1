param([switch]$InstallBrowserSkillCli)
$ErrorActionPreference = 'Stop'

$skillRoot = Join-Path $HOME '.codex\skills'
$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('canvas-skill-install-' + [guid]::NewGuid().ToString('N'))
$humanizerCommit = '225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8'
$browserSkillCommit = '3f10983c09fcd443c7420830ab984c9d409954bf'

function Copy-Contents([string]$from, [string]$to) {
  New-Item -ItemType Directory -Path $to -Force | Out-Null
  Get-ChildItem -LiteralPath $from -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $to -Recurse -Force
  }
}

function Get-GitHubArchive([string]$repo, [string]$commit, [string]$name) {
  $archive = Join-Path $tempRoot ($name + '.zip')
  $unpacked = Join-Path $tempRoot $name
  Invoke-WebRequest -Uri "https://github.com/$repo/archive/$commit.zip" -OutFile $archive
  Expand-Archive -LiteralPath $archive -DestinationPath $unpacked
  $folder = Get-ChildItem -LiteralPath $unpacked -Directory | Select-Object -First 1
  if (-not $folder) { throw "Archive for $repo did not contain a folder." }
  return $folder.FullName
}

try {
  New-Item -ItemType Directory -Path $tempRoot, $skillRoot -Force | Out-Null
  $canvasTarget = Join-Path $skillRoot 'canvas-coursework'
  New-Item -ItemType Directory -Path $canvasTarget -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'SKILL.md') -Destination $canvasTarget -Force
  Copy-Contents (Join-Path $sourceRoot 'references') (Join-Path $canvasTarget 'references')
  Copy-Contents (Join-Path $sourceRoot 'scripts') (Join-Path $canvasTarget 'scripts')
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'package.json') -Destination $canvasTarget -Force

  $humanizer = Get-GitHubArchive 'blader/humanizer' $humanizerCommit 'humanizer'
  Copy-Contents $humanizer (Join-Path $skillRoot 'humanizer')

  $browserSkill = Get-GitHubArchive 'Tencent/BrowserSkill' $browserSkillCommit 'browser-skill'
  Copy-Contents (Join-Path $browserSkill 'crates\bsk-cli\skill') (Join-Path $skillRoot 'browser-skill')
  if ($InstallBrowserSkillCli) {
    & (Join-Path $browserSkill 'install.ps1')
  }
  Write-Host 'Installed Canvas coursework, Humanizer, and BrowserSkill instructions.'
  Write-Host 'Restart Codex. For BrowserSkill browser control, install its browser extension and run bsk doctor.'
  Write-Host 'Computer Use is supplied by the Codex app when available; this repository does not copy its plugin.'
} finally {
  $resolvedTemp = [IO.Path]::GetFullPath($tempRoot)
  $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemp.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemp)) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}
