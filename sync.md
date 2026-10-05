# Canvas sync helper

Run with Node.js and Playwright available in `NODE_PATH` (the Codex desktop workspace dependency bundle provides both). Use `load_workspace_dependencies` to find that directory. If Playwright is unavailable, run `npm install` in the skill directory, then `npx playwright install chromium` if Chromium is missing.

```powershell
node scripts/canvas_sync.js --canvas-url https://school.instructure.com --course "SSW 555" --output "$HOME/Documents/Codex/Canvas Courses"
```

Use `--course 12345` for an exact Canvas course ID. `--browser-channel chrome` uses installed Chrome instead of Playwright Chromium. `--max-file-mb 500` changes the per-file memory/download limit. The helper makes read-only requests using the student's temporary signed-in browser session and does not save credentials. The resulting course folder can contain private class content; keep it in a student-controlled location.

The helper writes one JSON file per Canvas assignment, page, module, discussion, and announcement. Files retain their original binary formats under `files/`. The storage root's `hub.md` lists synced courses. Each course's `analytics.md` summarizes assignment due dates and submission states; it is a snapshot, not a grade calculation. Check `manifest.json` for counts, sync time, unavailable module items, and errors. A 401 or login HTML response usually means the institution does not allow the browser session to call that API endpoint. In that case, use the Canvas UI to save the exact assignment and referenced course files. Some LTI tools, embedded media, locked modules, and instructor-only content are outside this helper's reach.

Official Canvas API references: [courses](https://developerdocs.instructure.com/services/canvas/resources/courses), [files](https://developerdocs.instructure.com/services/canvas/file.all_resources/files), [assignments](https://developerdocs.instructure.com/services/canvas/resources/assignments), [pages](https://developerdocs.instructure.com/services/canvas/resources/pages), [modules](https://developerdocs.instructure.com/services/canvas/resources/modules), [pagination](https://developerdocs.instructure.com/services/canvas/basics/file.pagination), and [OAuth guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth).
