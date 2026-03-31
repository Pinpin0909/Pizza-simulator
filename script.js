/* ============================================================
   Pizzayolo Simulator – Game Logic (3D with Three.js)
   ============================================================ */

"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ── Constants ────────────────────────────────────────────────
const MAX_INGREDIENTS_BEFORE_PENALTY = 8;
const PIZZA_RADIUS       = 2.5;
const SAUCE_RADIUS       = 2.0;
const PIZZA_HEIGHT       = 0.22;
const TOPPING_Y          = PIZZA_HEIGHT / 2 + 0.07;
const BAKING_DURATION_MS = 2200;  // ms before the result modal appears

// ── Ingredient data ──────────────────────────────────────────
const INGREDIENTS = {
  pate: [
    { id: "classique",   label: "Classique",              emoji: "🫓" },
    { id: "fine",        label: "Fine & croustillante",   emoji: "🥖" },
    { id: "epaisse",     label: "Épaisse",                emoji: "🍞" },
    { id: "napolitaine", label: "Napolitaine",             emoji: "🥯" },
    { id: "sans_gluten", label: "Sans gluten",             emoji: "🌾" },
    { id: "integrale",   label: "Intégrale",               emoji: "🌿" },
  ],
  base: [
    { id: "tomate",      label: "Coulis tomate",          emoji: "🍅" },
    { id: "creme",       label: "Crème fraîche",          emoji: "🥛" },
    { id: "pesto",       label: "Pesto",                  emoji: "🌿" },
    { id: "bbq",         label: "Barbecue",               emoji: "🔥" },
    { id: "huile_olive", label: "Huile d'olive",          emoji: "🫒" },
    { id: "sans_base",   label: "Sans base",              emoji: "⬜" },
  ],
  fromage: [
    { id: "mozzarella",  label: "Mozzarella",             emoji: "🧀" },
    { id: "emmental",    label: "Emmental",               emoji: "🫕" },
    { id: "parmesan",    label: "Parmesan",               emoji: "🧀" },
    { id: "gorgonzola",  label: "Gorgonzola",             emoji: "💙" },
    { id: "chevre",      label: "Fromage de chèvre",      emoji: "🐐" },
    { id: "cheddar",     label: "Cheddar",                emoji: "🟠" },
    { id: "gruyere",     label: "Gruyère",                emoji: "🫕" },
    { id: "ricotta",     label: "Ricotta",                emoji: "⬜" },
  ],
  garniture: [
    { id: "jambon",      label: "Jambon",                 emoji: "🍖" },
    { id: "pepperoni",   label: "Pepperoni",              emoji: "🌶️" },
    { id: "champignons", label: "Champignons",            emoji: "🍄" },
    { id: "poivrons",    label: "Poivrons",               emoji: "🫑" },
    { id: "oignons",     label: "Oignons",                emoji: "🧅" },
    { id: "olives",      label: "Olives",                 emoji: "🫒" },
    { id: "tomates",     label: "Tomates cerises",        emoji: "🍅" },
    { id: "basilic",     label: "Basilic frais",          emoji: "🌿" },
    { id: "roquette",    label: "Roquette",               emoji: "🥬" },
    { id: "artichauts",  label: "Artichauts",             emoji: "🌵" },
    { id: "anchois",     label: "Anchois",                emoji: "🐟" },
    { id: "poulet",      label: "Poulet grillé",          emoji: "🍗" },
    { id: "thon",        label: "Thon",                   emoji: "🐠" },
    { id: "merguez",     label: "Merguez",                emoji: "🌭" },
    { id: "epinards",    label: "Épinards",               emoji: "🥬" },
  ],
  autres: [
    { id: "oeufs",       label: "Œufs",                   emoji: "🥚" },
    { id: "capres",      label: "Câpres",                 emoji: "🟢" },
    { id: "piment",      label: "Piment",                 emoji: "🌶️" },
    { id: "ail",         label: "Ail",                    emoji: "🧄" },
    { id: "herbes",      label: "Herbes de Provence",     emoji: "🌿" },
    { id: "miel",        label: "Miel",                   emoji: "🍯" },
    { id: "noix_pin",    label: "Noix de pin",            emoji: "🌰" },
    { id: "truffe",      label: "Truffe",                 emoji: "⚫" },
    { id: "noix",        label: "Noix",                   emoji: "🥜" },
    { id: "figues",      label: "Figues",                 emoji: "🍇" },
  ],
};

