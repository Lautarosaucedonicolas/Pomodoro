// ==========================================================================
// Cerebro 3D con Three.js (módulo ES).
//
// Intenta cargar un modelo anatómico realista (GLTF/GLB) desde MODEL_URL.
//   - Si el modelo trae lóbulos como mallas separadas, mapealos en
//     REGION_MESH_MAP para iluminarlos región por región (uno por nivel).
//   - Si no hay mapeo posible, entra en modo "progresivo": pinta todo el
//     cerebro de a poco según cuántos niveles llevás.
//   - Si el modelo no existe o falla, cae a un cerebro PROCEDURAL (no se
//     rompe la app).
//
// Cómo agregar tu modelo:
//   1. Poné el archivo en  public/assets/brain.glb
//   2. Abrí la consola del navegador (F12). Al cargar verás la lista de
//      nombres de mallas del modelo.
//   3. Completá REGION_MESH_MAP abajo: "texto del nombre" -> regionId.
//      Los regionId válidos son los brainRegion de data/levels.json:
//      prefrontal, motor, parietal, occipital, temporal, hippocampus,
//      cerebellum, brainstem.
// ==========================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- Configuración del modelo ---------------------------------------------
const MODEL_URL = 'assets/brain.glb';
const MODEL_TARGET_SIZE = 4.8;       // tamaño al que se escala el modelo
const MODEL_ROTATION = [0, 0, 0];    // [x,y,z] radianes, por si viene torcido

// Mapeo nombre-de-malla (substring, minúsculas) -> regionId.
// Completar después de ver los nombres en consola. Ejemplo:
//   'frontal': 'prefrontal',
//   'temporal_lobe': 'temporal',
const REGION_MESH_MAP = {
  // vacío por ahora -> el modelo entrará en modo "progresivo"
};

// --- Layout del cerebro PROCEDURAL (fallback) -----------------------------
const LAYOUT = {
  prefrontal:  { pos: [0.95, 0.45, 1.45], scale: [1.0, 0.95, 0.95], mirror: true },
  motor:       { pos: [1.00, 1.00, 0.35], scale: [0.9, 0.8, 0.9],  mirror: true },
  parietal:    { pos: [0.92, 0.85, -0.7], scale: [0.95, 0.85, 0.9], mirror: true },
  occipital:   { pos: [0.70, 0.15, -1.7], scale: [0.9, 0.9, 0.85], mirror: true },
  temporal:    { pos: [1.35, -0.55, 0.45], scale: [1.0, 0.7, 1.15], mirror: true },
  hippocampus: { pos: [0.55, -0.35, -0.1], scale: [0.8, 0.45, 0.9], mirror: true },
  cerebellum:  { pos: [0.0, -1.15, -1.55], scale: [1.6, 0.85, 0.95], mirror: false },
  brainstem:   { pos: [0.0, -1.55, -0.55], scale: [0.4, 1.0, 0.4],  mirror: false },
};

const BASE_RADIUS = 0.85;
const COLOR_LOCKED = new THREE.Color(0x22273f); // regiones aún bloqueadas (oscuro)
const COLOR_A = new THREE.Color(0xff6b5e);
const COLOR_B = new THREE.Color(0x6c8cff);

// --- Regiones anatómicas: color propio + posición aproximada -------------
// anchor = [arriba(0=abajo,1=arriba), frente(0=atrás,1=adelante)].
// El orden y los id coinciden con brainRegion de data/levels.json.
const REGION_DEFS = [
  { id: 'prefrontal',  color: 0xff5e5e, anchor: [0.62, 0.90] }, // rojo
  { id: 'motor',       color: 0xff9f1c, anchor: [0.90, 0.58] }, // naranja
  { id: 'hippocampus', color: 0xffe14d, anchor: [0.40, 0.46] }, // amarillo
  { id: 'parietal',    color: 0x5ee06b, anchor: [0.86, 0.30] }, // verde
  { id: 'temporal',    color: 0x2ee0c8, anchor: [0.30, 0.62] }, // turquesa
  { id: 'occipital',   color: 0x4d8bff, anchor: [0.55, 0.08] }, // azul
  { id: 'cerebellum',  color: 0xb07bff, anchor: [0.17, 0.20] }, // violeta
  { id: 'brainstem',   color: 0xff7ad0, anchor: [0.05, 0.45] }, // rosa
];
// Mapa rápido regionId -> "#rrggbb" para la UI (leyenda/tarjetas).
const REGION_HEX = Object.fromEntries(
  REGION_DEFS.map((d) => [d.id, '#' + d.color.toString(16).padStart(6, '0')])
);

