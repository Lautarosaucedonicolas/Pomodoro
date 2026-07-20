// ==========================================================================
// Capa de datos del frontend (modo dual).
//
//  - MODO SERVIDOR: si el backend PHP responde (desarrollo local con
//    `npm start`), usa la API /api/... y guarda el progreso en el server.
//  - MODO LOCAL: si no hay PHP (por ej. publicado en GitHub Pages), replica
//    la misma lógica en el navegador y guarda el progreso en localStorage.
//
// Ambos modos exponen la misma interfaz, así que app.js y brain3d.js no
// necesitan saber cuál está activo.
// ==========================================================================

window.Store = (() => {
  const LS_KEY = 'pomodoro_neuro_progress';
  const POINTS_PER_POMODORO = 20;

  let mode = null;      // 'server' | 'local'
  let levelsCache = null;

  // --- Detección de modo (una sola vez) ---
  async function ensureMode() {
    if (mode) return mode;
    try {
      const r = await fetch('api/progress', { method: 'GET' });
      const ct = r.headers.get('content-type') || '';
      if (r.ok && ct.includes('json')) { mode = 'server'; return mode; }
    } catch (_) { /* sin backend */ }
    mode = 'local';
    return mode;
  }

  // --- Utilidades del modo LOCAL ---
  async function getLevels() {
    if (levelsCache) return levelsCache;
    const r = await fetch('data/levels.json');
    levelsCache = await r.json();
    return levelsCache;
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const d = raw ? JSON.parse(raw) : null;
      return { points: (d && +d.points) || 0, completedPomodoros: (d && +d.completedPomodoros) || 0 };
    } catch (_) {
      return { points: 0, completedPomodoros: 0 };
    }
  }

  function writeLocal(data) {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  }

  function levelForPoints(levels, points) {
    let current = 1;
    for (const lv of levels) if (points >= lv.pointsRequired) current = lv.level;
    return current;
  }

  function pointsForNextLevel(levels, points) {
    for (const lv of levels) if (points < lv.pointsRequired) return lv.pointsRequired;
    return null;
  }

  function buildState(levels, data) {
    const points = data.points;
    return {
      points,
      completedPomodoros: data.completedPomodoros,
      pointsPerPomodoro: POINTS_PER_POMODORO,
      level: levelForPoints(levels, points),
      maxLevel: levels.length,
      nextLevelPoints: pointsForNextLevel(levels, points),
    };
  }

  function unlockedContent(levels, points) {
    return levels.map((lv) => {
      const unlocked = points >= lv.pointsRequired;
      return {
        level: lv.level,
        name: lv.name,
        pointsRequired: lv.pointsRequired,
        brainRegion: lv.brainRegion,
        unlocked,
        neuroLearning: unlocked ? lv.neuroLearning : null,
        neuroThinking: unlocked ? lv.neuroThinking : null,
        exercise: unlocked ? lv.exercise : null,
      };
    });
  }

  // --- Interfaz pública ---
  async function getProgress() {
    if ((await ensureMode()) === 'server') {
      return (await fetch('api/progress')).json();
    }
    const levels = await getLevels();
    return buildState(levels, readLocal());
  }

  async function completePomodoro() {
    if ((await ensureMode()) === 'server') {
      return (await fetch('api/pomodoro/complete', { method: 'POST' })).json();
    }
    const levels = await getLevels();
    const data = readLocal();
    const before = levelForPoints(levels, data.points);
    data.completedPomodoros += 1;
    data.points += POINTS_PER_POMODORO;
    writeLocal(data);
    const state = buildState(levels, data);
    state.leveledUp = state.level > before;
    return state;
  }

  async function resetProgress() {
    if ((await ensureMode()) === 'server') {
      return (await fetch('api/progress/reset', { method: 'POST' })).json();
    }
    const levels = await getLevels();
    const data = { points: 0, completedPomodoros: 0 };
    writeLocal(data);
    return buildState(levels, data);
  }

  async function getContent() {
    if ((await ensureMode()) === 'server') {
      return (await fetch('api/content')).json();
    }
    const levels = await getLevels();
    return { levels: unlockedContent(levels, readLocal().points) };
  }

  return { getProgress, completePomodoro, resetProgress, getContent };
})();
