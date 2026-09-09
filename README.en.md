<div align="center">

<img src="docs/assets/omnifetch-logo.svg" alt="OmniFetch logo" width="96" />

# Mercurio

### OmniFetch — local Instagram, YouTube and TikTok downloader

Paste a link. The file lands on **your disk**.  
No ads. No extensions. No cloud locker.

[![License: MIT](https://img.shields.io/badge/License-MIT-7CFFD4.svg)](LICENSE)
![Node](https://img.shields.io/badge/Node-20+-3776AB?logo=nodedotjs&logoColor=white)
![Local-first](https://img.shields.io/badge/Local--first-%E2%9C%94-2ea44f)
![Release](https://img.shields.io/badge/release-v1.0.0-C5CCD6)

[Español](README.md) · **English** · [Vision](docs/00_vision.md) · [Architecture](docs/01_arquitectura.md) · [Features](docs/02_funcionalidades.md)

</div>

---

## What is this?

**Mercurio** is the open-source software. **OmniFetch** is the product: the UI you use to download.

It is not an ad-filled download website. It binds to `127.0.0.1`.

Use it only with content you own or have the right to save. Respect copyright and each platform’s terms.

---

## Quick start

Needs Node 20+, Python 3 (yt-dlp is installed into `.venv` on first run), and ffmpeg for YouTube.

```bash
git clone https://github.com/Espacio-del-Habitante/mercurio.git
cd mercurio
npm start
```

Open **http://127.0.0.1:3847**. Stop with `Ctrl + C`.

Later, when published to npm: `npx omnifetch`.

---

## License

MIT — see [`LICENSE`](LICENSE). Copyright 2026 Espacio del Habitante.
