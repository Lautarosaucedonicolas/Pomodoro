# Sonidos ambiente (fondo del pomodoro)

Poné acá 3 archivos mp3 con estos nombres **exactos**:

```
public/sonidos/ambiente/lluvia.mp3
public/sonidos/ambiente/bosque.mp3
public/sonidos/ambiente/relajante.mp3
```

La app los reproduce en bucle mientras corre el pomodoro. Si un archivo no
está, esa opción simplemente no suena (no rompe nada).

## De dónde descargarlos (gratis y con licencia libre)

- **Pixabay** → https://pixabay.com/sound-effects/  ⭐ recomendado
  - Gratis, uso comercial, **sin atribución** obligatoria.
  - Buscá: `rain loop`, `forest ambience`, `relaxing ambient`, `calm meditation`.
  - Botón **Download** → formato MP3.

- **Mixkit** → https://mixkit.co/free-sound-effects/ambience/
  - Gratis, sin registro. Buscá "rain", "forest", "relax".

- **Freesound** → https://freesound.org
  - Enorme, pero **revisá la licencia** de cada sonido (elegí CC0 para no
    tener que atribuir). Requiere cuenta gratis.

- **YouTube Audio Library** (si tenés canal) → sonidos ambientales libres.

## Consejos

- Elegí pistas marcadas como **loop** o de varios minutos: al repetirse en
  bucle no se nota el corte.
- Pesá los archivos: 2–5 MB por pista está bien. Si son muy pesados (>15 MB),
  se tarda en cargar la primera vez.
- Renombralos exactamente `lluvia.mp3`, `bosque.mp3`, `relajante.mp3`.

## ¿Querés agregar más pistas?

1. Poné el mp3 acá (ej: `oceano.mp3`).
2. Agregá la clave en `PISTAS` dentro de `public/sonidos/ambiente.js`.
3. Agregá un `<option>` en el `<select id="ambiente-select">` de `public/app.html`.
