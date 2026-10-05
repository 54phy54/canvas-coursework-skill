#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { chromium } = require("playwright");

function options(argv) {
  const out = { output: path.join(os.homedir(), "Documents", "Codex", "Canvas Courses"), maxFileMb: 500 };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === "--help") return { help: true };
    if (!["--canvas-url", "--course", "--output", "--browser-channel", "--max-file-mb"].includes(key) || !argv[i + 1]) throw new Error(`Unknown or incomplete option: ${key}`);
    const value = argv[++i];
    out[{ "--canvas-url": "canvasUrl", "--course": "course", "--output": "output", "--browser-channel": "browserChannel", "--max-file-mb": "maxFileMb" }[key]] = value;
  }
  if (!out.canvasUrl || !out.course) throw new Error("--canvas-url and --course are required. Use --help for usage.");
  const url = new URL(out.canvasUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("Use the HTTPS root URL of your Canvas site, without credentials or a query string.");
  out.origin = url.origin;
  out.maxFileMb = Number(out.maxFileMb);
  if (!Number.isFinite(out.maxFileMb) || out.maxFileMb <= 0) throw new Error("--max-file-mb must be positive.");
  return out;
}

function safeName(value) {
  const cleaned = String(value || "untitled").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/[. ]+$/g, "").trim();
  return (cleaned || "untitled").slice(0, 120);
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function nextLink(header) {
  const part = (header || "").split(",").find(x => /rel="next"/.test(x));
  return part?.match(/<([^>]+)>/)?.[1] || null;
}

async function askLogin() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { await new Promise(resolve => rl.question("Sign in to Canvas in the opened browser, then press Enter here: ", resolve)); }
  finally { rl.close(); }
}

async function browserGet(page, origin, endpoint) {
  const url = new URL(endpoint, origin);
  if (url.origin !== origin) throw new Error("Canvas pagination left the Canvas origin.");
  const result = await page.evaluate(async target => {
    const response = await fetch(target, { credentials: "same-origin", headers: { Accept: "application/json" } });
    return { status: response.status, type: response.headers.get("content-type") || "", link: response.headers.get("link") || "", body: await response.text() };
  }, url.href);
  if (result.status < 200 || result.status >= 300) throw new Error(`Canvas returned HTTP ${result.status} for ${url.pathname}`);
  if (!result.type.includes("json")) throw new Error(`Canvas returned ${result.type || "non-JSON"} for ${url.pathname}; the browser session may not authorize the API.`);
  return { data: JSON.parse(result.body), next: nextLink(result.link) };
}

async function list(page, origin, endpoint) {
  const items = [];
  let next = endpoint;
  const seen = new Set();
  while (next) {
    if (seen.has(next)) throw new Error("Repeated Canvas pagination link.");
    seen.add(next);
    const result = await browserGet(page, origin, next);
    if (!Array.isArray(result.data)) throw new Error(`Expected a list from ${endpoint}`);
    items.push(...result.data);
    next = result.next;
  }
  return items;
}

function courseFolder(root, course) {
  const label = safeName(course.course_code || course.name || `course-${course.id}`);
  let folder = path.join(root, label);
  if (fs.existsSync(path.join(folder, "course.json"))) {
    const old = JSON.parse(fs.readFileSync(path.join(folder, "course.json"), "utf8"));
    if (String(old.id) !== String(course.id)) folder = path.join(root, `${label} [${course.id}]`);
  } else if (fs.existsSync(folder)) {
    folder = path.join(root, `${label} [${course.id}]`);
  }
  return folder;
}

async function selectCourse(page, opts) {
  let courses;
  try { courses = await list(page, opts.origin, "/api/v1/courses?per_page=100&enrollment_type=student"); }
  catch (error) { throw new Error(`Could not list courses: ${error.message}`); }
  const query = opts.course.trim().toLowerCase();
  let matches = courses.filter(c => [c.id, c.course_code, c.name].some(v => String(v || "").trim().toLowerCase() === query));
  if (!matches.length && /[a-z]/i.test(query)) {
    const compact = query.replace(/[^a-z0-9]/g, "");
    matches = courses.filter(c => String(c.course_code || "").toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(compact));
  }
  if (matches.length !== 1) {
    const candidates = courses.map(c => `${c.id}: ${c.course_code || ""} ${c.name || ""}`).join("\n");
    throw new Error(`${matches.length ? "Several courses match" : "No course matches"} '${opts.course}'. Use an exact Canvas course ID. Available courses:\n${candidates}`);
  }
  const id = matches[0].id;
  return (await browserGet(page, opts.origin, `/api/v1/courses/${id}?include[]=syllabus_body`)).data;
}

