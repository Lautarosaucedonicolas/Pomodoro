// ==========================================================================
// Módulo de SONIDO AMBIENTE (fondo en loop mientras corre el pomodoro).
//
// A diferencia de sonidos.js (beeps cortos generados), acá reproducimos
// archivos reales (mp3) en bucle: lluvia, bosque, relajante.
//
// Dónde van los archivos:  public/sonidos/ambiente/
//   - lluvia.mp3
//   - bosque.mp3
//   - relajante.mp3
// (ver public/sonidos/ambiente/README.md para descargarlos)
//
// Expone window.Ambiente:
//   - reproducir()      -> arranca el sonido elegido (se llama al iniciar el timer)
//   - pausar()          -> lo detiene (al pausar/terminar el timer)
//   - seleccionar(clave)-> elige la pista ('ninguno' | 'lluvia' | 'bosque' | 'relajante')
//   - setVolumen(0..1)  -> volumen del fondo
//   - seleccionActual() / volumenActual()  -> para restaurar la UI
// ==========================================================================

window.Ambiente = (() => {
  const CLAVE_PISTA = 'neurofocus_ambiente';
  const CLAVE_VOLUMEN = 'neurofocus_ambiente_vol';

  // Manifiesto: clave -> archivo. Si agregás una pista nueva, sumala acá
  // y en el <select> del HTML.
  const PISTAS = {
    lluvia:    'sonidos/ambiente/lluvia.mp3',
    bosque:    'sonidos/ambiente/bosque.mp3',
    relajante: 'sonidos/ambiente/relajante.mp3',
  };

  let audio = null;   // elemento <audio> actual
  let sonando = false; // ¿el timer está corriendo?
  let seleccion = localStorage.getItem(CLAVE_PISTA) || 'ninguno';
  let volumen = parseFloat(localStorage.getItem(CLAVE_VOLUMEN) ?? '0.5');

  function crearAudio(src) {
    const a = new Audio(src);
    a.loop = true;        // se repite sin fin
    a.volume = volumen;
    return a;
  }

  // Arranca el fondo (si hay una pista elegida). Se llama al iniciar el timer.
  function reproducir() {
    sonando = true;
    const src = PISTAS[seleccion];
    if (!src) return; // 'ninguno' o clave desconocida -> silencio

    // (Re)creamos el audio si cambió la pista.
    if (!audio || !audio.src.endsWith(src)) {
      if (audio) audio.pause();
      audio = crearAudio(src);
    }
    audio.volume = volumen;
    audio.play().catch(() => {
      console.warn('[Ambiente] No se pudo reproducir', src, '— ¿está el archivo en public/sonidos/ambiente/?');
    });
  }

  // Detiene el fondo (al pausar o terminar el timer).
  function pausar() {
    sonando = false;
    if (audio) audio.pause();
  }

  // Cambia la pista elegida (y en vivo si el timer está corriendo).
  function seleccionar(clave) {
    seleccion = clave;
    localStorage.setItem(CLAVE_PISTA, clave);
    if (audio) { audio.pause(); audio = null; }
    if (sonando) reproducir();
  }

  function setVolumen(v) {
    volumen = v;
    localStorage.setItem(CLAVE_VOLUMEN, String(v));
    if (audio) audio.volume = v;
  }

  const seleccionActual = () => seleccion;
  const volumenActual = () => volumen;

  return { reproducir, pausar, seleccionar, setVolumen, seleccionActual, volumenActual };
})();
