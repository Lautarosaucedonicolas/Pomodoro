// ==========================================================================
// NeuroFocus - frontend (SPA vanilla, sin framework)
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
const btnSonido = $('#btn-sonido');
const testMode = $('#test-mode');

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
    Sonidos.finDeEnfoque();
    phase = 'break';
    remaining = durationFor('break');
    render();
  } else {
    // Terminó el ciclo completo (enfoque + descanso) -> punto
    stop();
    const state = await Store.completePomodoro();
    if (state.leveledUp) {
      Sonidos.subeNivel();
      showToast(`¡Subiste al nivel ${state.level}! 🧠 Nuevo dato desbloqueado`);
    } else {
      Sonidos.pomodoroCompleto();
    }
    refreshDashboard();
    // Reinicia para el próximo pomodoro
    phase = 'work';
    remaining = durationFor('work');
    render();
  }
}

function start() {
  if (running) return;
  Sonidos.habilitar(); // desbloquea el audio con este gesto del usuario
  Ambiente.reproducir(); // sonido de fondo mientras corre el pomodoro
  running = true;
  timerId = setInterval(tick, 1000);
  btnStart.disabled = true;
  btnPause.disabled = false;
}

function pause() {
  running = false;
  clearInterval(timerId);
  Ambiente.pausar(); // corta el sonido de fondo al pausar/terminar
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

// Botón de sonido (🔊 / 🔇)
function refrescarBotonSonido() {
  btnSonido.textContent = Sonidos.estaSilenciado() ? '🔇' : '🔊';
}
btnSonido.addEventListener('click', () => {
  Sonidos.alternarSilencio();
  refrescarBotonSonido();
});
refrescarBotonSonido();

// Sonido ambiente (fondo en loop)
const ambienteSelect = $('#ambiente-select');
const ambienteVol = $('#ambiente-vol');
ambienteSelect.value = Ambiente.seleccionActual();
ambienteVol.value = Math.round(Ambiente.volumenActual() * 100);
ambienteSelect.addEventListener('change', () => Ambiente.seleccionar(ambienteSelect.value));
ambienteVol.addEventListener('input', () => Ambiente.setVolumen(ambienteVol.value / 100));

// ==========================================================================
// Dashboard: trae progreso + contenido y pinta todos los paneles.
// ==========================================================================
async function refreshDashboard() {
  const [state, content] = await Promise.all([Store.getProgress(), Store.getContent()]);
  const levels = content.levels || [];
  renderLevelbar(state);
  renderMisiones(state);
  renderLogros(state);
  renderDato(levels);
  renderEstadisticas(state);
  renderProximo(levels);
  if (window.Brain3D) window.Brain3D.refresh(); // repinta el cerebro 3D
}

// --- Barra superior: nivel + XP ---
function renderLevelbar(s) {
  $('#stat-level').textContent = s.level;
  const fill = $('#xp-fill');
  const text = $('#xp-text');
  if (s.nextLevelPoints === null) {
    fill.style.width = '100%';
    text.textContent = 'MÁX';
  } else {
    const pct = Math.min(100, Math.round((s.points / s.nextLevelPoints) * 100));
    fill.style.width = pct + '%';
    text.textContent = `${s.points} / ${s.nextLevelPoints} XP`;
  }
}

// --- Misiones (por ahora según pomodoros totales; en Fase 2 serán del día) ---
function renderMisiones(s) {
  const c = s.completedPomodoros;
  const misiones = [
    { label: 'Pomodoro 1', done: c >= 1 },
    { label: 'Pomodoro 2', done: c >= 2 },
    { label: 'Pomodoro 3', done: c >= 3 },
    { label: 'Tomar un descanso', done: c >= 1 },
  ];
  $('#misiones').innerHTML = misiones
    .map((m) => `<li class="${m.done ? 'done' : ''}"><span class="chk">${m.done ? '✅' : '⬜'}</span>${m.label}</li>`)
    .join('');
}

// --- Logros (derivados de los datos que ya tenemos) ---
function renderLogros(s) {
  const focusMin = s.completedPomodoros * WORK_MIN;
  const logros = [
    { label: 'Primer Pomodoro', done: s.completedPomodoros >= 1 },
    { label: '5 horas de estudio', done: focusMin >= 300 },
    { label: 'Primera semana', done: false }, // Fase 2 (racha)
    { label: 'Nivel 5', done: s.level >= 5 },
  ];
  $('#logros').innerHTML = logros
    .map((l) => `<li class="${l.done ? 'done' : 'locked'}"><span class="medal">${l.done ? '🏅' : '🔒'}</span>${l.label}</li>`)
    .join('');
}

// --- Dato desbloqueado: el del nivel más alto alcanzado ---
function renderDato(levels) {
  const unlocked = levels.filter((l) => l.unlocked);
  const actual = unlocked.length ? unlocked[unlocked.length - 1] : null;
  $('#dato-desbloqueado').textContent = actual
    ? actual.neuroLearning
    : 'Completá tu primer pomodoro para desbloquear tu primer dato.';
}

// --- Estadísticas ---
function renderEstadisticas(s) {
  const focusMin = s.completedPomodoros * WORK_MIN;
  const h = Math.floor(focusMin / 60);
  const m = focusMin % 60;
  const tiempo = h > 0 ? `${h} h ${m} min` : `${m} min`;
  const stats = [
    { icon: '⏱️', label: 'Tiempo enfocado', value: tiempo },
    { icon: '🍅', label: 'Pomodoros', value: s.completedPomodoros },
    { icon: '🔥', label: 'Mejor racha', value: '—' }, // Fase 2
    { icon: '⭐', label: 'Nivel', value: s.level },
  ];
  $('#stats-list').innerHTML = stats
    .map((st) => `<li><span>${st.icon} ${st.label}</span><strong>${st.value}</strong></li>`)
    .join('');
}

// --- Próximo desbloqueo: primer nivel bloqueado ---
function renderProximo(levels) {
  const next = levels.find((l) => !l.unlocked);
  $('#proximo').innerHTML = next
    ? `<div class="proximo-nivel">🔒 Nivel ${next.level}</div>
       <div class="proximo-item">🧠 ${next.name}</div>
       <div class="proximo-item">🏋️ Nuevo ejercicio</div>
       <div class="proximo-req">Alcanzá ${next.pointsRequired} XP</div>`
    : '¡Desbloqueaste todo el cerebro! 🎉';
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
  await Store.resetProgress();
  refreshDashboard();
});

