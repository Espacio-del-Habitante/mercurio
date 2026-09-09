# Mercurio Codex Context

Responde siempre en español. Conserva nombres técnicos en inglés cuando sea más claro.

**Mercurio** es el software. **OmniFetch** es el producto (la UI).

Antes de escribir código, lee `docs/00_vision.md` y `docs/01_arquitectura.md`.

No mezcles la app local (`src/`, `public/`, `bin/`) con la landing (`site/`). La landing no debe llamar a `/api/info` ni a yt-dlp.

## App local

- `bin/cli.js`: arranque y bootstrap de yt-dlp.
- `src/server.js`: HTTP, validación de URLs, jobs, proxy y fallback yt-dlp.
- `public/`: OmniFetch. Mantén la estética mercurio (oscuro, plata, acento cian). No vuelvas a una plantilla tipo SaveFrom.

No saltes esas piezas. Reutiliza `assertSupportedUrl` y el flujo de jobs antes de crear endpoints nuevos.

## Landing

HTML/CSS estático en `site/`. Mismo lenguaje visual. CTA hacia el repo y `npx omnifetch`.

## Modo Ponytail

Senior pragmático: el mejor código es el que no hay que escribir. Confirma necesidad, reutiliza, standard library, luego código nuevo.
