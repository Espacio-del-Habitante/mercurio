<div align="center">

<img src="docs/assets/omnifetch-logo.svg" alt="OmniFetch logo" width="96" />

# Mercurio

### OmniFetch — descargador local de Instagram, YouTube y TikTok

Pega un enlace. El archivo llega a **tu disco**.  
Sin anuncios. Sin extensiones. Sin nube.

[![License: MIT](https://img.shields.io/badge/License-MIT-7CFFD4.svg)](LICENSE)
![Node](https://img.shields.io/badge/Node-20+-3776AB?logo=nodedotjs&logoColor=white)
![Local-first](https://img.shields.io/badge/Local--first-%E2%9C%94-2ea44f)
![Release](https://img.shields.io/badge/release-v1.0.0-C5CCD6)

**Español** · [English](README.en.md) · [Visión](docs/00_vision.md) · [Arquitectura](docs/01_arquitectura.md) · [Funcionalidades](docs/02_funcionalidades.md)

</div>

---

## ¿Qué es esto?

**Mercurio** es el software open source. **OmniFetch** es el producto: la interfaz con la que descargas.

Mercurio (mensajero) trae el archivo a tu máquina. No es un sitio web de descargas con publicidad. Corre en `127.0.0.1`.

| Sin OmniFetch | Con OmniFetch |
|---------------|---------------|
| Páginas con anuncios, redirecciones y “instala esta extensión” | Una ventana local, sin rastreo |
| El video pasa por un servidor de terceros | yt-dlp habla con la plataforma desde tu PC |
| Cuentas y captchas dudosos | Tú pegas el enlace; el MP4 cae en Descargas |

No es un servicio en la nube y **no aloja** videos. Respeta derechos de autor y las condiciones de cada plataforma. Úsalo con contenido tuyo o que tengas derecho a guardar.

---

## Qué incluye (v1)

- Instagram — fotos, Reels, publicaciones
- YouTube — videos y Shorts en MP4
- TikTok — video, sin marca de agua añadida por nosotros
- UI OmniFetch en el navegador
- `cookies.txt` opcional para contenido al que ya tienes acceso

Catálogo: [`docs/02_funcionalidades.md`](docs/02_funcionalidades.md).

---

## Cómo empezar

### Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- Python 3 (para [yt-dlp](https://github.com/yt-dlp/yt-dlp); OmniFetch lo instala en un `.venv` la primera vez)
- Opcional: [ffmpeg](https://ffmpeg.org) (recomendado para YouTube)

### Opción A — Un comando

Cuando el paquete esté en npm:

```bash
npx omnifetch
```

Hasta entonces, usa la opción B.

### Opción B — Clonar el repo

```bash
git clone https://github.com/Espacio-del-Habitante/mercurio.git
cd mercurio
npm start
```

Abre **http://127.0.0.1:3847**

Para apagar: en esa terminal, `Ctrl + C`.

### Opción C — Solo el servidor (yt-dlp ya instalado)

```bash
npm run server
```

---

## Privacidad

- No hay cuenta. No hay base de datos remota.
- Los enlaces salen de tu ordenador hacia Instagram, YouTube o TikTok para obtener el archivo. No los enviamos a Espacio del Habitante.
- No subas `cookies.txt` al git. Está en `.gitignore`.

---

## API (resumen)

Base local: `http://127.0.0.1:3847`

| Método | Ruta | Acción |
|--------|------|--------|
| `GET` | `/api/health` | yt-dlp y cookies |
| `POST` | `/api/info` | `{ "url": "https://..." }` → metadatos y tokens de descarga |
| `GET` | `/api/thumb/:id/:index` | Miniatura |
| `GET` | `/api/download/:id/:index` | Archivo |

Detalle: [`docs/01_arquitectura.md`](docs/01_arquitectura.md).

---

## Documentación

| Doc | Contenido |
|-----|-----------|
| [`docs/00_vision.md`](docs/00_vision.md) | Producto, usuarios, reglas |
| [`docs/01_arquitectura.md`](docs/01_arquitectura.md) | Capas, carpetas, Vercel |
| [`docs/02_funcionalidades.md`](docs/02_funcionalidades.md) | Features v1 |
| [`AGENTS.md`](AGENTS.md) | Guía para agentes / colaboradores |

---

## Licencia y aviso

MIT — ver [`LICENSE`](LICENSE).

OmniFetch se ofrece “tal cual”. No sustituye las herramientas oficiales de cada red. No uses el software para infringir derechos de autor.

---

<div align="center">

**Tu enlace, tu disco, tu copia.**

</div>
