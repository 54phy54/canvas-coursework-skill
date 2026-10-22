#!/usr/bin/env node
"use strict";

const readline = require("node:readline");
const port = Number(process.env.FOCUS_PORT);
const token = process.env.FOCUS_TOKEN;
if (!Number.isInteger(port) || !token) {
  process.stderr.write("Canvas Focus Browser bridge is unavailable.\n");
  process.exit(1);
}

const tools = [
  {
    name: "browser_state",
    description: "Read page URL, title, and numbered interactive elements. Quiz pages omit question text; set visualOnly=true for Word viewers and use browser_screenshot for rendered content.",
    inputSchema: { type: "object", properties: { visualOnly: { type: "boolean" } }, additionalProperties: false }
  },
  {
    name: "browser_screenshot",
    description: "Capture the currently visible rendered browser page as an image. Use before reading quiz questions or Word documents and after scrolling to each additional section.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "browser_scroll",
    description: "Send a mouse-wheel scroll at a point in the visible page. This reaches embedded Word/PDF viewers and cross-origin frames. Positive pixels scroll down. Defaults to page center; pass x/y from the screenshot to aim inside the document, then capture another screenshot to verify movement.",
    inputSchema: { type: "object", properties: { pixels: { type: "number" }, x: { type: "number" }, y: { type: "number" } }, required: ["pixels"], additionalProperties: false }
  },
  {
    name: "browser_register_output",
    description: "Add an existing finished file under Documents/Codex to the browser Downloads list so the student can open or locate it.",
    inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false }
  },
  {
    name: "browser_navigate",
    description: "Open a secure website or localhost URL in the user's Canvas Focus Browser window.",
    inputSchema: { type: "object", properties: { url: { type: "string" } }, required: ["url"], additionalProperties: false }
  },
  {
    name: "browser_click",
    description: "Click a numbered visible element from the most recent browser_state. Final submissions and destructive controls are blocked.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false }
  },
  {
    name: "browser_fill",
    description: "Fill a numbered visible text field from the most recent browser_state. Password fields are blocked.",
    inputSchema: { type: "object", properties: { id: { type: "string" }, value: { type: "string" } }, required: ["id", "value"], additionalProperties: false }
  },
  {
    name: "browser_back",
    description: "Navigate back in the browser.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "browser_forward",
    description: "Navigate forward in the browser.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  },
  {
    name: "browser_reload",
    description: "Reload the current browser page.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false }
  }
];

const commands = {
  browser_state: "state", browser_navigate: "navigate", browser_click: "click",
  browser_fill: "fill", browser_back: "back", browser_forward: "forward", browser_reload: "reload",
  browser_screenshot: "screenshot", browser_scroll: "scroll", browser_register_output: "register-output"
};

async function invoke(name, args) {
  const command = commands[name];
  if (!command) throw new Error(`Unknown tool: ${name}`);
  const response = await fetch(`http://127.0.0.1:${port}/command`, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ command, args })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Browser returned HTTP ${response.status}`);
  return data.result;
}

function reply(id, result, error) {
  const message = error
    ? { jsonrpc: "2.0", id, error: { code: -32000, message: String(error.message || error) } }
    : { jsonrpc: "2.0", id, result };
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

async function handle(message) {
  if (message.id === undefined) return;
  try {
    switch (message.method) {
      case "initialize":
        reply(message.id, {
          protocolVersion: "2025-06-18", capabilities: { tools: {} },
          serverInfo: { name: "canvas-focus-browser", version: require("./package.json").version }
        });
        break;
      case "ping": reply(message.id, {}); break;
      case "tools/list": reply(message.id, { tools }); break;
      case "tools/call": {
        const result = await invoke(message.params?.name, message.params?.arguments || {});
        if (message.params?.name === "browser_screenshot") {
          reply(message.id, { content: [
            { type: "text", text: JSON.stringify({ url: result.url, title: result.title }) },
            { type: "image", data: result.image, mimeType: "image/png" }
          ] });
        } else reply(message.id, { content: [{ type: "text", text: JSON.stringify(result) }] });
        break;
      }
      default: reply(message.id, null, new Error(`Method not found: ${message.method}`));
    }
  } catch (error) {
    reply(message.id, { content: [{ type: "text", text: error.message }], isError: true });
  }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", line => {
  try { handle(JSON.parse(line)); }
  catch (error) { process.stderr.write(`${error.message}\n`); }
});
