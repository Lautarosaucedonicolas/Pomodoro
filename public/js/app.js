// ==========================================================================
// Pomodoro Neuro - frontend (SPA vanilla, sin framework)
// ==========================================================================

const WORK_MIN = 25;
const BREAK_MIN = 5;

// Estado del timer
let phase = 'work';          // 'work' | 'break'
let remaining = WORK_MIN * 60;
let timerId = null;
let running = false;

// Los datos (progreso + contenido) los maneja window.Store (modo dual:
// servidor PHP si está disponible, o localStorage en hosting estático).

// --- Elementos ---
const $ = (sel) => document.querySelector(sel);
const clockEl = $('#clock');
const phaseLabel = $('#phase-label');
const btnStart = $('#btn-start');
const btnPause = $('#btn-pause');
const btnReset = $('#btn-reset');
const testMode = $('#test-mode');

// ==========================================================================
// Navegación entre secciones
// ==========================================================================
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    $('#view-' + tab.dataset.view).classList.add('active');
    if (tab.dataset.view === 'brain') loadContent(); // refresca el cerebro al entrar
  });
});

// ==========================================================================
// Timer
// ==========================================================================
function unit() {
  return testMode.checked ? 1 : 60; // en modo prueba, 1 "minuto" = 1 segundo
}

function durationFor(p) {
  return (p === 'work' ? WORK_MIN : BREAK_MIN) * unit();
}

function render() {
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  clockEl.textContent = testMode.checked ? `00:${remaining.toString().padStart(2, '0')}` : `${m}:${s}`;
  phaseLabel.textContent = phase === 'work' ? 'Enfoque' : 'Descanso';
}

function tick() {
  remaining -= 1;
  if (remaining <= 0) {
    onPhaseEnd();
    return;
  }
  render();
}

async function onPhaseEnd() {
  if (phase === 'work') {
    // Pasa a descanso
    phase = 'break';
    remaining = durationFor('break');
    render();
  } else {
    // Terminó el ciclo completo (enfoque + descanso) -> punto
    stop();
    const state = await Store.completePomodoro();
    applyState(state);
    if (state.leveledUp) {
      showToast(`¡Subiste al nivel ${state.level}! 🧠 Nuevo dato desbloqueado`);
    }
    loadContent();
    // Reinicia para el próximo pomodoro
    phase = 'work';
    remaining = durationFor('work');
    render();
  }
}

function start() {
  if (running) return;
  running = true;
  timerId = setInterval(tick, 1000);
  btnStart.disabled = true;
  btnPause.disabled = false;
}

function pause() {
  running = false;
  clearInterval(timerId);
  btnStart.disabled = false;
  btnPause.disabled = true;
}

function stop() {
  pause();
}

function resetTimer() {
  pause();
  phase = 'work';
  remaining = durationFor('work');
  render();
}

btnStart.addEventListener('click', start);
btnPause.addEventListener('click', pause);
btnReset.addEventListener('click', resetTimer);
testMode.addEventListener('change', resetTimer);

// ==========================================================================
// Progreso + contenido
// ==========================================================================
function applyState(s) {
  $('#stat-level').textContent = s.level;
  $('#stat-points').textContent = s.points;
  $('#pomo-count').textContent = s.completedPomodoros;

  // Barra hacia el próximo nivel
  const bar = $('#level-bar');
  if (s.nextLevelPoints === null) {
    bar.style.width = '100%';
    $('#next-level-text').textContent = '¡Nivel máximo alcanzado!';
  } else {
    const pct = Math.min(100, Math.round((s.points / s.nextLevelPoints) * 100));
    bar.style.width = pct + '%';
    $('#next-level-text').textContent =
      `Faltan ${s.nextLevelPoints - s.points} pts para el nivel ${s.level + 1} (cada pomodoro = ${s.pointsPerPomodoro} pts).`;
  }
}

async function loadState() {
  applyState(await Store.getProgress());
}

async function loadContent() {
  const { levels } = await Store.getContent();
  renderLearningList(levels);
  // El cerebro 3D (módulo brain3d.js) se refresca por su cuenta.
  if (window.Brain3D) window.Brain3D.refresh();
}

function renderLearningList(levels) {
  const ul = $('#learning-list');
  ul.innerHTML = '';
  levels.forEach((lv) => {
    const li = document.createElement('li');
    li.className = 'fact' + (lv.unlocked ? '' : ' locked');
    li.innerHTML = lv.unlocked
      ? `<div class="lvl">Nivel ${lv.level} · ${lv.name}</div><div>${lv.neuroLearning}</div>`
      : `<div class="lvl">Nivel ${lv.level} · 🔒 bloqueado</div><div>Alcanzá ${lv.pointsRequired} pts para desbloquear.</div>`;
    ul.appendChild(li);
  });
}

// ==========================================================================
// Toast
// ==========================================================================
let toastTimer = null;
function showToast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 4000);
}

// ==========================================================================
// Reset total
// ==========================================================================
$('#btn-reset-all').addEventListener('click', async () => {
  if (!confirm('¿Reiniciar todo el progreso?')) return;
  applyState(await Store.resetProgress());
  loadContent();
});

// ==========================================================================
// Init
// ==========================================================================
render();
loadState();
loadContent();
