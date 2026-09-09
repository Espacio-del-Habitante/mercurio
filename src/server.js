import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const VENV_UNIX = path.join(ROOT, ".venv", "bin", "yt-dlp");
const VENV_WIN = path.join(ROOT, ".venv", "Scripts", "yt-dlp.exe");
const COOKIES_FILE = path.join(ROOT, "cookies.txt");
const PORT = Number(process.env.PORT) || 3847;
const JOB_TTL_MS = 15 * 60 * 1000;

const jobs = new Map();
const hits = [];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
};

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function extractUrl(text) {
  const m = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return (m ? m[0] : String(text || "")).trim().replace(/[.,;)\]]+$/, "");
}

function normalizeHost(hostname) {
  return String(hostname || "").toLowerCase().replace(/^(www|m|music)\./, "");
}

function detectPlatform(hostname) {
  const host = normalizeHost(hostname);
  if (host === "instagram.com" || host === "instagr.am" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com" || host.endsWith(".youtube.com")) return "youtube";
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
  return null;
}

function isAllowedVideoUrl(platform, parsed) {
  const pathname = parsed.pathname;
  if (platform === "instagram") {
    return /\/(p|reel|reels|tv|stories|share)\//i.test(pathname);
  }
  if (platform === "youtube") {
    if (normalizeHost(parsed.hostname) === "youtu.be") return pathname.length > 1;
    return /\/(watch|shorts|embed|live)\b/i.test(pathname) || parsed.searchParams.has("v");
  }
  if (platform === "tiktok") {
    const host = normalizeHost(parsed.hostname);
    if (host.startsWith("vm.tiktok.") || host.startsWith("vt.tiktok.")) return pathname.length > 1;
    return /\/video\/|\/t\//i.test(pathname);
  }
  return false;
}

function assertSupportedUrl(raw) {
  let parsed;
  try {
    parsed = new URL(extractUrl(raw));
  } catch {
    throw new Error("Pega un enlace válido de Instagram, YouTube o TikTok.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("El enlace debe empezar por https://");
  }
  const platform = detectPlatform(parsed.hostname);
  if (!platform) {
    throw new Error("Solo se aceptan enlaces de Instagram, YouTube o TikTok.");
  }
  if (!isAllowedVideoUrl(platform, parsed)) {
    const hints = {
      instagram: "Pega el enlace de una publicación, Reel o story, no el de un perfil.",
      youtube: "Pega el enlace de un video o Short, no de una lista o un canal.",
      tiktok: "Pega el enlace de un video de TikTok, no el de un perfil.",
    };
    throw new Error(hints[platform]);
  }
  return { url: parsed.toString(), platform };
}

const PLATFORM_LABEL = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const PLATFORM_REFERER = {
  instagram: "https://www.instagram.com/",
  youtube: "https://www.youtube.com/",
  tiktok: "https://www.tiktok.com/",
};

function ytdlpBin() {
  if (fs.existsSync(VENV_UNIX)) return VENV_UNIX;
  if (fs.existsSync(VENV_WIN)) return VENV_WIN;
  return "yt-dlp";
}

function runYtdlp(args, { timeoutMs = 45000, platform } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(ytdlpBin(), args, {
      cwd: ROOT,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PATH: `${process.env.PATH || "/usr/bin"}:/opt/homebrew/bin`,
        HTTP_PROXY: "",
        HTTPS_PROXY: "",
        ALL_PROXY: "",
        http_proxy: "",
        https_proxy: "",
        all_proxy: "",
        NO_PROXY: "*",
      },
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("El sitio tardó demasiado en responder. Inténtalo de nuevo."));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err.code === "ENOENT"
        ? new Error("No está instalado yt-dlp. Ejecuta: npm start (OmniFetch lo instala) o python3 -m venv .venv && .venv/bin/pip install yt-dlp")
        : err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(humanizeYtdlpError(stderr || stdout || `yt-dlp salió con código ${code}`, platform)));
    });
  });
}