// Ejes anatómicos de ESTE modelo (calibrado visualmente): Z=vertical, Y=frente/atrás.
const ANATOMY = { upAxis: 2, upSign: 1, frontAxis: 1, frontSign: 1 };

let scene, camera, renderer, controls, raycaster, pointer;
let container, tooltip, statusEl;
const regionMeshes = {};      // regionId -> [mesh, ...]
let progressiveMeshes = [];   // todas las mallas cuando no hay mapeo
let mode = 'procedural';      // 'regions' | 'progressive' | 'procedural'
let started = false;
let levelsData = [];
const unlockedBefore = new Set();

// ==========================================================================
// Geometría procedural con "surcos"
// ==========================================================================
function wrinkledGeometry() {
  const geo = new THREE.IcosahedronGeometry(BASE_RADIUS, 4);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const amp = 0.07;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const d = amp * (
      Math.sin(6.0 * v.x + 3.0 * v.y) +
      Math.sin(6.0 * v.y + 3.0 * v.z) +
      Math.sin(6.0 * v.z + 3.0 * v.x)
    );
    v.addScaledVector(n, d);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function paintableMaterial() {
  return new THREE.MeshStandardMaterial({
    color: COLOR_LOCKED, emissive: 0x000000, emissiveIntensity: 0,
    roughness: 0.75, metalness: 0.05,
  });
}

function registerRegionMesh(regionId, mesh) {
  mesh.userData.region = regionId;
  (regionMeshes[regionId] ||= []).push(mesh);
}

// ==========================================================================
// Cerebro PROCEDURAL (fallback)
// ==========================================================================
function buildProcedural() {
  mode = 'procedural';
  const brain = new THREE.Group();
  for (const [regionId, cfg] of Object.entries(LAYOUT)) {
    const [x, y, z] = cfg.pos;
    const makeAt = (px) => {
      const m = new THREE.Mesh(wrinkledGeometry(), paintableMaterial());
      m.position.set(px, y, z);
      m.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2]);
      registerRegionMesh(regionId, m);
      brain.add(m);
    };
    makeAt(x);
    if (cfg.mirror) makeAt(-x);
  }
  brain.position.y = 0.2;
  scene.add(brain);
  setStatus('');
  applyLevels();
}

