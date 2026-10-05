# Canvas coursework skill for Codex

This Codex skill helps a student organize their Canvas course materials by course, review an assignment against those materials, and prepare work in the requested format. It creates a local course hub, an assignment status summary, and separate folders for each Canvas course.

## Install

Copy this repository to `~/.codex/skills/canvas-coursework`, then start a new Codex chat. Codex desktop provides Node.js and Playwright through its workspace dependencies. In another environment, run `npm install` and `npx playwright install chromium` in the skill directory.

Humanizer is a separate skill from [blader/humanizer](https://github.com/blader/humanizer). BrowserSkill is optional and comes from [Tencent/BrowserSkill](https://github.com/Tencent/BrowserSkill); it requires its own CLI and Chrome or Edge extension. The Canvas skill can use Codex browser controls when BrowserSkill is unavailable.

## Use

Ask Codex, for example: “Use Canvas coursework for SSW 555 homework 2.” On first use, provide the school's Canvas URL and sign in in the browser opened for the sync. The helper makes read-only requests and saves accessible course material under `~/Documents/Codex/Canvas Courses` unless you choose another location. It does not store passwords or API tokens. Check each course's `manifest.json` for unavailable resources and sync errors.

Course content, submissions, and downloaded files may be private. Keep them out of this source repository. The sync helper has not been verified against every institution's Canvas configuration; locked content and external tools may require browser access.
