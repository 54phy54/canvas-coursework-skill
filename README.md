# Canvas coursework for Codex

Canvas Focus Browser is a desktop app with an embedded browser and a compact Codex chat bar. The chat uses your installed Codex CLI and the `canvas-coursework` skill. Name a course and a specific assignment or quiz; the agent opens that work, gathers relevant material from the matching course, and prepares answers or a file for you to review. It can enter answers in Canvas, but you make the final submission.

## Install on Windows

1. Install the Codex CLI and run `codex login` once. Install Node.js if you want the optional full Canvas course sync.
2. Download this repository with **Code → Download ZIP** and extract it.
3. In the extracted folder, double-click `Install.cmd`. You can also run `powershell -ExecutionPolicy Bypass -File .\install.ps1` in PowerShell.

The installer adds the Canvas skill, the bundled [Humanizer and BrowserSkill instructions](THIRD_PARTY.md), and the latest Windows app. It checks the app download's SHA-256 digest, installs the app under your user profile, and creates **Canvas Focus Browser** shortcuts on the desktop and Start menu. Open that icon to use the browser and its agent. The app is unsigned.

The browser's bottom chat bar starts its bundled `focus_browser` MCP connection automatically. You do not need to add this MCP server in Codex settings. To update an older installation, download a fresh repository ZIP and run `Install.cmd` again.

To install BrowserSkill's optional Chrome or Edge bridge too, add `-InstallBrowserSkillCli` and then install its upstream extension. The Canvas Focus Browser app uses its own bridge and does not require that extension. Computer Use is supplied by Codex where available and is not copied by this repository.

## Install on macOS

1. Install Node.js and the Codex CLI, then run `codex login` once.
2. Download and extract this repository. In Terminal, change to that folder and run `bash install-macos.sh`.

The script installs the same skills and the macOS app for your Mac's processor in `~/Applications/Canvas Focus Browser.app`. Open it from Applications. The app is unsigned, so macOS may ask you to approve opening it. Existing app bundles are preserved with a timestamped name during upgrades.

The [latest release](https://github.com/54phy54/canvas-coursework-skill/releases/latest) also has direct app ZIPs for [Windows](https://github.com/54phy54/canvas-coursework-skill/releases/latest/download/CanvasFocusBrowser-windows-x64.zip), [Apple silicon](https://github.com/54phy54/canvas-coursework-skill/releases/latest/download/CanvasFocusBrowser-macos-arm64.zip), and [Intel Mac](https://github.com/54phy54/canvas-coursework-skill/releases/latest/download/CanvasFocusBrowser-macos-x64.zip). Installing from the repository ZIP sets up the skills and launcher together. The app source is in [browser](browser).

## What the agent does

- Opens the exact work you name, such as “Use Canvas coursework for NSW 555 quiz 2,” and gathers the relevant documents from that course or classwork module. A full course sync is available when requested. The default course hub is `~/Documents/Codex/Canvas Courses`.
- Reads quiz questions and Word assignments from rendered screenshots, scrolling through relevant pages including embedded document viewers. A downloaded Word file must be rendered before reading. Quiz page text is excluded from the app's text snapshot; Word viewers can use visual-only mode.
- Uses matching course sources to prepare answers in original wording, with citations where needed. For prose, it applies Humanizer as a final writing edit without inventing the student's experiences.
- Selects or types requested answers but stops before **Submit**, **Turn In**, or **Finish**. Finished files appear in the browser's **Downloads** menu so you can open or locate them.
- Shows a resizable conversation panel and a compact bottom chat bar. The app can switch between a window and full screen.

Canvas Focus Browser keeps its sign-in profile in your own `Documents/Codex/Canvas Focus Browser Profile` folder. Course files, browser profiles, credentials, submissions, and student work are not included in this repository. Check each course's `manifest.json` for unavailable or locked resources. Institutional SSO, embedded tools, and document rendering may vary by course and computer.
