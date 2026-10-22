# Canvas Focus Browser

This is the desktop app launched by the Windows desktop shortcut or the macOS Applications icon. Its embedded browser shows Canvas, while the bottom chat bar runs your installed Codex CLI and `canvas-coursework` skill against the visible page. It is an agent workspace in a browser-shaped window, not a replacement for your Codex installation.

The top bar has Downloads for browser downloads and finished files, plus a Window/Full screen toggle (also F11). The bottom conversation opens at 250 pixels high; drag its top edge to change height or its left edge to change width. The size is remembered. Codex can register a created file so it appears in Downloads with Open and Show in folder buttons.

For Canvas quiz questions and Word assignments, Codex uses screenshots of the visible rendered page. It can scroll for additional questions and enter answers, but final submission is left to the student. If a DOCX downloads rather than opening, the Canvas skill calls for rendering its pages before reading them.

A separate browser window with a compact chat bar at the bottom. The bar can pass the current page to your existing Codex CLI login, including the installed `canvas-coursework` skill. The app keeps its Chromium sign-in profile in `~/Documents/Codex/Canvas Focus Browser Profile`; it does not share cookies with Codex's in-app browser or Chrome.

## Start

The repository installers place the Windows app behind a desktop and Start menu shortcut or the macOS app in `~/Applications`. For a source checkout, run `npm ci` then `npm start`. Node.js and the Codex CLI must be installed and available in PATH. Codex must already be logged in (`codex login status`). Install the `canvas-coursework` skill first.

If the app reports a JavaScript error, its details are saved locally in `~/Documents/Codex/Canvas Focus Browser Profile/errors.log`. The app shows the error in its status bar instead of repeatedly opening a native error window.

Enter your school's Canvas URL through the address button in the bottom bar and sign in on the website. Ask, for example, `Use $canvas-coursework to complete SSW 555 Homework 2 from this page.` The assistant receives the current page URL and can read and interact with the page through this app's local browser tools. Saved Canvas course files remain under `~/Documents/Codex/Canvas Courses` when the skill uses its sync helper.

Use Ctrl+L for the address field, Ctrl+R to refresh, and F11 to toggle full screen. The microphone button tries Chromium speech recognition. If it is unavailable, focus the text box and use Windows voice typing (Win+H).

## Current limits

This is a local prototype. The browser can visit secure websites, keep its own sign-in session, and pass tasks to Codex. Website features such as extensions, passkeys, file pickers, and institutional SSO may behave differently from Chrome. Voice recognition depends on the installed Chromium speech service. The assistant uses a fresh Codex CLI turn for each bar message, with recent conversation summarized in the next prompt. Review any assignment before submission. The app does not remove indicators shown by the ChatGPT/Codex desktop app when that app itself uses native Computer Use.

The app's browser tools can read the current page and interact with visible elements. Login credentials typed by you in the browser are not included in the page text sent to Codex. The app rejects agent fills into password fields. Only open sites you trust in this prototype; Electron's own guidance notes that arbitrary remote content requires careful handling.