function humanizeYtdlpError(raw, platform) {
  const text = String(raw);
  const name = PLATFORM_LABEL[platform] || "la plataforma";
  if (/login required|sign in|age.restrict|rate-limit|please wait|restricted video|private|join this channel/i.test(text)) {
    return `${name} pide iniciar sesión o el contenido es privado. Si es tu cuenta, exporta cookies.txt (extensión “Get cookies.txt”) y colócalo en la carpeta del proyecto.`;
  }
  if (/not available|404|cannot parse|video unavailable/i.test(text)) {
    return "No se encontró ese video. Comprueba que el enlace sea público y esté completo.";
  }
  if (/cookies|bot|confirm you’re not a bot|confirm you.re not a bot/i.test(text)) {
    return `${name} bloqueó la petición. Prueba de nuevo en unos minutos o añade cookies.txt de tu sesión.`;
  }
  const line = text.split("\n").map((l) => l.trim()).filter(Boolean).pop();
  return line ? `No se pudo leer el enlace: ${line}` : `No se pudo leer el enlace de ${name}.`;
}

function itemKind(entry) {
  const ext = String(entry.ext || "").toLowerCase();
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "image";
  if (entry.vcodec === "none" && !entry.duration) return "image";
  if (entry.duration || entry.vcodec || ["mp4", "m4a", "webm", "mov"].includes(ext)) return "video";
  return entry.url?.includes(".mp4") ? "video" : "image";
}

function isProgressiveFormat(format) {
  if (!format?.url) return false;
  const id = String(format.format_id || "");
  const proto = String(format.protocol || "https");
  if (id.startsWith("dash-") || proto.includes("dash") || proto.includes("m3u8") || proto.includes("hls")) return false;
  if (format.acodec === "none") return false;
  if (format.vcodec === "none") return false;
  return true;
}

function pickDirectUrl(entry) {
  if (isProgressiveFormat(entry) && entry.url) return entry;
  const formats = Array.isArray(entry.formats) ? entry.formats.filter(isProgressiveFormat) : [];
  if (!formats.length) return null;
  formats.sort((a, b) => (a.height || 0) - (b.height || 0));
  return formats.at(-1);
}

function bestDimensions(entry) {
  let width = entry.width || null;
  let height = entry.height || null;
  for (const format of entry.formats || []) {
    if ((format.height || 0) > (height || 0)) {
      width = format.width || null;
      height = format.height || null;
    }
  }
  return { width, height };
}

function asItem(entry, platform) {
  const kind = itemKind(entry);
  const chosen = platform === "youtube" ? null : pickDirectUrl(entry);
  const dims = bestDimensions(entry);
  const ext = platform === "youtube"
    ? "mp4"
    : ((chosen?.ext || entry.ext || (kind === "video" ? "mp4" : "jpg")).replace(/[^a-z0-9]/gi, "") || (kind === "video" ? "mp4" : "jpg"));
  return {
    id: String(entry.id || randomUUID()),
    kind,
    platform,
    title: entry.title || entry.fulltitle || `Video de ${PLATFORM_LABEL[platform]}`,
    uploader: entry.uploader || entry.channel || entry.creator || entry.uploader_id || "",
    thumbnail: entry.thumbnail || entry.thumbnails?.at(-1)?.url || "",
    url: chosen?.url || "",
    webpageUrl: entry.webpage_url || entry.original_url || "",
    httpHeaders: entry.http_headers || { Referer: PLATFORM_REFERER[platform] },
    ext,
    width: chosen?.width || dims.width,
    height: chosen?.height || dims.height,
    duration: entry.duration || null,
    filesize: chosen?.filesize || entry.filesize || entry.filesize_approx || null,
  };
}

