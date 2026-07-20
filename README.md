# 🍅 Pomodoro Neuro

Un temporizador Pomodoro con **niveles** y **datos de neurociencia** orientados
al aprendizaje. Cada pomodoro completado (25' foco + 5' descanso) suma puntos;
al subir de nivel desbloqueás información y ejercicios, y se **ilumina la región
del cerebro 3D** correspondiente.

Monolito en **PHP sin framework** + frontend **SPA vanilla** con **Three.js**.

## 🚀 Ver la demo online

Publicado en GitHub Pages (modo estático, el progreso se guarda en tu navegador):

**https://lautarosaucedonicolas.github.io/Pomodoro/**

## 💻 Correr en local (con backend PHP)

Requisitos: **PHP 8+** y **Node** (solo para el comando `npm start`).

```bash
npm start
```

Abrí **http://127.0.0.1:8000**. En local el progreso se guarda en
`storage/progress.json` (más adelante: base de datos).

## 🧠 Cómo funciona

- **Hacer pomodoros**: temporizador 25/5, puntos y niveles. "Modo prueba"
  convierte los minutos en segundos para probar rápido.
- **Mi cerebro**: modelo 3D donde cada región anatómica (frontal, motor,
  hipocampo, parietal, temporal, occipital, cerebelo, tronco) tiene su color y
  se enciende al alcanzar el nivel que habla de ella.

## 🗂️ Estructura

```
public/          → docroot (index.php, app.html, css, js, vendor Three.js, assets)
src/             → PHP: Core (Router/Response), Controllers, Services, routes.php
data/levels.json → niveles + contenido de neurociencia
storage/         → progreso (JSON, ignorado por git)
.github/workflows/deploy.yml → publica el sitio estático en Pages
```

El frontend usa una capa de datos **dual** (`public/js/store.js`): si detecta el
backend PHP lo usa; si no (Pages), guarda el progreso en `localStorage`.

## 🧩 Modelo 3D

El cerebro (`public/assets/brain.glb`) proviene de un modelo descargado.
⚠️ **Verificá la licencia del modelo y agregá la atribución del autor acá**
antes de difundir la demo, si corresponde.

## 📄 Licencia

MIT (ver el código). El modelo 3D mantiene su licencia de origen.