// ── State ────────────────────────────────────────────────────
const state = {
  pate:      null,
  base:      null,
  fromage:   new Set(),
  garniture: new Set(),
  autres:    new Set(),
};

// ── Pizza visual colours ─────────────────────────────────────
const DOUGH_COLORS = {
  classique:   "#f5deb3",
  fine:        "#f0c87a",
  epaisse:     "#e8b86d",
  napolitaine: "#d4955a",
  sans_gluten: "#e8d9b5",
  integrale:   "#c8a97a",
};

const BASE_COLORS = {
  tomate:      "#c0392b",
  creme:       "#f5f5dc",
  pesto:       "#4a7c59",
  bbq:         "#5c3317",
  huile_olive: "#d4c87a",
  sans_base:   null,
};

// ── DOM refs ─────────────────────────────────────────────────
let selectedList;
let bakeBtn;
let resetBtn;
let resultModal;
let overlay;
let resultTitle;
let resultStars;
let resultDescription;
let resultRecap;
let closeResultBtn;

// ── Three.js state ───────────────────────────────────────────
let scene, camera, renderer, controls;
let pizzaGroup = null;
let isBaking   = false;
let bakingStart = 0;
let lastFrameTime = 0;  // for frame-rate independent animations

// ── Three.js init ────────────────────────────────────────────
function initThreeJS() {
  const container = document.getElementById("pizza-canvas");
  const w = container.clientWidth || 380;
  const h = 360;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfdf6ec);

  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.set(0, 5.8, 4.8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Ambient light
  scene.add(new THREE.AmbientLight(0xfff5e0, 0.8));

  // Key light (sun from upper-right)
  const sun = new THREE.DirectionalLight(0xfffbe0, 1.1);
  sun.position.set(4, 10, 6);
  sun.castShadow = true;
  sun.shadow.camera.near   = 0.1;
  sun.shadow.camera.far    = 30;
  sun.shadow.camera.top    = 7;
  sun.shadow.camera.bottom = -7;
  sun.shadow.camera.left   = -7;
  sun.shadow.camera.right  = 7;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  // Fill light (cool blue from left)
  const fill = new THREE.DirectionalLight(0xc8d8ff, 0.3);
  fill.position.set(-5, 4, -4);
  scene.add(fill);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.minDistance = 3;
  controls.maxDistance = 14;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.update();

  // Pizza group (all pizza meshes live here)
  pizzaGroup = new THREE.Group();
  scene.add(pizzaGroup);

  // Wooden table surface
  buildTable();

  // Initial (empty) pizza
  rebuild3DPizza();

  // Start render loop
  requestAnimationFrame(animateLoop);

  window.addEventListener("resize", onCanvasResize);
}