// ==========================================================================
// Carga del modelo GLTF/GLB
// ==========================================================================
function loadModel() {
  setStatus('Cargando modelo 3D…');
  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => processModel(gltf),
    (xhr) => {
      if (xhr.total) setStatus(`Cargando modelo… ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
    },
    () => {
      // No hay modelo o falló -> cerebro procedural
      console.info('[Brain3D] No se pudo cargar', MODEL_URL, '→ usando cerebro procedural.');
      buildProcedural();
    }
  );
}

function processModel(gltf) {
  const root = gltf.scene;

  // Listar mallas (inspector) y aplicar material controlable
  const names = [];
  root.traverse((obj) => {
    if (obj.isMesh) {
      names.push(obj.name || '(sin nombre)');
      obj.material = paintableMaterial();
      // Modelos derivados de STL a veces no traen normales -> se verían negros.
      if (!obj.geometry.attributes.normal) obj.geometry.computeVertexNormals();

      const key = Object.keys(REGION_MESH_MAP).find((k) =>
        (obj.name || '').toLowerCase().includes(k.toLowerCase())
      );
      if (key) registerRegionMesh(REGION_MESH_MAP[key], obj);
      else progressiveMeshes.push(obj);
    }
  });
  console.log('[Brain3D] Mallas del modelo:', names);

  // 1) Escalar y rotar primero
  const box1 = new THREE.Box3().setFromObject(root);
  const size = box1.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  root.scale.setScalar(MODEL_TARGET_SIZE / maxDim);
  root.rotation.set(MODEL_ROTATION[0], MODEL_ROTATION[1], MODEL_ROTATION[2]);
  root.updateMatrixWorld(true);

  // 2) Recién ahora recalcular el centro real y llevarlo al origen (0,0,0)
  const box2 = new THREE.Box3().setFromObject(root);
  const center = box2.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.y -= center.y;
  root.position.z -= center.z;

  scene.add(root);

  const mappedRegions = Object.keys(regionMeshes).length;
  mode = mappedRegions > 0 ? 'regions' : 'spatial';
  if (mode === 'spatial') setupSpatialRegions();
  console.info(`[Brain3D] Modelo cargado. Modo: ${mode} (${mappedRegions} regiones mapeadas).`);
  setStatus('');
  applyLevels();
}

// Segmenta el cerebro en zonas anatómicas: a cada vértice le asigna la región
// (anchor) más cercana en el plano vertical/frente-atrás. Se calcula una sola vez.
function setupSpatialRegions() {
  const { upAxis, upSign, frontAxis, frontSign } = ANATOMY;
  const comp = (x, y, z, i) => (i === 0 ? x : i === 1 ? y : z);

  // Bounding box en los ejes anatómicos (todas las mallas comparten coordenadas).
  let uMin = Infinity, uMax = -Infinity, fMin = Infinity, fMax = -Infinity;
  progressiveMeshes.forEach((mesh) => {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = comp(x, y, z, upAxis) * upSign;
      const f = comp(x, y, z, frontAxis) * frontSign;
      if (u < uMin) uMin = u; if (u > uMax) uMax = u;
      if (f < fMin) fMin = f; if (f > fMax) fMax = f;
    }
  });
  const uSpan = (uMax - uMin) || 1;
  const fSpan = (fMax - fMin) || 1;

  progressiveMeshes.forEach((mesh) => {
    const geo = mesh.geometry;
    const p = geo.attributes.position;
    const reg = new Uint8Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const u = (comp(x, y, z, upAxis) * upSign - uMin) / uSpan;
      const f = (comp(x, y, z, frontAxis) * frontSign - fMin) / fSpan;
      let best = 0, bestD = Infinity;
      for (let r = 0; r < REGION_DEFS.length; r++) {
        const a = REGION_DEFS[r].anchor;
        const d = (u - a[0]) ** 2 + (f - a[1]) ** 2;
        if (d < bestD) { bestD = d; best = r; }
      }
      reg[i] = best;
    }
    geo.setAttribute('region', new THREE.BufferAttribute(reg, 1));
    if (!geo.attributes.color) {
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3));
    }
    mesh.material.vertexColors = true;
    mesh.material.color.set(0xffffff); // el color real lo dan los vértices
  });
}

// ==========================================================================
// Escena
// ==========================================================================
function initScene() {
  container = document.getElementById('brain3d-container');
  tooltip = document.getElementById('brain-tooltip');
  statusEl = document.getElementById('brain-status');

  const w = container.clientWidth || 600;
  const h = container.clientHeight || 440;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  camera.position.set(0, 0, 5.0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;
  controls.enablePan = false;
  controls.minDistance = 2.5;
  controls.maxDistance = 10;
  controls.target.set(0, 0, 0);

  // Luz neutra (blanca) para que los colores de cada región se vean fieles.
  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-4, -2, -3);
  scene.add(fill);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(-2, -2);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerleave', () => {
    pointer.set(-2, -2);
    tooltip.classList.add('hidden');
  });
  window.addEventListener('resize', onResize);

  started = true;
  loadModel();   // intenta GLTF; si falla, procedural
  animate();
}

// ==========================================================================
// Pintar según nivel
// ==========================================================================
function colorForLevel(level, maxLevel) {
  const t = maxLevel > 1 ? (level - 1) / (maxLevel - 1) : 0;
  return COLOR_A.clone().lerp(COLOR_B, t);
}

function applyLevels() {
  if (!started || levelsData.length === 0) return;

  if (mode === 'spatial') return applySpatial();

  const maxLevel = levelsData.length;
  levelsData.forEach((lv) => {
    const meshes = regionMeshes[lv.brainRegion];
    if (!meshes) return;
    const target = lv.unlocked ? colorForLevel(lv.level, maxLevel) : COLOR_LOCKED;
    const justUnlocked = lv.unlocked && !unlockedBefore.has(lv.brainRegion);
    meshes.forEach((mesh) => setMeshState(mesh, lv.unlocked, target, justUnlocked));
    if (lv.unlocked) unlockedBefore.add(lv.brainRegion);
  });
}

function applySpatial() {
  const unlockedSet = new Set(levelsData.filter((l) => l.unlocked).map((l) => l.brainRegion));
  const regionColors = REGION_DEFS.map((d) => new THREE.Color(d.color));

  progressiveMeshes.forEach((mesh) => {
    const geo = mesh.geometry;
    const reg = geo.attributes.region;
    const col = geo.attributes.color;
    if (!reg || !col) return;
    for (let i = 0; i < reg.count; i++) {
      const r = reg.getX(i);
      const c = unlockedSet.has(REGION_DEFS[r].id) ? regionColors[r] : COLOR_LOCKED;
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  });

  // Destello blanco al desbloquear una región nueva.
  const justGrew = unlockedSet.size > unlockedBefore.size;
  progressiveMeshes.forEach((mesh) => {
    mesh.material.emissive.set(0xffffff);
    mesh.material.emissiveIntensity = justGrew ? 0.5 : 0;
    mesh.userData.baseEmissive = 0;
  });

  unlockedBefore.clear();
  unlockedSet.forEach((id) => unlockedBefore.add(id));
}

function setMeshState(mesh, on, color, pulse) {
  mesh.material.color.copy(color);
  if (on) {
    mesh.material.emissive.copy(color);
    mesh.material.emissiveIntensity = pulse ? 1.4 : 0.4;
    mesh.userData.baseEmissive = 0.4;
  } else {
    mesh.material.emissive.setHex(0x000000);
    mesh.material.emissiveIntensity = 0;
    mesh.userData.baseEmissive = 0;
  }
}

// ==========================================================================
// Hover
// ==========================================================================
function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
  tooltip.style.top = (event.clientY - rect.top + 12) + 'px';
}

function updateHover() {
  if (!started) return;
  raycaster.setFromCamera(pointer, camera);
  const all = mode === 'spatial' ? progressiveMeshes : Object.values(regionMeshes).flat();
  const hits = raycaster.intersectObjects(all, false);
  if (hits.length > 0) {
    let region;
    if (mode === 'spatial') {
      const geo = hits[0].object.geometry;
      const idx = geo.attributes.region ? geo.attributes.region.getX(hits[0].face.a) : null;
      region = idx != null ? REGION_DEFS[idx].id : null;
    } else {
      region = hits[0].object.userData.region;
    }
    const lv = levelsData.find((l) => l.brainRegion === region);
    if (lv) {
      tooltip.innerHTML = lv.unlocked
        ? `<strong>Nivel ${lv.level}</strong> · ${lv.name}`
        : `🔒 Nivel ${lv.level} · ${lv.pointsRequired} pts`;
      tooltip.classList.remove('hidden');
      renderer.domElement.style.cursor = 'pointer';
      return;
    }
  }
  tooltip.classList.add('hidden');
  renderer.domElement.style.cursor = 'grab';
}

// ==========================================================================
// Loop
// ==========================================================================
function brainVisible() {
  const el = document.getElementById('view-brain');
  return el && el.classList.contains('active');
}

function animate() {
  requestAnimationFrame(animate);
  // No renderizar mientras el cerebro no está a la vista (ahorra CPU/GPU).
  if (!brainVisible()) return;
  controls.update();
  updateHover();
  Object.values(regionMeshes).flat().concat(progressiveMeshes).forEach((mesh) => {
    const base = mesh.userData.baseEmissive ?? 0;
    const cur = mesh.material.emissiveIntensity;
    if (Math.abs(cur - base) > 0.01) mesh.material.emissiveIntensity += (base - cur) * 0.05;
  });
  renderer.render(scene, camera);
}

function onResize() {
  if (!started || !container.clientWidth) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.classList.toggle('hidden', msg === '');
}

// ==========================================================================
// Datos + tarjetas
// ==========================================================================
async function fetchData() {
  const data = await window.Store.getContent();
  levelsData = data.levels || [];
  renderCards();
  applyLevels();
}

function renderCards() {
  const unlocked = levelsData.filter((l) => l.unlocked).length;
  document.getElementById('regions-count').textContent = unlocked;
  document.getElementById('regions-total').textContent = levelsData.length;
  const box = document.getElementById('brain-content');
  box.innerHTML = '';
  levelsData.forEach((lv) => {
    const card = document.createElement('div');
    card.className = 'brain-card' + (lv.unlocked ? '' : ' locked');
    const dot = `<span class="dot" style="background:${REGION_HEX[lv.brainRegion] || '#888'}"></span>`;
    card.innerHTML = lv.unlocked
      ? `<h3>${dot}Nivel ${lv.level} · ${lv.name}</h3>
         <div>${lv.neuroThinking}</div>
         <div class="ex">🏋️ Ejercicio: ${lv.exercise}</div>`
      : `<h3>${dot}Nivel ${lv.level} · 🔒</h3><div>Se desbloquea a los ${lv.pointsRequired} pts.</div>`;
    box.appendChild(card);
  });
}

// ==========================================================================
// Arranque perezoso
// ==========================================================================
function onBrainTabShown() {
  if (!started) initScene();
  else onResize();
}
const brainTab = document.querySelector('.tab[data-view="brain"]');
if (brainTab) brainTab.addEventListener('click', onBrainTabShown);

fetchData();

window.Brain3D = { refresh: fetchData };
