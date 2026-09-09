# Mercurio / OmniFetch — Visión

> Fuente de verdad de producto. Léela antes de proponer features.
> Junto con `docs/01_arquitectura.md`.

---

## 1. Visión

Construir un **descargador local-first** para Instagram, YouTube y TikTok: pegar un enlace y guardar el archivo en el disco del usuario, sin publicidad, sin extensiones tóxicas y sin un servidor que intermedié el video.

La solución se compone de:

- **OmniFetch:** la interfaz (producto) en el navegador local.
- **Mercurio:** el software open source (Node + yt-dlp) que sirve esa UI y obtiene el archivo.
- **Landing pública:** sitio estático (Vercel) que explica el producto y apunta a `npx omnifetch` / el repo. **No** descarga videos en la nube.

La visión es mantener la copia **rápida, privada y propia**.

---

## 2. Problema

Las páginas tipo “download from Instagram” suelen mezclar la utilidad con anuncios, redirecciones y extensiones. El usuario quiere el mismo gesto (pegar enlace → guardar) sin ceder el control del tráfico.

---

## 3. Usuarios

Persona que quiere archivar **su** contenido o material que tiene derecho a conservar, en su propio ordenador.

---

## 4. Qué no es

- No es un hosting de videos.
- No es un bypass de cuentas privadas ajenas.
- No es un cliente oficial de Instagram, YouTube o TikTok.
- No corre el downloader en Vercel.

---

## 5. Reglas de negocio

1. Solo URLs de un post/video (no perfiles, canales ni playlists enteras).
2. El servidor HTTP escucha en localhost.
3. Uso responsable: contenido propio o con permiso.
4. `cookies.txt` es opcional y nunca se commitea.
5. La landing de Vercel no incluye el flujo de descarga.

---

## 6. Nombres

| Capa | Nombre |
|------|--------|
| Software / repo | Mercurio |
| Producto / UI | OmniFetch |
| Organización | Espacio del Habitante |