// ==========================================================================
// Autenticación (UI)
// ==========================================================================
const appParts = ['#levelbar', '#topright', '#app-main', '#app-footer'];

function showApp(user) {
  $('#auth').classList.add('hidden');
  appParts.forEach((s) => $(s).classList.remove('hidden'));
  $('#user-name').textContent = user.name;
  render();
  if (window.Brain3D) window.Brain3D.ensure(); // inicia/redimensiona el cerebro 3D
  refreshDashboard();
}

function showAuth() {
  pause();
  appParts.forEach((s) => $(s).classList.add('hidden'));
  $('#auth').classList.remove('hidden');
  gotoAuthView('login');
}

function gotoAuthView(which) {
  $('#auth-login').classList.toggle('hidden', which !== 'login');
  $('#auth-register').classList.toggle('hidden', which !== 'register');
}

function setError(id, msg) { $('#' + id).textContent = msg; }

// Alternar login/registro
document.querySelectorAll('[data-goto]').forEach((a) => {
  a.addEventListener('click', (e) => { e.preventDefault(); gotoAuthView(a.dataset.goto); });
});

// Mostrar/ocultar contraseña
document.querySelectorAll('.pw-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});

// Botones "próximamente" (Google / olvidé contraseña)
document.querySelectorAll('[data-soon]').forEach((el) => {
  el.addEventListener('click', (e) => { e.preventDefault(); showToast('Esa función llega pronto 🙌'); });
});

// Login
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('login-error', '');
  const f = e.target;
  try {
    const user = await Auth.login({ email: f.email.value.trim(), password: f.password.value });
    showApp(user);
  } catch (err) {
    setError('login-error', err.message);
  }
});

// Registro
$('#form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  setError('register-error', '');
  const f = e.target;
  if (f.password.value !== f.confirm.value) {
    setError('register-error', 'Las contraseñas no coinciden');
    return;
  }
  try {
    const user = await Auth.register({
      name: f.name.value.trim(),
      email: f.email.value.trim(),
      password: f.password.value,
    });
    showApp(user);
  } catch (err) {
    setError('register-error', err.message);
  }
});

// Cerrar sesión
$('#btn-logout').addEventListener('click', async () => {
  await Auth.logout();
  showAuth();
});

// ==========================================================================
// Init
// ==========================================================================
(async function init() {
  render();
  const user = await Auth.me();
  if (user) showApp(user);
  else showAuth();
})();
