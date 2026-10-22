param(
  [switch]$InstallBrowserSkillCli,
  [switch]$SkipBrowser,
  [string]$SkillRoot,
  [string]$BrowserArchive,
  [string]$ReleaseRepository
)
$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$skillRoot = if ($SkillRoot) { [IO.Path]::GetFullPath($SkillRoot) } else { Join-Path $HOME '.codex\skills' }
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ('canvas-skill-install-' + [guid]::NewGuid().ToString('N'))
$browserSkillCommit = '3f10983c09fcd443c7420830ab984c9d409954bf'
$browserAssetName = 'CanvasFocusBrowser-windows-x64.zip'
$repoFile = Join-Path $sourceRoot 'release-repository.txt'
if (-not $ReleaseRepository) {
  $ReleaseRepository = (Get-Content -LiteralPath $repoFile -Raw).Trim()
}
if ($ReleaseRepository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
  throw 'ReleaseRepository must have the form owner/repository.'
}

function Copy-Contents([string]$from, [string]$to) {
  New-Item -ItemType Directory -Path $to -Force | Out-Null
  Get-ChildItem -LiteralPath $from -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $to -Recurse -Force
  }
}

function Install-Shortcut([string]$directory, [string]$executable) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $shortcutPath = Join-Path $directory 'Canvas Focus Browser.lnk'
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $executable
  $shortcut.WorkingDirectory = Split-Path -Parent $executable
  $shortcut.IconLocation = "$executable,0"
  $shortcut.Description = 'Canvas Focus Browser with the Codex coursework agent'
  $shortcut.Save()
  Write-Host "Created $shortcutPath"
}

try {
  New-Item -ItemType Directory -Path $tempRoot, $skillRoot -Force | Out-Null
  $canvasTarget = Join-Path $skillRoot 'canvas-coursework'
  New-Item -ItemType Directory -Path $canvasTarget -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'SKILL.md') -Destination $canvasTarget -Force
  Copy-Contents (Join-Path $sourceRoot 'references') (Join-Path $canvasTarget 'references')
  Copy-Contents (Join-Path $sourceRoot 'scripts') (Join-Path $canvasTarget 'scripts')
  Copy-Contents (Join-Path $sourceRoot 'agents') (Join-Path $canvasTarget 'agents')
  Copy-Item -LiteralPath (Join-Path $sourceRoot 'package.json') -Destination $canvasTarget -Force

  $humanizer = Join-Path $tempRoot 'humanizer'
  $browserSkill = Join-Path $tempRoot 'browser-skill'
  Expand-Archive -LiteralPath (Join-Path $sourceRoot 'humanizer-skill.zip') -DestinationPath $humanizer
  Expand-Archive -LiteralPath (Join-Path $sourceRoot 'browser-skill.zip') -DestinationPath $browserSkill
  Copy-Contents $humanizer (Join-Path $skillRoot 'humanizer')
  Copy-Contents $browserSkill (Join-Path $skillRoot 'browser-skill')
  Write-Host 'Installed Canvas coursework, Humanizer, and BrowserSkill instructions.'

  if ($InstallBrowserSkillCli) {
    $cliInstaller = Join-Path $tempRoot 'bsk-install.ps1'
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/Tencent/BrowserSkill/$browserSkillCommit/install.ps1" -OutFile $cliInstaller
    & $cliInstaller
  }

  if (-not $SkipBrowser) {
    $archivePath = if ($BrowserArchive) { [IO.Path]::GetFullPath($BrowserArchive) } else { Join-Path $tempRoot $browserAssetName }
    if ($BrowserArchive) {
      if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) { throw "Browser archive not found: $archivePath" }
      $version = 'local-' + (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
    } else {
      $headers = @{ 'User-Agent' = 'Canvas-Focus-Browser-Installer'; 'Accept' = 'application/vnd.github+json' }
      $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$ReleaseRepository/releases/latest" -Headers $headers
      $asset = $release.assets | Where-Object { $_.name -eq $browserAssetName } | Select-Object -First 1
      if (-not $asset) { throw "The latest release of $ReleaseRepository has no $browserAssetName asset." }
      if ($asset.digest -notmatch '^sha256:([a-fA-F0-9]{64})$') { throw 'The release asset has no SHA-256 digest.' }
      $expectedHash = $Matches[1].ToUpperInvariant()
      $version = [string]$release.tag_name
      if ($version -notmatch '^[A-Za-z0-9._-]+$') { throw 'The release tag is not a safe folder name.' }
      Write-Host "Downloading Canvas Focus Browser $version..."
      Invoke-WebRequest -Uri $asset.browser_download_url -Headers @{ 'User-Agent' = 'Canvas-Focus-Browser-Installer' } -OutFile $archivePath
      $actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
      if ($actualHash -ne $expectedHash) { throw "Browser archive SHA-256 mismatch: $actualHash" }
    }

    $unpacked = Join-Path $tempRoot 'browser'
    Expand-Archive -LiteralPath $archivePath -DestinationPath $unpacked
    $packageRoot = Get-ChildItem -LiteralPath $unpacked -Directory | Where-Object {
      Test-Path -LiteralPath (Join-Path $_.FullName 'CanvasFocusBrowser.exe') -PathType Leaf
    } | Select-Object -First 1
    if (-not $packageRoot) { throw 'The archive does not contain CanvasFocusBrowser.exe.' }
    $programs = [Environment]::GetFolderPath('LocalApplicationData')
    $installParent = Join-Path $programs 'Programs\CanvasFocusBrowser'
    New-Item -ItemType Directory -Path $installParent -Force | Out-Null
    $installTarget = Join-Path $installParent $version
    if ((Test-Path -LiteralPath $installTarget) -and -not (Test-Path -LiteralPath (Join-Path $installTarget 'CanvasFocusBrowser.exe'))) {
      $installTarget = Join-Path $installParent ($version + '-repair-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
    }
    if (-not (Test-Path -LiteralPath $installTarget)) {
      Copy-Item -LiteralPath $packageRoot.FullName -Destination $installTarget -Recurse -Force
    }
    $executable = Join-Path $installTarget 'CanvasFocusBrowser.exe'
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw 'The installed browser executable is missing.' }
    Install-Shortcut ([Environment]::GetFolderPath('DesktopDirectory')) $executable
    Install-Shortcut ([Environment]::GetFolderPath('Programs')) $executable
    Write-Host "Canvas Focus Browser is installed at $executable"
  }

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Warning 'Install Node.js before using the app chat bar.' }
  if (-not (Get-Command codex -ErrorAction SilentlyContinue)) { Write-Warning 'Install the Codex CLI and run codex login before using the app chat bar.' }
  Write-Host 'Restart Codex to discover the skill, then launch Canvas Focus Browser from the desktop or Start menu.'
  Write-Host 'The app uses your installed Codex agent and keeps Canvas sign-in data on this computer.'
} finally {
  $resolvedTemp = [IO.Path]::GetFullPath($tempRoot)
  $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemp.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTemp)) {
    Remove-Item -LiteralPath $resolvedTemp -Recurse -Force
  }
}