async function saveCollection(page, opts, folder, manifest, kind, endpoint, detailEndpoint) {
  try {
    const items = await list(page, opts.origin, endpoint);
    const saved = [];
    manifest.counts[kind] = items.length;
    for (const item of items) {
      let full = item;
      if (detailEndpoint) {
        try {
          const detail = kind === "modules"
            ? await list(page, opts.origin, detailEndpoint(item))
            : (await browserGet(page, opts.origin, detailEndpoint(item))).data;
          full = Array.isArray(detail) ? { ...item, items: detail } : detail;
        }
        catch (error) { manifest.errors.push(`${kind} ${item.id || item.url}: ${error.message}`); }
      }
      const key = item.id || item.page_id || item.url || "item";
      const title = item.name || item.title || item.url || key;
      writeJson(path.join(folder, kind, `${safeName(key)}-${safeName(title)}.json`), full);
      saved.push(full);
    }
    return saved;
  } catch (error) {
    manifest.errors.push(`${kind}: ${error.message}`);
    manifest.counts[kind] = 0;
    return [];
  }
}

async function saveFiles(context, page, opts, folder, manifest, courseId) {
  const files = await saveCollection(page, opts, folder, manifest, "file-metadata", `/api/v1/courses/${courseId}/files?per_page=100`);
  manifest.counts.filesDownloaded = 0;
  for (const file of files) {
    const label = `${file.id}-${safeName(file.display_name || file.filename)}`;
    if (file.size > opts.maxFileMb * 1024 * 1024) {
      manifest.errors.push(`file ${label}: exceeds --max-file-mb ${opts.maxFileMb}`);
      continue;
    }
    try {
      if (!file.url) throw new Error("Canvas supplied no download URL");
      const response = await context.request.get(file.url, { timeout: 120000 });
      if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
      const type = response.headers()["content-type"] || "";
      if (type.includes("text/html")) throw new Error("received HTML instead of the file");
      const bytes = await response.body();
      if (bytes.length > opts.maxFileMb * 1024 * 1024) throw new Error("download exceeds --max-file-mb");
      const target = path.join(folder, "files", label);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, bytes);
      manifest.counts.filesDownloaded++;
    } catch (error) { manifest.errors.push(`file ${label}: ${error.message}`); }
  }
  return files;
}

function writeIndex(folder, course, collections, manifest) {
  const lines = [`# ${course.course_code || course.name}`, "", `Canvas course ID: ${course.id}`, `Synced: ${manifest.syncedAt}`, "", "See analytics.md for assignment status and upcoming due dates.", ""];
  for (const [title, items] of Object.entries(collections)) {
    lines.push(`## ${title}`, "");
    for (const item of items) lines.push(`- ${item.name || item.title || item.display_name || item.filename || item.url || item.id}${item.due_at ? ` (due ${item.due_at})` : ""}`);
    if (!items.length) lines.push("- No accessible items found.");
    lines.push("");
  }
  lines.push(`Sync errors: ${manifest.errors.length}. See manifest.json.`, "");
  fs.writeFileSync(path.join(folder, "index.md"), lines.join("\n"), "utf8");
}

function writeAnalytics(folder, assignments, manifest) {
  const now = Date.now();
  const rows = assignments.map(item => {
    const submission = item.submission || {};
    const due = item.due_at ? Date.parse(item.due_at) : NaN;
    const status = submission.excused ? "excused"
      : submission.missing ? "missing"
      : submission.workflow_state === "graded" ? "graded"
      : (submission.submitted_at || submission.workflow_state === "submitted") ? "submitted"
      : Number.isFinite(due) && due < now ? "past due"
      : "not submitted";
    return {
      id: item.id,
      name: item.name,
      due_at: item.due_at || null,
      days_until_due: Number.isFinite(due) ? Math.ceil((due - now) / 86400000) : null,
      status,
      html_url: item.html_url || null
    };
  }).sort((a, b) => (a.due_at ? Date.parse(a.due_at) : Infinity) - (b.due_at ? Date.parse(b.due_at) : Infinity));
  writeJson(path.join(folder, "analytics.json"), { generated_at: manifest.syncedAt, course_id: manifest.courseId, assignments: rows, counts: manifest.counts });
  const lines = ["# Course assignment summary", "", `Synced: ${manifest.syncedAt}`, "", "This is a snapshot of Canvas data, not a grade calculation.", "", "| Assignment | Due | Status |", "| --- | --- | --- |"];
  for (const row of rows) {
    const name = String(row.name || row.id).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    lines.push(`| ${name} | ${row.due_at || "No due date"} | ${row.status} |`);
  }
  if (!rows.length) lines.push("| No accessible assignments found | | |");
  fs.writeFileSync(path.join(folder, "analytics.md"), lines.join("\n") + "\n", "utf8");
}

