"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("focusBrowser", {
  browser: (command, args = {}) => ipcRenderer.invoke("browser:command", command, args),
  info: () => ipcRenderer.invoke("browser:info"),
  fullscreen: () => ipcRenderer.invoke("browser:fullscreen"),
  panel: options => ipcRenderer.invoke("ui:panel", options),
  downloads: () => ipcRenderer.invoke("downloads:list"),
  showDownloads: open => ipcRenderer.invoke("ui:downloads", open),
  openDownload: (filePath, reveal = false) => ipcRenderer.invoke("downloads:open", filePath, reveal),
  send: message => ipcRenderer.invoke("chat:send", message),
  on: (channel, callback) => {
    if (!["page:state", "chat:progress", "download:done", "downloads:changed", "ui:focus-address"].includes(channel)) return;
    ipcRenderer.on(channel, (_event, value) => callback(value));
  }
});
