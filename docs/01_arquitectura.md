# Mercurio / OmniFetch — Arquitectura

Léelo con `docs/00_vision.md`. No rediseñes estas capas sin preguntar.

---

## Vista rápida

```
OmniFetch (public/)  --fetch JSON-->  Mercurio HTTP (src/server.js)
                                            │
                                            └── yt-dlp (.venv o PATH)
                                                    │
                                                    Instagram / YouTube / TikTok
```

Landing Vercel (`site/`) es HTML estático. No habla con yt-dlp.

---

## Carpetas

| Ruta | Rol |
|------|-----|
| `bin/cli.js` | Ejecutable: comprueba Python, instala yt-dlp, arranca el server |
| `src/server.js` | HTTP en `127.0.0.1:3847`, API y estáticos |
| `public/` | UI OmniFetch |
| `site/` | Landing para Vercel |
| `docs/` | Visión, arquitectura, funcionalidades |

---

## API local

- `GET /api/health`
- `POST /api/info` body `{ url }`
- `GET /api/thumb/:jobId/:index`
- `GET /api/download/:jobId/:index`

Los jobs viven en memoria (~15 min). YouTube se descarga con yt-dlp + ffmpeg (`bv*+ba` → mp4). Instagram/TikTok intentan proxy al CDN y, si falla, yt-dlp.

---

## Por qué Vercel no descarga

yt-dlp necesita binario, disco, tiempo y una IP de usuario. Las funciones serverless cortan por timeout, no empaquetan ffmpeg con fiabilidad y las plataformas bloquean centros de datos. La landing solo documenta y enlaza el ejecutable local.

---

## Dependencias de runtime

- Node ≥ 20
- Python 3 + yt-dlp (venv del proyecto)
- ffmpeg recomendado (YouTube)
