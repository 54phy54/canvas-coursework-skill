"use strict";
const $ = id => document.getElementById(id);
const api = window.focusBrowser;
const status = text => { $("status").textContent = text; };
let panelHeight = Math.max(170, Math.min(650, Number(localStorage.getItem("panelHeight")) || 250));
let panelWidth = Math.max(340, Math.min(900, Number(localStorage.getItem("panelWidth")) || 520));

function setPanel(open) {
  $("panel").hidden = !open;
  $("panel").style.height = `${panelHeight}px`;
  $("panel").style.width = `${Math.min(panelWidth, window.innerWidth - 32)}px`;
  api.panel({ open, height: panelHeight }).then(result => {
    if (result.height !== panelHeight) { panelHeight = result.height; $("panel").style.height = `${panelHeight}px`; }
  }).catch(error => status(error.message));
}

function addMessage(role, text) {
  const node = document.createElement("div");
  node.className = `message ${role}`;
  node.textContent = text;
  $("messages").appendChild(node);
  $("messages").scrollTop = $("messages").scrollHeight;
  setPanel(true);
  return node;
}

function updateWindowButton(fullscreen) {
  $("window-toggle").textContent = fullscreen ? "▣ Window" : "⛶ Full screen";
}

function renderDownloads(items) {
  $("download-count").textContent = String(items.length);
  const list = $("downloads-list");
  list.replaceChildren();
  if (!items.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Downloaded and finished files will appear here."; list.appendChild(empty); return; }
  for (const item of items) {
    const row = document.createElement("div"); row.className = "download-row";
    const info = document.createElement("div"); info.className = "download-info";
    const name = document.createElement("strong"); name.textContent = item.name;
    const meta = document.createElement("small"); meta.textContent = `${item.source} · ${new Date(item.time).toLocaleString()}`;
    info.append(name, meta);
    const open = document.createElement("button"); open.className = "small-button"; open.textContent = "Open"; open.addEventListener("click", () => api.openDownload(item.path).catch(error => status(error.message)));
    const folder = document.createElement("button"); folder.className = "small-button"; folder.textContent = "Show in folder"; folder.addEventListener("click", () => api.openDownload(item.path, true).catch(error => status(error.message)));
    row.append(info, open, folder); list.appendChild(row);
  }
}

function showDownloads(open) {
  $("downloads-panel").hidden = !open;
  api.showDownloads(open).catch(error => status(error.message));
  if (open) api.downloads().then(renderDownloads).catch(error => status(error.message));
}

function dragResize(handleId, axis) {
  const handle = $(handleId);
  handle.addEventListener("pointerdown", event => {
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY, startX = event.clientX, startHeight = panelHeight, startWidth = panelWidth;
    const move = movement => {
      if (axis === "height") {
        panelHeight = Math.max(170, Math.min(650, startHeight + startY - movement.clientY));
        localStorage.setItem("panelHeight", String(panelHeight));
        setPanel(true);
      } else {
        panelWidth = Math.max(340, Math.min(900, Math.min(window.innerWidth - 32, startWidth + startX - movement.clientX)));
        localStorage.setItem("panelWidth", String(panelWidth));
        $("panel").style.width = `${panelWidth}px`;
      }
    };
    const stop = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", stop); handle.removeEventListener("pointercancel", stop); };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  });
}

dragResize("panel-resize", "height");
dragResize("panel-resize-width", "width");

function addressVisible(show) {
  $("address-row").hidden = !show;
  if (show) { $("address").focus(); $("address").select(); }
}

async function navigate() {
  try {
    status("Opening page…");
    await api.browser("navigate", { url: $("address").value });
    addressVisible(false);
  } catch (error) { status(error.message); }
}

async function sendPrompt() {
  const message = $("prompt").value.trim();
  if (!message) return;
  $("prompt").value = "";
  addMessage("student", message);
  $("send").disabled = true;
  status("Codex is working…");
  try {
    const answer = await api.send(message);
    addMessage("assistant", answer);
    status("Ready");
  } catch (error) {
    addMessage("status", `Could not complete request: ${error.message}`);
    status("Request failed");
  } finally { $("send").disabled = false; }
}

$("address-toggle").addEventListener("click", () => addressVisible($("address-row").hidden));
$("navigate").addEventListener("click", navigate);
$("address").addEventListener("keydown", event => { if (event.key === "Enter") navigate(); if (event.key === "Escape") addressVisible(false); });
$("prompt").addEventListener("keydown", event => { if (event.key === "Enter") sendPrompt(); });
$("send").addEventListener("click", sendPrompt);
$("back").addEventListener("click", () => api.browser("back").catch(error => status(error.message)));
$("forward").addEventListener("click", () => api.browser("forward").catch(error => status(error.message)));
$("show-panel").addEventListener("click", () => setPanel($("panel").hidden));
$("close-panel").addEventListener("click", () => setPanel(false));
$("downloads-toggle").addEventListener("click", () => showDownloads($("downloads-panel").hidden));
$("close-downloads").addEventListener("click", () => showDownloads(false));
$("window-toggle").addEventListener("click", () => api.fullscreen().then(updateWindowButton).catch(error => status(error.message)));
window.addEventListener("resize", () => { $("panel").style.width = `${Math.min(panelWidth, window.innerWidth - 32)}px`; });

document.addEventListener("keydown", event => {
  if (event.ctrlKey && event.key.toLowerCase() === "l") { event.preventDefault(); addressVisible(true); }
  if (event.key === "F11") { event.preventDefault(); api.fullscreen().then(updateWindowButton); }
  if (event.key === "Escape") { addressVisible(false); if (!$("downloads-panel").hidden) showDownloads(false); }
});

api.on("page:state", info => {
  const url = info.url || "";
  $("address").value = url.startsWith("file:") ? "" : url;
  $("address-toggle").textContent = url.startsWith("file:") || !url ? "New tab" : (new URL(url).hostname || "Page");
  $("address-toggle").title = url || "Address · Ctrl+L";
  updateWindowButton(info.fullscreen);
  if (info.busy) status("Codex is working…");
});
api.on("ui:focus-address", () => addressVisible(true));
api.on("download:done", item => status(item.state === "completed" ? `Saved download: ${item.path}` : `Download ${item.state}`));
api.on("downloads:changed", renderDownloads);
api.on("chat:progress", item => { if (item.kind === "status") status(item.text); });
api.on("app:error", item => status(`Browser error: ${item.message}. Details: Documents/Codex/Canvas Focus Browser Profile/errors.log`));

$("mic").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { $("prompt").focus(); status("Voice recognition unavailable here. Press Win+H for Windows voice typing."); return; }
  const recognizer = new SpeechRecognition();
  recognizer.lang = navigator.language || "en-US";
  recognizer.interimResults = false;
  recognizer.onresult = event => { $("prompt").value = `${$("prompt").value} ${event.results[0][0].transcript}`.trim(); $("prompt").focus(); status("Voice added to message"); };
  recognizer.onerror = () => { $("prompt").focus(); status("Voice recognition failed. Press Win+H for Windows voice typing."); };
  status("Listening…");
  try { recognizer.start(); } catch { $("prompt").focus(); status("Voice recognition unavailable. Press Win+H."); }
});

setPanel(false);
api.info().then(info => { updateWindowButton(info.fullscreen); if (info.url) $("address-toggle").textContent = info.url.startsWith("file:") ? "New tab" : new URL(info.url).hostname; });
api.downloads().then(renderDownloads).catch(error => status(error.message));
