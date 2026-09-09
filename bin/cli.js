#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENV_UNIX = path.join(ROOT, ".venv", "bin", "yt-dlp");
const VENV_WIN = path.join(ROOT, ".venv", "Scripts", "yt-dlp.exe");
const VENV_PIP_UNIX = path.join(ROOT, ".venv", "bin", "pip");
const VENV_PIP_WIN = path.join(ROOT, ".venv", "Scripts", "pip.exe");

function has(cmd, args = ["--version"]) {
  const result = spawnSync(cmd, args, { encoding: "utf8" });
  return result.status === 0;
}

function pythonBin() {
  if (has("python3")) return "python3";
  if (has("python")) return "python";
  return null;
}

function ytdlpReady() {
  if (fs.existsSync(VENV_UNIX) || fs.existsSync(VENV_WIN)) return true;
  return has("yt-dlp");
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log("OmniFetch · Mercurio");
console.log("Descargador local. El archivo se queda en tu ordenador.\n");

const python = pythonBin();
if (!python) {
  console.error("Hace falta Python 3 para instalar yt-dlp.");
  console.error("Instálalo y vuelve a ejecutar: npx omnifetch");
  process.exit(1);
}

if (!ytdlpReady()) {
  console.log("Preparando yt-dlp (solo la primera vez)…");
  const venv = path.join(ROOT, ".venv");
  if (!fs.existsSync(venv)) run(python, ["-m", "venv", venv]);
  const pip = fs.existsSync(VENV_PIP_UNIX) ? VENV_PIP_UNIX : VENV_PIP_WIN;
  run(pip, ["install", "-U", "yt-dlp"]);
}

if (!has("ffmpeg", ["-version"])) {
  console.log("Aviso: no encontré ffmpeg. YouTube puede fallar al unir vídeo y audio.");
  console.log("En macOS: brew install ffmpeg\n");
}

const child = spawn(process.execPath, [path.join(ROOT, "src", "server.js")], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