function writeHub(root, folder, course, origin, manifest) {
  fs.mkdirSync(root, { recursive: true });
  const target = path.join(root, "hub.json");
  let entries = [];
  if (fs.existsSync(target)) {
    try { entries = JSON.parse(fs.readFileSync(target, "utf8")).courses || []; }
    catch { entries = []; }
  }
  entries = entries.filter(entry => !(String(entry.id) === String(course.id) && entry.canvas_origin === origin));
  entries.push({ id: course.id, name: course.name, course_code: course.course_code, canvas_origin: origin, folder, synced_at: manifest.syncedAt, assignment_count: manifest.counts.assignments || 0, sync_errors: manifest.errors.length });
  entries.sort((a, b) => String(a.course_code || a.name).localeCompare(String(b.course_code || b.name)));
  writeJson(target, { courses: entries });
  const lines = ["# Canvas course hub", "", "| Course | Canvas ID | Last sync | Folder |", "| --- | --- | --- | --- |"];
  for (const entry of entries) lines.push(`| ${String(entry.course_code || entry.name).replace(/\|/g, "\\|")} | ${entry.id} | ${entry.synced_at} | ${entry.folder.replace(/\|/g, "\\|")} |`);
  fs.writeFileSync(path.join(root, "hub.md"), lines.join("\n") + "\n", "utf8");
}

async function main() {
  const opts = options(process.argv.slice(2));
  if (opts.help) {
    console.log("Usage: node canvas_sync.js --canvas-url https://school.instructure.com --course 'SSW 555' [--output PATH] [--browser-channel chrome] [--max-file-mb 500]");
    return;
  }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "canvas-coursework-"));
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, { headless: false, ...(opts.browserChannel ? { channel: opts.browserChannel } : {}) });
    const page = context.pages()[0] || await context.newPage();
    await page.goto(opts.origin, { waitUntil: "domcontentloaded" });
    await askLogin();
    await page.goto(opts.origin, { waitUntil: "domcontentloaded" });
    const course = await selectCourse(page, opts);
    const folder = courseFolder(path.resolve(opts.output), course);
    fs.mkdirSync(folder, { recursive: true });
    writeJson(path.join(folder, "course.json"), { id: course.id, name: course.name, course_code: course.course_code, html_url: course.html_url, canvas_origin: opts.origin });
    if (course.syllabus_body) fs.writeFileSync(path.join(folder, "syllabus.html"), course.syllabus_body, "utf8");
    const manifest = { syncedAt: new Date().toISOString(), courseId: course.id, counts: {}, unavailable: [], errors: [] };
    const base = `/api/v1/courses/${course.id}`;
    try {
      const collections = {};
      collections.Assignments = await saveCollection(page, opts, folder, manifest, "assignments", `${base}/assignments?per_page=100&include[]=submission`, item => `${base}/assignments/${item.id}?include[]=submission`);
      collections.Pages = await saveCollection(page, opts, folder, manifest, "pages", `${base}/pages?per_page=100`, item => `${base}/pages/${encodeURIComponent(item.url)}`);
      collections.Modules = await saveCollection(page, opts, folder, manifest, "modules", `${base}/modules?per_page=100&include[]=items`, item => `${base}/modules/${item.id}/items?per_page=100`);
      for (const module of collections.Modules) for (const item of module.items || []) {
        if (item.locked_for_user || item.content_details?.locked_for_user) manifest.unavailable.push(`Locked: ${module.name} / ${item.title || item.id}`);
        if (["ExternalTool", "ExternalUrl"].includes(item.type)) manifest.unavailable.push(`External: ${module.name} / ${item.title || item.id}`);
      }
      collections.Discussions = await saveCollection(page, opts, folder, manifest, "discussions", `${base}/discussion_topics?per_page=100`);
      collections.Announcements = await saveCollection(page, opts, folder, manifest, "announcements", `${base}/discussion_topics?per_page=100&only_announcements=true`);
      collections.Files = await saveFiles(context, page, opts, folder, manifest, course.id);
      writeIndex(folder, course, collections, manifest);
      writeAnalytics(folder, collections.Assignments, manifest);
    } finally { writeJson(path.join(folder, "manifest.json"), manifest); }
    writeHub(path.resolve(opts.output), folder, course, opts.origin, manifest);
    console.log(`Saved course to ${folder}`);
    console.log(`Downloaded ${manifest.counts.filesDownloaded} of ${manifest.counts["file-metadata"] || 0} listed files; ${manifest.errors.length} issues in manifest.json.`);
  } finally {
    if (context) await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { options, safeName, nextLink, courseFolder, writeAnalytics };