function normalizeInfo(data, originalUrl, platform) {
  const entries = data._type === "playlist" && Array.isArray(data.entries)
    ? data.entries.filter(Boolean)
    : [data];
  const items = entries.map((entry) => asItem(entry, platform)).filter((item) => item.url || item.webpageUrl);
  if (!items.length) {
    throw new Error(`${PLATFORM_LABEL[platform]} no devolvió un archivo para ese enlace.`);
  }
  return {
    title: data.title || items[0].title,
    uploader: data.uploader || items[0].uploader,
    thumbnail: data.thumbnail || items[0].thumbnail,
    originalUrl,
    platform,
    items,
  };
}

function pruneJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}

function rateLimited() {
  const now = Date.now();
  while (hits.length && now - hits[0] > 5 * 60 * 1000) hits.shift();
  if (hits.length >= 24) return true;
  hits.push(now);
  return false;
}

function readBody(req, limit = 16_384) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Petición demasiado grande."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function safeName(job, item, index) {
  const who = (item.uploader || item.platform || "video").replace(/[^\w.-]+/g, "_").slice(0, 40);
  const id = (item.id || `item-${index + 1}`).replace(/[^\w.-]+/g, "_").slice(0, 40);
  return `${who}-${id}.${item.ext}`;
}

function encodeFilename(name) {
  return `attachment; filename="${name.replace(/"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function contentTypeFor(ext, kind) {
  if (ext === "mp4" || ext === "mov") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return kind === "video" ? "video/mp4" : "application/octet-stream";
}

async function downloadViaYtdlp(res, item, filename) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mercurio-"));
  const output = path.join(dir, "media.%(ext)s");
  const args = ["--no-warnings", "--socket-timeout", "20", "-o", output];
  if (item.platform === "youtube") {
    args.push("-f", "bv*+ba/b", "--merge-output-format", "mp4");
  } else {
    args.push("-f", "b");
  }
  if (item.platform !== "instagram") args.push("--no-playlist");
  if (fs.existsSync(COOKIES_FILE)) args.push("--cookies", COOKIES_FILE);
  args.push(item.webpageUrl);
  try {
    await runYtdlp(args, { timeoutMs: item.platform === "youtube" ? 180000 : 120000, platform: item.platform });
    const file = fs.readdirSync(dir).find((name) => name.startsWith("media."));
    if (!file) throw new Error("No se pudo guardar el archivo.");
    const full = path.join(dir, file);
    const ext = path.extname(file).slice(1);
    const stat = fs.statSync(full);
    res.writeHead(200, {
      "Content-Type": contentTypeFor(ext, item.kind),
      "Content-Disposition": encodeFilename(filename.replace(/\.[^.]+$/, `.${ext}`)),
      "Content-Length": stat.size,
      "Cache-Control": "no-store",
    });
    fs.createReadStream(full).on("close", () => {
      fs.rmSync(dir, { recursive: true, force: true });
    }).pipe(res);
  } catch (err) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

async function proxyMedia(res, url, { filename, contentType, asAttachment, headers = {} }) {
  const upstream = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Referer: "https://www.instagram.com/",
      Accept: "*/*",
      ...headers,
    },
    redirect: "follow",
  });
  if (!upstream.ok || !upstream.body) {
    throw new Error("No se pudo descargar el archivo. El enlace puede haber caducado; vuelve a analizarlo.");
  }
  const type = upstream.headers.get("content-type") || contentType;
  const outHeaders = {
    "Content-Type": type,
    "Cache-Control": asAttachment ? "no-store" : "private, max-age=120",
  };
  if (asAttachment) outHeaders["Content-Disposition"] = encodeFilename(filename);
  const length = upstream.headers.get("content-length");
  if (length) outHeaders["Content-Length"] = length;
  res.writeHead(200, outHeaders);
  Readable.fromWeb(upstream.body).pipe(res);
}

function serveStatic(req, res) {
  const url = new URL(req.url, "http://127.0.0.1");
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  const resolved = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No encontrado");
      return;
    }
    const ext = path.extname(resolved);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      let version = null;
      try {
        const { stdout } = await runYtdlp(["--version"], { timeoutMs: 8000 });
        version = stdout.trim();
      } catch {
        version = null;
      }
      json(res, 200, {
        ok: Boolean(version),
        ytdlp: version,
        cookies: fs.existsSync(COOKIES_FILE),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/info") {
      if (rateLimited()) {
        json(res, 429, { error: "Demasiadas peticiones. Espera un minuto para no saturar el sitio." });
        return;
      }
      const body = JSON.parse((await readBody(req)) || "{}");
      const { url: mediaUrl, platform } = assertSupportedUrl(body.url);
      const args = [
        "-J",
        "--no-warnings",
        "--socket-timeout",
        "20",
        "--retries",
        "2",
      ];
      if (platform !== "instagram") args.push("--no-playlist");
      if (fs.existsSync(COOKIES_FILE)) args.push("--cookies", COOKIES_FILE);
      args.push(mediaUrl);
      const { stdout } = await runYtdlp(args, {
        timeoutMs: platform === "youtube" ? 90000 : 45000,
        platform,
      });
      const parsed = JSON.parse(stdout);
      const info = normalizeInfo(parsed, mediaUrl, platform);
      pruneJobs();
      const id = randomUUID();
      jobs.set(id, { ...info, createdAt: Date.now() });
      json(res, 200, {
        id,
        platform,
        title: info.title,
        uploader: info.uploader,
        thumbnail: `/api/thumb/${id}/0`,
        items: info.items.map((item, index) => ({
          index,
          kind: item.kind,
          platform: item.platform,
          title: item.title,
          uploader: item.uploader,
          ext: item.ext,
          width: item.width,
          height: item.height,
          duration: item.duration,
          filesize: item.filesize,
          preview: `/api/thumb/${id}/${index}`,
          download: `/api/download/${id}/${index}`,
        })),
      });
      return;
    }

    const thumb = url.pathname.match(/^\/api\/thumb\/([^/]+)\/(\d+)$/);
    if (req.method === "GET" && thumb) {
      const job = jobs.get(thumb[1]);
      const item = job?.items[Number(thumb[2])];
      if (!item?.thumbnail) {
        json(res, 404, { error: "Vista previa no disponible." });
        return;
      }
      await proxyMedia(res, item.thumbnail, {
        filename: "preview.jpg",
        contentType: "image/jpeg",
        asAttachment: false,
        headers: item.httpHeaders,
      });
      return;
    }

    const dl = url.pathname.match(/^\/api\/download\/([^/]+)\/(\d+)$/);
    if (req.method === "GET" && dl) {
      const job = jobs.get(dl[1]);
      const index = Number(dl[2]);
      const item = job?.items[index];
      if (!item) {
        json(res, 404, { error: "Esa descarga caducó. Vuelve a pegar el enlace." });
        return;
      }
      const filename = safeName(job, item, index);
      if (item.url) {
        try {
          await proxyMedia(res, item.url, {
            filename,
            contentType: contentTypeFor(item.ext, item.kind),
            asAttachment: true,
            headers: item.httpHeaders,
          });
          return;
        } catch {
          if (!item.webpageUrl || res.headersSent) throw new Error("No se pudo descargar el archivo. El enlace puede haber caducado; vuelve a analizarlo.");
        }
      }
      if (item.webpageUrl) {
        await downloadViaYtdlp(res, item, filename);
        return;
      }
      json(res, 502, { error: "No hay un archivo directo para descargar." });
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    json(res, 404, { error: "Ruta no encontrada." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error inesperado.";
    json(res, 400, { error: message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`OmniFetch listo → http://127.0.0.1:${PORT}`);
  console.log("Mercurio · Instagram, YouTube y TikTok · solo en tu ordenador.");
});
