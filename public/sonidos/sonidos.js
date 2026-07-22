// ==========================================================================
// Módulo de SONIDOS del Pomodoro.
//
// Genera los sonidos en el momento con la Web Audio API (sin archivos .mp3),
// así funciona también en la demo online (GitHub Pages) sin descargar nada.
//
// Expone window.Sonidos con métodos de nombre descriptivo:
//   - finDeEnfoque()     -> cuando termina el bloque de 25' y toca descansar
//   - finDeDescanso()    -> cuando termina el descanso
//   - pomodoroCompleto() -> al completar un ciclo entero (enfoque + descanso)
//   - subeNivel()        -> fanfarria al subir de nivel
//   - alternarSilencio() / estaSilenciado() -> control de mute
//   - habilitar()        -> desbloquea el audio tras un gesto del usuario
// ==========================================================================

window.Sonidos = (() => {
  const CLAVE_SILENCIO = 'neurofocus_silencio';
  let ctx = null;
  let silenciado = localStorage.getItem(CLAVE_SILENCIO) === '1';

  // Devuelve (creando si hace falta) el contexto de audio ya "despierto".
  function contexto() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }



  // Reproduce UNA nota (un beep) con una envolvente suave (fade in/out).
  function nota(frecuencia, inicio, duracion, volumen = 0.2, tipo = 'sine') {
    const c = contexto();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tipo;
    osc.frequency.value = frecuencia;

    const t = c.currentTime + inicio;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(volumen, t + 0.02);      // fade in
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duracion); // fade out

    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + duracion);
  }



  // Reproduce una MELODÍA = secuencia de notas [frecuencia, duración].
  function melodia(notas, volumen) {
    if (silenciado) return;
    let t = 0;
    for (const [frecuencia, duracion] of notas) {
      nota(frecuencia, t, duracion, volumen);
      t += duracion;
    }
  }



  // --- Sonidos con nombre (lo que usa la lógica del pomodoro) ---
  const finDeEnfoque     = () => melodia([[660, 0.15], [880, 0.25]], 0.2);            // asciende: hora de descansar
  const finDeDescanso    = () => melodia([[880, 0.15], [660, 0.25]], 0.2);            // desciende: volver a enfocar
  const pomodoroCompleto = () => melodia([[523, 0.12], [659, 0.12], [784, 0.30]], 0.25); // do–mi–sol
  const subeNivel        = () => melodia([[659, 0.1], [784, 0.1], [988, 0.1], [1319, 0.35]], 0.25); // fanfarria



  // --- Control de silencio ---
  function alternarSilencio() {
    silenciado = !silenciado;
    localStorage.setItem(CLAVE_SILENCIO, silenciado ? '1' : '0');
    return silenciado;
  }
  const estaSilenciado = () => silenciado;


  
  // Los navegadores bloquean el audio hasta el primer gesto del usuario:
  // llamamos a esto en el click de "Empezar" para dejarlo listo.
  function habilitar() { if (!silenciado) contexto(); }

  return { finDeEnfoque, finDeDescanso, pomodoroCompleto, subeNivel, alternarSilencio, estaSilenciado, habilitar };
})();
