# Canvas coursework skill for Codex

This Codex skill helps a student organize their Canvas course materials by course, review an assignment against those materials, and prepare work in the requested format. It creates a local course hub, an assignment status summary, and separate folders for each Canvas course.

## Install

On a new Windows laptop, clone this repository and run `powershell -ExecutionPolicy Bypass -File .\install.ps1` from its root. This installs Canvas coursework plus the bundled Humanizer and BrowserSkill instructions, without using anything from the first laptop. Their source commits and licenses are listed in [THIRD_PARTY.md](THIRD_PARTY.md). Add `-InstallBrowserSkillCli` to install BrowserSkill's CLI using its official installer. Connect the BrowserSkill Chrome or Edge extension and run `bsk doctor` before using that route. Restart Codex to discover the skills. The separate Canvas Focus Browser can use its own browser bridge without BrowserSkill.

Codex desktop provides Node.js and Playwright through its workspace dependencies. In another environment, run `npm install` and `npx playwright install chromium` in the installed Canvas skill directory. Computer Use comes from the Codex app where available; this repository does not redistribute its plugin.

Humanizer is a separate skill from [blader/humanizer](https://github.com/blader/humanizer). BrowserSkill is optional and comes from [Tencent/BrowserSkill](https://github.com/Tencent/BrowserSkill); it requires its own CLI and Chrome or Edge extension. The Canvas skill can use Codex browser controls when BrowserSkill is unavailable.

## Use

Ask Codex, for example: “Use Canvas coursework for NSW 555 quiz 2” or “Finish NSW 555 classwork 3 and leave it ready for me to submit.” If the page is already open, Codex starts there. Otherwise it locates that exact work, asks for sign-in only when needed, and gathers documents from the matching course/classwork. Quiz questions and Word documents are read from rendered screenshots, including scrolled sections; source text is paraphrased. Answers may be typed or selected in Canvas, but final submission stays with the student. Finished files appear in Canvas Focus Browser's Downloads list.

The read-only sync helper saves accessible course material under `~/Documents/Codex/Canvas Courses` unless you choose another location. It does not store passwords or API tokens. Check each course's `manifest.json` for unavailable resources and sync errors.

Course content, submissions, and downloaded files may be private. Keep them out of this source repository. The sync helper has not been verified against every institution's Canvas configuration; locked content and external tools may require browser access.

The separate browser's source is in [CanvasFocusBrowser-source.zip](CanvasFocusBrowser-source.zip). On Windows with Node.js, extract it, run `npm install`, then `npm start`; use `npx @electron/packager . CanvasFocusBrowser --platform=win32 --arch=x64 --out dist --no-asar` to make a portable build. The browser keeps your local Canvas session in your own `Documents/Codex/Canvas Focus Browser Profile` folder, which is not included in this repository.
