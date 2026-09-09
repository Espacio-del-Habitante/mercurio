const PLATFORMS = {
  instagram: {
    hint: "Reel, publicación o story. No el perfil.",
    wait: "Leyendo Instagram…",
    placeholder: "Pega un enlace de Instagram",
  },
  youtube: {
    hint: "Video o Short. No un canal ni una lista.",
    wait: "Leyendo YouTube…",
    placeholder: "Pega un enlace de YouTube o un Short",
  },
  tiktok: {
    hint: "Video de TikTok. No el perfil.",
    wait: "Leyendo TikTok…",
    placeholder: "Pega un enlace de TikTok",
  },
};

const form = document.querySelector("#form");
const input = document.querySelector("#url");
const submit = document.querySelector("#submit");
const paste = document.querySelector("#paste");
const statusEl = document.querySelector("#status");
const results = document.querySelector("#results");
const idle = document.querySelector("#idle");
const hint = document.querySelector("#hint");
const host = document.querySelector("#host");
const chips = document.querySelectorAll(".chip");

host.textContent = location.host;

function detectPlatform(value) {
  try {
    const hostName = new URL(value.trim()).hostname.toLowerCase().replace(/^(www|m|music)\./, "");
    if (hostName.includes("youtube") || hostName === "youtu.be") return "youtube";
    if (hostName.includes("tiktok")) return "tiktok";
    if (hostName.includes("instagram") || hostName === "instagr.am") return "instagram";
  } catch {
    return null;
  }
  return null;
}

function setPlatform(name) {
  const platform = PLATFORMS[name] ? name : "instagram";
  const copy = PLATFORMS[platform];
  document.body.dataset.platform = platform;
  hint.textContent = copy.hint;
  input.placeholder = copy.placeholder;
  chips.forEach((chip) => {
    const on = chip.dataset.platform === platform;
    chip.classList.toggle("is-active", on);
    chip.setAttribute("aria-selected", String(on));
  });
  if (location.hash.replace("#", "") !== platform) {
    history.replaceState(null, "", `#${platform}`);
  }
}

function showStatus(type, message) {
  statusEl.hidden = false;
  statusEl.className = `status ${type}`;
  statusEl.textContent = message;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
}

function formatMeta(item) {
  const bits = [];
  bits.push(item.kind === "video" ? "Video" : "Foto");
  if (item.width && item.height) bits.push(`${item.width}×${item.height}`);
  if (item.duration) bits.push(`${Math.round(item.duration)}s`);
  if (item.ext) bits.push(item.ext.toUpperCase());
  return bits.join(" · ");
}

function platformLabel(name) {
  return { instagram: "Instagram", youtube: "YouTube", tiktok: "TikTok" }[name] || "Video";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderResults(data) {
  idle.hidden = true;
  results.hidden = false;
  results.innerHTML = data.items.map((item) => `
    <article class="result">
      <img src="${item.preview}" alt="Vista previa de ${escapeHtml(item.title)}">
      <div class="meta">
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.uploader || platformLabel(item.platform || data.platform))} · ${escapeHtml(formatMeta(item))}</p>
        <div class="row">
          <a class="dl" href="${item.download}" download>Descargar ${item.kind === "video" ? "MP4" : "imagen"}</a>
          <span class="tag">${item.kind === "video" ? "En tu disco" : "Calidad original"}</span>
        </div>
      </div>
    </article>
  `).join("");
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    setPlatform(chip.dataset.platform);
    input.focus();
  });
});

window.addEventListener("hashchange", () => {
  setPlatform(location.hash.replace("#", ""));
});

input.addEventListener("input", () => {
  const detected = detectPlatform(input.value);
  if (detected) setPlatform(detected);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  results.hidden = true;
  results.innerHTML = "";
  idle.hidden = true;
  submit.disabled = true;
  paste.disabled = true;
  const detected = detectPlatform(input.value) || document.body.dataset.platform;
  if (detected) setPlatform(detected);
  showStatus("wait", PLATFORMS[detected]?.wait || "Leyendo el enlace…");

  try {
    const response = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo descargar.");
    if (data.platform) setPlatform(data.platform);
    hideStatus();
    renderResults(data);
  } catch (err) {
    idle.hidden = false;
    showStatus("error", err.message || "No se pudo leer ese enlace.");
  } finally {
    submit.disabled = false;
    paste.disabled = false;
  }
});

paste.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    input.value = text.trim();
    const detected = detectPlatform(input.value);
    if (detected) setPlatform(detected);
    input.focus();
  } catch {
    showStatus("error", "El navegador no permitió leer el portapapeles. Pega el enlace con ⌘V o Ctrl+V.");
  }
});

setPlatform(location.hash.replace("#", "") || "instagram");
