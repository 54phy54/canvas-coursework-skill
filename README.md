# Canvas coursework for Codex

This skill starts with the Canvas assignment, quiz, or classwork you name. It keeps materials from each course in a separate folder, uses the matching course's sources, and prepares answers or a finished file for you to review. It can enter answers in Canvas, but leaves the final submission to you.

## Download and install on Windows

1. Download this repository with GitHub's **Code → Download ZIP**, then extract it. In PowerShell, run `powershell -ExecutionPolicy Bypass -File .\install.ps1` from the extracted folder. This installs the Canvas skill plus the bundled [Humanizer and BrowserSkill instructions](THIRD_PARTY.md) into `~/.codex/skills`. It uses the files in this repository, not a backup from another computer. Restart Codex afterward.
2. For the separate browser, download [CanvasFocusBrowser-windows-x64.zip](https://github.com/Yeming4/canvas-coursework-skill/releases/latest/download/CanvasFocusBrowser-windows-x64.zip) from [Releases](https://github.com/Yeming4/canvas-coursework-skill/releases). Extract the whole ZIP and run `CanvasFocusBrowser.exe` inside its folder. Keep the files together. Install Node.js and the Codex CLI, and sign in with `codex login` before using the browser's chat bar.
3. If you want BrowserSkill to control your existing Chrome or Edge browser, run the installer with `-InstallBrowserSkillCli`, install its upstream browser extension, and check the connection with `bsk doctor`. The separate Canvas Focus Browser uses its own browser bridge and does not require that extension. Computer Use is provided by Codex where available; it is not redistributed here.

The browser source is also available as [CanvasFocusBrowser-source.zip](CanvasFocusBrowser-source.zip). To build it yourself, extract it, run `npm ci` and `npm start`. The Windows ZIP above is the ready-to-run package; Node.js is still needed for its local browser bridge.

SHA-256 hashes for the browser and bundled skill archives are in [SHA256SUMS.txt](SHA256SUMS.txt). The Windows browser is currently unsigned.

## What it does

- Opens the specific work you name, such as “Use Canvas coursework for NSW 555 quiz 2,” then gathers the relevant documents from that course or classwork module. A full course sync is available when requested. The default course hub is `~/Documents/Codex/Canvas Courses`.
- Reads quiz questions and Word assignments from rendered screenshots, scrolling through all relevant pages. If a Word file downloads, it must be rendered before reading. Quiz page text is excluded from the browser's text snapshot; Word viewers can use visual-only mode.
- Uses course sources to prepare answers in original wording, with citations where needed. For prose, it applies the bundled Humanizer skill as a final writing edit without inventing the student's experiences.
- Selects or types requested answers but stops before **Submit**, **Turn In**, or **Finish**. For file work, it creates a finished file and lists it in the browser's **Downloads** menu so you can open or locate it.
- Shows a compact bottom chat bar. Drag the conversation panel's top or left edge to resize it; use the top button or F11 to switch between window and full screen.

The browser keeps its sign-in profile in your own `Documents/Codex/Canvas Focus Browser Profile` folder. Neither that profile nor course files, submissions, credentials, or student work are included in this repository. Check each course's `manifest.json` for unavailable or locked resources. Institutional SSO, embedded tools, and document rendering may vary by course and computer.
