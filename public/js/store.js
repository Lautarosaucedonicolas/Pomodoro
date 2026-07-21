// ==========================================================================
// Capa de datos del progreso (modo dual, por usuario).
//   - SERVIDOR (PHP): usa /api/... con el token del usuario (Authorization).
//   - LOCAL (Pages): replica la lógica y guarda en localStorage por usuario.
// Comparte la detección de backend con window.Auth.
// ==========================================================================

window.Store = (() => {
  const POINTS_PER_POMODORO = 20;
  let levelsCache = null;

  const isServer = () => window.Auth.isServer();
  const headers = () => window.Auth.authHeaders();
  const userId = () => (window.Auth.getUser() ? window.Auth.getUser().id : 'anon');
  const lsKey = () => 'neurofocus_progress_' + userId();

  // --- Modo LOCAL ---
  async function getLevels() {
    if (levelsCache) return levelsCache;
    levelsCache = await (await fetch('data/levels.json')).json();
    return levelsCache;
  }
  function readLocal() {
    try {
      const d = JSON.parse(localStorage.getItem(lsKey()));
      return { points: (d && +d.points) || 0, completedPomodoros: (d && +d.completedPomodoros) || 0 };
    } catch (_) {
      return { points: 0, completedPomodoros: 0 };
    }
  }
  function writeLocal(data) { localStorage.setItem(lsKey(), JSON.stringify(data)); }

  function levelForPoints(levels, points) {
    let c = 1;
    for (const lv of levels) if (points >= lv.pointsRequired) c = lv.level;
    return c;
  }
  function pointsForNextLevel(levels, points) {
    for (const lv of levels) if (points < lv.pointsRequired) return lv.pointsRequired;
    return null;
  }
  function buildState(levels, data) {
    return {
      points: data.points,
      completedPomodoros: data.completedPomodoros,
      pointsPerPomodoro: POINTS_PER_POMODORO,
      level: levelForPoints(levels, data.points),
      maxLevel: levels.length,
      nextLevelPoints: pointsForNextLevel(levels, data.points),
    };
  }
  function unlockedContent(levels, points) {
    return levels.map((lv) => {
      const unlocked = points >= lv.pointsRequired;
      return {
        level: lv.level, name: lv.name, pointsRequired: lv.pointsRequired,
        brainRegion: lv.brainRegion, unlocked,
        neuroLearning: unlocked ? lv.neuroLearning : null,
        neuroThinking: unlocked ? lv.neuroThinking : null,
        exercise: unlocked ? lv.exercise : null,
      };
    });
  }

  // --- Interfaz pública ---
  async function getProgress() {
    if (await isServer()) return (await fetch('api/progress', { headers: headers() })).json();
    return buildState(await getLevels(), readLocal());
  }

  async function completePomodoro() {
    if (await isServer()) {
      return (await fetch('api/pomodoro/complete', { method: 'POST', headers: headers() })).json();
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
    if (await isServer()) {
      return (await fetch('api/progress/reset', { method: 'POST', headers: headers() })).json();
    }
    const data = { points: 0, completedPomodoros: 0 };
    writeLocal(data);
    return buildState(await getLevels(), data);
  }

  async function getContent() {
    if (await isServer()) return (await fetch('api/content', { headers: headers() })).json();
    return { levels: unlockedContent(await getLevels(), readLocal().points) };
  }

  return { getProgress, completePomodoro, resetProgress, getContent };
})();