function buildTable() {
  const cv  = document.createElement("canvas");
  cv.width  = 256;
  cv.height = 256;
  const ctx = cv.getContext("2d");

  // Base wood colour
  ctx.fillStyle = "#c8936a";
  ctx.fillRect(0, 0, 256, 256);

  // Wood grain lines
  for (let i = 0; i < 20; i++) {
    const y = (i / 20) * 256 + (Math.random() * 12 - 6);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(
      64,  y + (Math.random() - 0.5) * 18,
      192, y + (Math.random() - 0.5) * 18,
      256, y
    );
    const r = (100 + Math.random() * 40) | 0;
    const g = (55  + Math.random() * 20) | 0;
    const b = (10  + Math.random() * 15) | 0;
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.18 + Math.random() * 0.12})`;
    ctx.lineWidth   = 1 + Math.random() * 2.5;
    ctx.stroke();
  }

  const woodTex  = new THREE.CanvasTexture(cv);
  const tableGeo = new THREE.CircleGeometry(7, 64);
  const tableMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.85 });
  const table    = new THREE.Mesh(tableGeo, tableMat);
  table.rotation.x    = -Math.PI / 2;
  table.position.y    = -(PIZZA_HEIGHT / 2) - 0.005;
  table.receiveShadow = true;
  scene.add(table);
}

function onCanvasResize() {
  const container = document.getElementById("pizza-canvas");
  if (!container || !renderer) return;
  const w = container.clientWidth;
  const h = 360;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function animateLoop(timestamp) {
  requestAnimationFrame(animateLoop);

  // Delta time in seconds, capped at 100 ms to avoid big jumps after tab focus
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
  lastFrameTime = timestamp;

  controls.update();

  if (pizzaGroup) {
    if (isBaking) {
      const t = (Date.now() - bakingStart) / 1000;
      // ~4 full rotations/sec during baking, frame-rate independent
      pizzaGroup.rotation.y += 4 * Math.PI * dt;
      pizzaGroup.position.y  = Math.sin(t * 13) * 0.07;
      const s = 1 + Math.sin(t * 10) * 0.025;
      pizzaGroup.scale.set(s, s, s);
    } else {
      // Gentle auto-rotation: ~0.25 rad/sec, frame-rate independent
      pizzaGroup.rotation.y += 0.25 * dt;
      pizzaGroup.position.y  = 0;
      pizzaGroup.scale.set(1, 1, 1);
    }
  }

  renderer.render(scene, camera);
}

// ── Helpers ──────────────────────────────────────────────────
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRand(seed, i) {
  const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Scatter N positions deterministically within the sauce area
function pizzaPositions(id, count) {
  const seed = hashStr(id);
  return Array.from({ length: count }, (_, i) => {
    const r = 0.15 + seededRand(seed, i * 2)     * (SAUCE_RADIUS - 0.35);
    const θ = seededRand(seed, i * 2 + 1) * Math.PI * 2;
    return new THREE.Vector3(r * Math.cos(θ), 0, r * Math.sin(θ));
  });
}

function withShadow(obj) {
  obj.traverse(c => {
    if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; }
  });
  return obj;
}

function disposeMeshes(obj) {
  obj.traverse(c => {
    if (!c.isMesh) return;
    c.geometry.dispose();
    const mats = Array.isArray(c.material) ? c.material : [c.material];
    mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}

// ── 3D ingredient factories ──────────────────────────────────

function makeCheeseBlob(color) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 8),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.88 })
  );
  m.scale.y  = 0.45;
  m.position.y = TOPPING_Y;
  return m;
}

function makePepperoni() {
  const g = new THREE.Group();
  // Red disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.045, 24),
    new THREE.MeshStandardMaterial({ color: 0xaa1111, roughness: 0.72 })
  );
  disc.position.y = TOPPING_Y;
  g.add(disc);
  // Fat-speck markings
  for (let i = 0; i < 5; i++) {
    // Offset seeds by different amounts so angle and radius sequences don't correlate
    const angle = seededRand(i, i * 7) * Math.PI * 2;
    const r     = seededRand(i + 10, i * 3) * 0.18;
    const speck = new THREE.Mesh(
      new THREE.SphereGeometry(0.016, 5, 4),
      new THREE.MeshStandardMaterial({ color: 0x6a0808 })
    );
    speck.position.set(r * Math.cos(angle), TOPPING_Y + 0.03, r * Math.sin(angle));
    g.add(speck);
  }
  return g;
}

function makeMushroom() {
  const g = new THREE.Group();
  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.09, 0.16, 10),
    new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 })
  );
  stem.position.y = TOPPING_Y + 0.08;
  g.add(stem);
  // Cap (hemisphere)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({ color: 0x8b6344, roughness: 0.85 })
  );
  cap.rotation.x  = Math.PI;
  cap.position.y  = TOPPING_Y + 0.17;
  g.add(cap);
  return g;
}

function makeCherryTomato() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xdd2200, roughness: 0.55, metalness: 0.04 })
  );
  m.position.y = TOPPING_Y + 0.12;
  return m;
}

function makeOlive() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.07, 10, 18),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = TOPPING_Y + 0.07;
  g.add(ring);
  // Red pimento centre
  const center = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10),
    new THREE.MeshStandardMaterial({ color: 0xcc3300 })
  );
  center.position.y = TOPPING_Y + 0.07;
  g.add(center);
  return g;
}

function makeJambon() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.045, 7),
    new THREE.MeshStandardMaterial({ color: 0xf4a3a3, roughness: 0.8 })
  );
  m.position.y = TOPPING_Y;
  return m;
}

function makePepperStrip(color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.042, 0.38),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  );
  m.position.y = TOPPING_Y;
  return m;
}

function makeOnionRing() {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(0.21, 0.042, 7, 18),
    new THREE.MeshStandardMaterial({ color: 0xfff8e0, roughness: 0.7, transparent: true, opacity: 0.85 })
  );
  m.rotation.x = Math.PI / 2;
  m.position.y = TOPPING_Y + 0.04;
  return m;
}

function makeBasilLeaf() {
  const cv  = document.createElement("canvas");
  cv.width  = 64;
  cv.height = 64;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#2d7a2d";
  ctx.beginPath();
  ctx.ellipse(32, 32, 27, 19, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a5c1a";
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(12, 32);
  ctx.bezierCurveTo(25, 20, 39, 20, 52, 32);
  ctx.stroke();
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.27),
    new THREE.MeshStandardMaterial({
      map: new THREE.CanvasTexture(cv),
      roughness: 0.85,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = TOPPING_Y;
  return m;
}

function makeLeaf(color) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.36),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = TOPPING_Y;
  return m;
}

function makeAnchovy() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.032, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 })
  );
  m.position.y = TOPPING_Y;
  return m;
}

function makeChicken() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.21),
    new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.85 })
  );
  m.position.y = TOPPING_Y + 0.03;
  return m;
}

function makeTuna() {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.045, 0.17),
    new THREE.MeshStandardMaterial({ color: 0xf4a460, roughness: 0.8 })
  );
  m.position.y = TOPPING_Y + 0.02;
  return m;
}

function makeSausage(color) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.072, 0.52, 14),
    new THREE.MeshStandardMaterial({ color, roughness: 0.68 })
  );
  m.rotation.z = Math.PI / 2;
  m.position.y = TOPPING_Y + 0.07;
  return m;
}

function makeEgg() {
  const g = new THREE.Group();
  const white = new THREE.Mesh(
    new THREE.SphereGeometry(0.30, 14, 8),
    new THREE.MeshStandardMaterial({ color: 0xfff8e1, roughness: 0.8 })
  );
  white.scale.y  = 0.35;
  white.position.y = TOPPING_Y + 0.06;
  g.add(white);
  const yolk = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffa500, roughness: 0.55 })
  );
  yolk.position.y = TOPPING_Y + 0.12;
  g.add(yolk);
  return g;
}

function makeCaper() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 7, 5),
    new THREE.MeshStandardMaterial({ color: 0x4a6741, roughness: 0.72 })
  );
  m.position.y = TOPPING_Y + 0.055;
  return m;
}

function makeChili() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.065, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: 0xff1e00, roughness: 0.7 })
  );
  body.rotation.z = Math.PI;
  body.position.y = TOPPING_Y + 0.19;
  g.add(body);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.09, 7),
    new THREE.MeshStandardMaterial({ color: 0x2d7a2d })
  );
  stem.position.y = TOPPING_Y + 0.045;
  g.add(stem);
  return g;
}

function makeGarlic() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 9, 7),
    new THREE.MeshStandardMaterial({ color: 0xfff5e0, roughness: 0.82 })
  );
  m.scale.set(1, 1.3, 0.82);
  m.position.y = TOPPING_Y + 0.1;
  return m;
}

function makeHerbDot() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a8a3a });
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 4), mat);
    // Small offsets baked-in per dot; positions are further randomised by caller
    s.position.set((i % 2 - 0.5) * 0.14, TOPPING_Y + 0.026, (Math.floor(i / 2) - 0.5) * 0.14);
    g.add(s);
  }
  return g;
}

function makeHoney() {
  const g   = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffcc00, roughness: 0.28, metalness: 0.15,
    transparent: true, opacity: 0.82,
  });
  for (let i = 0; i < 9; i++) {
    const r = 0.038 + seededRand(i + 50, i) * 0.038;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), mat);
    s.position.set(
      (seededRand(i, i * 2) - 0.5) * 0.52,
      TOPPING_Y + 0.03,
      (seededRand(i, i * 3) - 0.5) * 0.52
    );
    g.add(s);
  }
  return g;
}

function makePineNut() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.06, 0.13, 7),
    new THREE.MeshStandardMaterial({ color: 0xf5e6c8, roughness: 0.82 })
  );
  m.position.y = TOPPING_Y + 0.065;
  return m;
}

function makeTruffle() {
  const geo = new THREE.SphereGeometry(0.22, 11, 9);
  // Lump the surface for a realistic uneven truffle look
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // 22, 17, 11 are prime-like frequency multipliers that produce
    // an irregular bumpy surface without visible repeating patterns
    const d = 0.85 + Math.sin(x * 22 + y * 17 + z * 11) * 0.15;
    pos.setXYZ(i, x * d, y * d, z * d);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x1a0d00, roughness: 0.95, metalness: 0.1 })
  );
  m.position.y = TOPPING_Y + 0.15;
  return m;
}

function makeWalnut() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 9, 7, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 })
  );
  m.rotation.x = Math.PI;
  m.position.y = TOPPING_Y + 0.13;
  return m;
}

function makeFig() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 11, 9),
    new THREE.MeshStandardMaterial({ color: 0x7b3fa0, roughness: 0.76 })
  );
  m.scale.y  = 1.35;
  m.position.y = TOPPING_Y + 0.16;
  return m;
}

function makeArtichoke() {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.88 })
  );
  m.rotation.x = Math.PI;
  m.position.y = TOPPING_Y + 0.12;
  return m;
}

// ── Topping config map ───────────────────────────────────────
const POIVRON_COLORS = [0xff4500, 0x228b22, 0xffd700, 0xff6600, 0xcc0000];

const TOPPING_CONFIG = {
  // fromage
  mozzarella:  { count: 7,  maker: ()    => makeCheeseBlob("#fffaee") },
  emmental:    { count: 6,  maker: ()    => makeCheeseBlob("#ffd000") },
  parmesan:    { count: 10, maker: ()    => makeCheeseBlob("#ffe090") },
  gorgonzola:  { count: 5,  maker: ()    => makeCheeseBlob("#c5cbe8") },
  chevre:      { count: 6,  maker: ()    => makeCheeseBlob("#f7f7f7") },
  cheddar:     { count: 6,  maker: ()    => makeCheeseBlob("#ff8c00") },
  gruyere:     { count: 7,  maker: ()    => makeCheeseBlob("#daa520") },
  ricotta:     { count: 8,  maker: ()    => makeCheeseBlob("#fffaee") },
  // garniture
  jambon:      { count: 5,  maker: ()    => makeJambon() },
  pepperoni:   { count: 8,  maker: ()    => makePepperoni() },
  champignons: { count: 6,  maker: ()    => makeMushroom() },
  poivrons:    { count: 7,  maker: (i)   => makePepperStrip(POIVRON_COLORS[i % POIVRON_COLORS.length]) },
  oignons:     { count: 6,  maker: ()    => makeOnionRing() },
  olives:      { count: 7,  maker: ()    => makeOlive() },
  tomates:     { count: 6,  maker: ()    => makeCherryTomato() },
  basilic:     { count: 5,  maker: ()    => makeBasilLeaf() },
  roquette:    { count: 8,  maker: ()    => makeLeaf(0x1a5c1a) },
  artichauts:  { count: 5,  maker: ()    => makeArtichoke() },
  anchois:     { count: 6,  maker: ()    => makeAnchovy() },
  poulet:      { count: 6,  maker: ()    => makeChicken() },
  thon:        { count: 6,  maker: ()    => makeTuna() },
  merguez:     { count: 5,  maker: ()    => makeSausage(0xcc3300) },
  epinards:    { count: 7,  maker: ()    => makeLeaf(0x0d5c0d) },
  // autres
  oeufs:       { count: 1,  maker: ()    => makeEgg() },
  capres:      { count: 12, maker: ()    => makeCaper() },
  piment:      { count: 3,  maker: ()    => makeChili() },
  ail:         { count: 5,  maker: ()    => makeGarlic() },
  herbes:      { count: 10, maker: ()    => makeHerbDot() },
  miel:        { count: 3,  maker: ()    => makeHoney() },
  noix_pin:    { count: 12, maker: ()    => makePineNut() },
  truffe:      { count: 2,  maker: ()    => makeTruffle() },
  noix:        { count: 6,  maker: ()    => makeWalnut() },
  figues:      { count: 4,  maker: ()    => makeFig() },
};

// ── Build / rebuild the 3D pizza from current state ──────────
function rebuild3DPizza() {
  if (!pizzaGroup) return;

  // Dispose & remove all previous meshes
  while (pizzaGroup.children.length) {
    const c = pizzaGroup.children[0];
    disposeMeshes(c);
    pizzaGroup.remove(c);
  }

  const doughColor = new THREE.Color(
    state.pate ? (DOUGH_COLORS[state.pate] ?? "#f5deb3") : "#ede0c8"
  );
  const sauceColorStr = state.base ? BASE_COLORS[state.base] : null;
  const sauceColor    = sauceColorStr ? new THREE.Color(sauceColorStr) : null;

  // Pizza base disc (full crust)
  const crustMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(PIZZA_RADIUS, PIZZA_RADIUS, PIZZA_HEIGHT, 64),
    new THREE.MeshStandardMaterial({ color: doughColor, roughness: 0.92 })
  );
  pizzaGroup.add(withShadow(crustMesh));

  // Sauce layer (slightly raised, inset from the crust border)
  if (sauceColor) {
    const sauceMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(SAUCE_RADIUS, SAUCE_RADIUS, 0.06, 64),
      new THREE.MeshStandardMaterial({ color: sauceColor, roughness: 0.88 })
    );
    sauceMesh.position.y = PIZZA_HEIGHT / 2 + 0.03;
    pizzaGroup.add(withShadow(sauceMesh));
  }

  // Toppings
  for (const id of state.fromage)   placeToppings(id);
  for (const id of state.garniture) placeToppings(id);
  for (const id of state.autres)    placeToppings(id);
}

function placeToppings(id) {
  const cfg = TOPPING_CONFIG[id];
  if (!cfg) return;

  const seed      = hashStr(id);
  const positions = pizzaPositions(id, cfg.count);

  positions.forEach((pos, i) => {
    const mesh = cfg.maker(i);
    if (!mesh) return;
    mesh.position.x += pos.x;
    mesh.position.z += pos.z;
    // Deterministic y-rotation so orientation is consistent
    mesh.rotation.y += seededRand(seed, i * 3) * Math.PI * 2;
    pizzaGroup.add(withShadow(mesh));
  });
}

// ── Render ingredient buttons ────────────────────────────────
function renderIngredients() {
  for (const [category, items] of Object.entries(INGREDIENTS)) {
    const container = document.querySelector(`.ingredient-list[data-category="${category}"]`);
    items.forEach(item => {
      const btn = document.createElement("button");
      btn.className         = "ingredient-btn";
      btn.dataset.id        = item.id;
      btn.dataset.category  = category;
      btn.innerHTML         = `<span class="ing-emoji">${item.emoji}</span>${item.label}`;
      btn.addEventListener("click", () => toggleIngredient(category, item.id, btn));
      container.appendChild(btn);
    });
  }
}

// ── Toggle selection ─────────────────────────────────────────
function toggleIngredient(category, id, btn) {
  if (category === "pate" || category === "base") {
    const prev = document.querySelector(`.ingredient-btn.selected[data-category="${category}"]`);
    if (prev && prev !== btn) prev.classList.remove("selected");

    if (state[category] === id) {
      state[category] = null;
      btn.classList.remove("selected");
    } else {
      state[category] = id;
      btn.classList.add("selected");
    }
  } else {
    if (state[category].has(id)) {
      state[category].delete(id);
      btn.classList.remove("selected");
    } else {
      state[category].add(id);
      btn.classList.add("selected");
    }
  }

  rebuild3DPizza();
  updateSummary();
  updateBakeButton();
}

// ── Update text summary ──────────────────────────────────────
function updateSummary() {
  selectedList.innerHTML = "";

  const lines = [];

  const pushSingle = (cat, label) => {
    if (state[cat]) {
      const f = INGREDIENTS[cat].find(i => i.id === state[cat]);
      if (f) lines.push(`${f.emoji} ${label} : ${f.label}`);
    }
  };

  const pushMulti = (cat, label) => {
    state[cat].forEach(id => {
      const f = INGREDIENTS[cat].find(i => i.id === id);
      if (f) lines.push(`${f.emoji} ${label} : ${f.label}`);
    });
  };

  pushSingle("pate",  "Pâte");
  pushSingle("base",  "Base");
  pushMulti("fromage",   "Fromage");
  pushMulti("garniture", "Garniture");
  pushMulti("autres",    "Extra");

  if (lines.length === 0) {
    selectedList.innerHTML = `<li class="empty-msg">Aucun ingrédient sélectionné</li>`;
    return;
  }

  lines.forEach(line => {
    const li       = document.createElement("li");
    li.className   = "selected-item";
    li.textContent = line;
    selectedList.appendChild(li);
  });
}

// ── Enable/disable bake button ───────────────────────────────
function updateBakeButton() {
  bakeBtn.disabled = !(state.pate !== null && (state.fromage.size > 0 || state.garniture.size > 0));
}

// ── Scoring & result ─────────────────────────────────────────
const COMBOS = [
  {
    name: "Margherita Parfaite",
    emoji: "🌟",
    stars: 5,
    check: s =>
      s.base === "tomate" && s.fromage.has("mozzarella") &&
      s.garniture.has("basilic") && s.garniture.size <= 3,
    desc: "La quintessence de la pizza italienne ! Simple, fraîche et absolument délicieuse.",
  },
  {
    name: "Quattro Formaggi",
    emoji: "🧀",
    stars: 5,
    check: s => s.fromage.size >= 4,
    desc: "Quatre fromages, un délire gustatif ! Tu es clairement un fan de fromage.",
  },
  {
    name: "Regina",
    emoji: "👑",
    stars: 4,
    check: s =>
      s.base === "tomate" && s.fromage.has("mozzarella") &&
      s.garniture.has("jambon") && s.garniture.has("champignons"),
    desc: "Un grand classique bien équilibré. La Reine des pizzas !",
  },
  {
    name: "Pizza Barbecue",
    emoji: "🔥",
    stars: 4,
    check: s =>
      s.base === "bbq" && (s.garniture.has("poulet") || s.garniture.has("pepperoni")),
    desc: "Fumée, gourmande et pleine de caractère. Un barbecue en pizza !",
  },
  {
    name: "Végétarienne Gourmet",
    emoji: "🥬",
    stars: 4,
    check: s =>
      !s.garniture.has("jambon") && !s.garniture.has("pepperoni") &&
      !s.garniture.has("poulet") && !s.garniture.has("thon") &&
      !s.garniture.has("merguez") && !s.garniture.has("anchois") &&
      s.garniture.size >= 3,
    desc: "Fraîche, colorée et pleine de saveurs végétales. Bravo pour ce choix sain !",
  },
  {
    name: "Pizza Anchois-Câpres",
    emoji: "🐟",
    stars: 4,
    check: s => s.garniture.has("anchois") && s.autres.has("capres"),
    desc: "Un mélange méditerranéen audacieux. Les amateurs de saveurs intenses vont adorer.",
  },
  {
    name: "Pizza Truffe",
    emoji: "⚫",
    stars: 5,
    check: s => s.autres.has("truffe"),
    desc: "La truffe fait tout ! Une pizza luxueuse et raffinée digne d'un grand restaurant.",
  },
  {
    name: "Diavola",
    emoji: "😈",
    stars: 3,
    check: s => s.garniture.has("pepperoni") && s.autres.has("piment"),
    desc: "Très épicée ! Ce n'est pas pour les âmes sensibles. Tu aimes le feu ?",
  },
  {
    name: "Pizza Paysanne",
    emoji: "🌾",
    stars: 3,
    check: s => s.pate === "integrale" && s.garniture.size >= 4,
    desc: "Rustique et généreuse, comme à la campagne. Une pizza bien nourrissante !",
  },
  {
    name: "Miel & Figues",
    emoji: "🍯",
    stars: 4,
    check: s => s.autres.has("miel") && s.autres.has("figues"),
    desc: "Une pizza sucrée-salée étonnante. Très tendance et délicieuse !",
  },
];

function computeResult() {
  for (const combo of COMBOS) {
    if (combo.check(state)) {
      return { name: combo.name, emoji: combo.emoji, stars: combo.stars, desc: combo.desc };
    }
  }

  let score = 0;
  const ingredientCount =
    (state.pate ? 1 : 0) + (state.base ? 1 : 0) +
    state.fromage.size + state.garniture.size + state.autres.size;

  if (state.pate)                score += 1;
  if (state.base)                score += 1;
  if (state.fromage.size >= 1)   score += 2;
  if (state.garniture.size >= 2) score += 2;
  if (state.autres.size >= 1)    score += 1;
  if (ingredientCount > MAX_INGREDIENTS_BEFORE_PENALTY) score -= 1;
  if (ingredientCount >= 5)      score += 1;

  if (score >= 7) return { name: "Pizza Maison Délicieuse", emoji: "😋", stars: 4, desc: "Bien équilibrée et savoureuse. Tu as le coup de main !" };
  if (score >= 5) return { name: "Pizza Correcte",          emoji: "🙂", stars: 3, desc: "Pas mal du tout ! Quelques ajustements et ce sera parfait." };
  if (score >= 3) return { name: "Pizza Basique",           emoji: "😐", stars: 2, desc: "Hmm… c'est mangeable mais un peu fade. Ose plus d'ingrédients !" };
  return             { name: "Pizza Mystère",               emoji: "🤔", stars: 1, desc: "C'est courageux… mais peut-être pas le meilleur choix. Réessaie !" };
}

function starsHTML(count) {
  return "⭐".repeat(count) + "☆".repeat(5 - count);
}

function buildRecap() {
  const lines = [];
  if (state.pate) {
    const p = INGREDIENTS.pate.find(i => i.id === state.pate);
    lines.push(`Pâte: ${p?.label}`);
  }
  if (state.base) {
    const b = INGREDIENTS.base.find(i => i.id === state.base);
    lines.push(`Base: ${b?.label}`);
  }
  const multiLine = (cat, label) => {
    if (state[cat].size) {
      const names = [...state[cat]]
        .map(id => INGREDIENTS[cat].find(i => i.id === id)?.label)
        .filter(Boolean);
      lines.push(`${label}: ${names.join(", ")}`);
    }
  };
  multiLine("fromage",   "Fromages");
  multiLine("garniture", "Garnitures");
  multiLine("autres",    "Extras");
  return lines.join(" · ");
}

// ── Bake! ────────────────────────────────────────────────────
function bake() {
  bakeBtn.disabled = true;
  resetBtn.disabled = true;

  // Start 3D baking animation
  isBaking   = true;
  bakingStart = Date.now();
  document.getElementById("result-animation").textContent = "🔥";

  setTimeout(() => {
    isBaking = false;
    pizzaGroup.position.y = 0;
    pizzaGroup.scale.set(1, 1, 1);

    const result = computeResult();

    resultTitle.textContent      = `${result.emoji} ${result.name}`;
    resultStars.textContent      = starsHTML(result.stars);
    resultDescription.textContent = result.desc;
    resultRecap.textContent      = buildRecap();

    overlay.classList.remove("hidden");
    resultModal.classList.remove("hidden");

    resetBtn.disabled = false;
  }, BAKING_DURATION_MS);
}

// ── Reset ────────────────────────────────────────────────────
function resetGame() {
  state.pate = null;
  state.base = null;
  state.fromage.clear();
  state.garniture.clear();
  state.autres.clear();

  document.querySelectorAll(".ingredient-btn.selected")
    .forEach(btn => btn.classList.remove("selected"));

  rebuild3DPizza();
  updateSummary();
  updateBakeButton();

  overlay.classList.add("hidden");
  resultModal.classList.add("hidden");

  bakeBtn.disabled = true;
}

// ── Event listeners ──────────────────────────────────────────
// ── Init ─────────────────────────────────────────────────────
function initialize() {
  console.log("Pizza Simulator: initializing…");

  // Assign DOM refs
  selectedList      = document.getElementById("selected-list");
  bakeBtn           = document.getElementById("bake-btn");
  resetBtn          = document.getElementById("reset-btn");
  resultModal       = document.getElementById("result-modal");
  overlay           = document.getElementById("overlay");
  resultTitle       = document.getElementById("result-title");
  resultStars       = document.getElementById("result-stars");
  resultDescription = document.getElementById("result-description");
  resultRecap       = document.getElementById("result-ingredients-recap");
  closeResultBtn    = document.getElementById("close-result-btn");

  // Validate required DOM elements
  const requiredElements = {
    "selected-list":              selectedList,
    "bake-btn":                   bakeBtn,
    "reset-btn":                  resetBtn,
    "result-modal":               resultModal,
    "overlay":                    overlay,
    "result-title":               resultTitle,
    "result-stars":               resultStars,
    "result-description":         resultDescription,
    "result-ingredients-recap":   resultRecap,
    "close-result-btn":           closeResultBtn,
  };

  for (const [id, el] of Object.entries(requiredElements)) {
    if (!el) {
      console.error(`Pizza Simulator: required element #${id} not found in the DOM.`);
      return;
    }
  }

  // Attach event listeners
  bakeBtn.addEventListener("click", bake);
  resetBtn.addEventListener("click", resetGame);
  closeResultBtn.addEventListener("click", resetGame);
  overlay.addEventListener("click", () => {
    overlay.classList.add("hidden");
    resultModal.classList.add("hidden");
    resetBtn.disabled = false;
    bakeBtn.disabled  = false;
  });

  // Run initialisation
  renderIngredients();
  updateSummary();

  try {
    initThreeJS();
    console.log("Pizza Simulator: Three.js initialized successfully.");
  } catch (err) {
    console.error("Pizza Simulator: Three.js initialization failed.", err);
    const container = document.getElementById("pizza-canvas");
    if (container) {
      container.textContent = "⚠️ Impossible d'initialiser le rendu 3D. Veuillez utiliser un navigateur compatible WebGL.";
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.padding = "1rem";
    }
  }

  console.log("Pizza Simulator: ready.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
