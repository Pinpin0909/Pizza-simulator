/* ============================================================
   Pizzayolo Simulator – Game Logic
   ============================================================ */

"use strict";

// ── Constants ────────────────────────────────────────────────
const MAX_EMOJI_DISPLAY          = 18; // max topping emojis shown on pizza preview
const MAX_INGREDIENTS_BEFORE_PENALTY = 8; // too many ingredients reduces score

// ── Ingredient data ──────────────────────────────────────────
const INGREDIENTS = {
  pate: [
    { id: "classique",   label: "Classique",        emoji: "🫓" },
    { id: "fine",        label: "Fine & croustillante", emoji: "🥖" },
    { id: "epaisse",     label: "Épaisse",           emoji: "🍞" },
    { id: "napolitaine", label: "Napolitaine",        emoji: "🥯" },
    { id: "sans_gluten", label: "Sans gluten",        emoji: "🌾" },
    { id: "integrale",   label: "Intégrale",          emoji: "🌿" },
  ],
  base: [
    { id: "tomate",       label: "Coulis tomate",    emoji: "🍅" },
    { id: "creme",        label: "Crème fraîche",    emoji: "🥛" },
    { id: "pesto",        label: "Pesto",            emoji: "🌿" },
    { id: "bbq",          label: "Barbecue",         emoji: "🔥" },
    { id: "huile_olive",  label: "Huile d'olive",    emoji: "🫒" },
    { id: "sans_base",    label: "Sans base",        emoji: "⬜" },
  ],
  fromage: [
    { id: "mozzarella",  label: "Mozzarella",        emoji: "🧀" },
    { id: "emmental",    label: "Emmental",          emoji: "🫕" },
    { id: "parmesan",    label: "Parmesan",          emoji: "🧀" },
    { id: "gorgonzola",  label: "Gorgonzola",        emoji: "💙" },
    { id: "chevre",      label: "Fromage de chèvre", emoji: "🐐" },
    { id: "cheddar",     label: "Cheddar",           emoji: "🟠" },
    { id: "gruyere",     label: "Gruyère",           emoji: "🫕" },
    { id: "ricotta",     label: "Ricotta",           emoji: "⬜" },
  ],
  garniture: [
    { id: "jambon",       label: "Jambon",           emoji: "🍖" },
    { id: "pepperoni",    label: "Pepperoni",        emoji: "🌶️" },
    { id: "champignons",  label: "Champignons",      emoji: "🍄" },
    { id: "poivrons",     label: "Poivrons",         emoji: "🫑" },
    { id: "oignons",      label: "Oignons",          emoji: "🧅" },
    { id: "olives",       label: "Olives",           emoji: "🫒" },
    { id: "tomates",      label: "Tomates cerises",  emoji: "🍅" },
    { id: "basilic",      label: "Basilic frais",    emoji: "🌿" },
    { id: "roquette",     label: "Roquette",         emoji: "🥬" },
    { id: "artichauts",   label: "Artichauts",       emoji: "🌵" },
    { id: "anchois",      label: "Anchois",          emoji: "🐟" },
    { id: "poulet",       label: "Poulet grillé",    emoji: "🍗" },
    { id: "thon",         label: "Thon",             emoji: "🐠" },
    { id: "merguez",      label: "Merguez",          emoji: "🌭" },
    { id: "epinards",     label: "Épinards",         emoji: "🥬" },
  ],
  autres: [
    { id: "oeufs",        label: "Œufs",             emoji: "🥚" },
    { id: "capres",       label: "Câpres",           emoji: "🟢" },
    { id: "piment",       label: "Piment",           emoji: "🌶️" },
    { id: "ail",          label: "Ail",              emoji: "🧄" },
    { id: "herbes",       label: "Herbes de Provence", emoji: "🌿" },
    { id: "miel",         label: "Miel",             emoji: "🍯" },
    { id: "noix_pin",     label: "Noix de pin",      emoji: "🌰" },
    { id: "truffe",       label: "Truffe",           emoji: "⚫" },
    { id: "noix",         label: "Noix",             emoji: "🥜" },
    { id: "figues",       label: "Figues",           emoji: "🍇" },
  ],
};

// ── State ────────────────────────────────────────────────────
const state = {
  pate:      null,    // single selection
  base:      null,    // single selection
  fromage:   new Set(),
  garniture: new Set(),
  autres:    new Set(),
};

// ── Pizza visual colours per dough ──────────────────────────
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
  sans_base:   "transparent",
};

// ── DOM refs ─────────────────────────────────────────────────
const pizzaPlate        = document.getElementById("pizza-plate");
const pizzaDough        = document.getElementById("pizza-dough");
const pizzaToppings     = document.getElementById("pizza-toppings-display");
const pizzaEmojiLayer   = document.getElementById("pizza-emoji-toppings");
const pizzaPlaceholder  = document.getElementById("pizza-placeholder");
const selectedList      = document.getElementById("selected-list");
const bakeBtn           = document.getElementById("bake-btn");
const resetBtn          = document.getElementById("reset-btn");
const resultModal       = document.getElementById("result-modal");
const overlay           = document.getElementById("overlay");
const resultTitle       = document.getElementById("result-title");
const resultStars       = document.getElementById("result-stars");
const resultDescription = document.getElementById("result-description");
const resultRecap       = document.getElementById("result-ingredients-recap");
const closeResultBtn    = document.getElementById("close-result-btn");

// ── Render ingredient buttons ────────────────────────────────
function renderIngredients() {
  for (const [category, items] of Object.entries(INGREDIENTS)) {
    const container = document.querySelector(`.ingredient-list[data-category="${category}"]`);
    items.forEach(item => {
      const btn = document.createElement("button");
      btn.className = "ingredient-btn";
      btn.dataset.id = item.id;
      btn.dataset.category = category;
      btn.innerHTML = `<span class="ing-emoji">${item.emoji}</span>${item.label}`;
      btn.addEventListener("click", () => toggleIngredient(category, item.id, btn));
      container.appendChild(btn);
    });
  }
}

// ── Toggle selection ─────────────────────────────────────────
function toggleIngredient(category, id, btn) {
  if (category === "pate" || category === "base") {
    // Single-select: deselect previous
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
    // Multi-select
    if (state[category].has(id)) {
      state[category].delete(id);
      btn.classList.remove("selected");
    } else {
      state[category].add(id);
      btn.classList.add("selected");
    }
  }

  updatePizzaPreview();
  updateSummary();
  updateBakeButton();
}

// ── Update pizza visual ──────────────────────────────────────
function updatePizzaPreview() {
  const hasPate  = state.pate !== null;
  const hasBase  = state.base !== null;
  const hasAny   = hasPate || hasBase || state.fromage.size || state.garniture.size || state.autres.size;

  // Dough colour
  pizzaDough.style.background = hasPate
    ? DOUGH_COLORS[state.pate] ?? "#f5deb3"
    : "";

  // Sauce colour
  pizzaToppings.style.background = hasBase
    ? BASE_COLORS[state.base] ?? "transparent"
    : "transparent";

  // Emoji toppings
  const emojis = [];
  const addEmojis = (category, setOrNull) => {
    const list = INGREDIENTS[category];
    const ids  = typeof setOrNull === "string" ? [setOrNull] : [...setOrNull];
    ids.forEach(id => {
      const found = list.find(i => i.id === id);
      if (found) emojis.push(found.emoji);
    });
  };

  if (state.fromage.size)   addEmojis("fromage",   state.fromage);
  if (state.garniture.size) addEmojis("garniture", state.garniture);
  if (state.autres.size)    addEmojis("autres",    state.autres);

  pizzaEmojiLayer.textContent = "";
  emojis.slice(0, MAX_EMOJI_DISPLAY).forEach(e => {
    const span = document.createElement("span");
    span.textContent = e;
    pizzaEmojiLayer.appendChild(span);
  });

  // Placeholder visibility
  pizzaPlaceholder.style.opacity = hasAny ? "0" : "1";
  pizzaPlaceholder.style.pointerEvents = "none";
}

// ── Update text summary ──────────────────────────────────────
function updateSummary() {
  selectedList.innerHTML = "";

  const lines = [];

  const pushSingle = (category, label) => {
    if (state[category]) {
      const found = INGREDIENTS[category].find(i => i.id === state[category]);
      if (found) lines.push(`${found.emoji} ${label} : ${found.label}`);
    }
  };

  const pushMulti = (category, label) => {
    state[category].forEach(id => {
      const found = INGREDIENTS[category].find(i => i.id === id);
      if (found) lines.push(`${found.emoji} ${label} : ${found.label}`);
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
    const li = document.createElement("li");
    li.className = "selected-item";
    li.textContent = line;
    selectedList.appendChild(li);
  });
}

// ── Enable/disable bake button ───────────────────────────────
function updateBakeButton() {
  const ready = state.pate !== null && (state.fromage.size > 0 || state.garniture.size > 0);
  bakeBtn.disabled = !ready;
}

// ── Scoring & result ─────────────────────────────────────────
const COMBOS = [
  {
    name: "Margherita Parfaite",
    emoji: "🌟",
    stars: 5,
    check: s =>
      s.base === "tomate" &&
      (s.fromage.has("mozzarella")) &&
      s.garniture.has("basilic") &&
      s.garniture.size <= 3,
    desc: "La quintessence de la pizza italienne ! Simple, fraîche et absolument délicieuse.",
  },
  {
    name: "Quattro Formaggi",
    emoji: "🧀",
    stars: 5,
    check: s =>
      s.fromage.size >= 4,
    desc: "Quatre fromages, un délire gustatif ! Tu es clairement un fan de fromage.",
  },
  {
    name: "Regina",
    emoji: "👑",
    stars: 4,
    check: s =>
      s.base === "tomate" &&
      s.fromage.has("mozzarella") &&
      s.garniture.has("jambon") &&
      s.garniture.has("champignons"),
    desc: "Un grand classique bien équilibré. La Reine des pizzas !",
  },
  {
    name: "Pizza Barbecue",
    emoji: "🔥",
    stars: 4,
    check: s =>
      s.base === "bbq" &&
      (s.garniture.has("poulet") || s.garniture.has("pepperoni")),
    desc: "Fumée, gourmande et pleine de caractère. Un barbecue en pizza !",
  },
  {
    name: "Végétarienne Gourmet",
    emoji: "🥬",
    stars: 4,
    check: s =>
      !s.garniture.has("jambon") &&
      !s.garniture.has("pepperoni") &&
      !s.garniture.has("poulet") &&
      !s.garniture.has("thon") &&
      !s.garniture.has("merguez") &&
      !s.garniture.has("anchois") &&
      s.garniture.size >= 3,
    desc: "Fraîche, colorée et pleine de saveurs végétales. Bravo pour ce choix sain !",
  },
  {
    name: "Pizza Anchois-Câpres",
    emoji: "🐟",
    stars: 4,
    check: s =>
      s.garniture.has("anchois") && s.autres.has("capres"),
    desc: "Un mélange méditerranéen audacieux. Les amateurs de saveurs intenses vont adorer.",
  },
  {
    name: "Pizza Truffe",
    emoji: "⚫",
    stars: 5,
    check: s =>
      s.autres.has("truffe"),
    desc: "La truffe fait tout ! Une pizza luxueuse et raffinée digne d'un grand restaurant.",
  },
  {
    name: "Diavola",
    emoji: "😈",
    stars: 3,
    check: s =>
      s.garniture.has("pepperoni") && s.autres.has("piment"),
    desc: "Très épicée ! Ce n'est pas pour les âmes sensibles. Tu aimes le feu ?",
  },
  {
    name: "Pizza Paysanne",
    emoji: "🌾",
    stars: 3,
    check: s =>
      s.pate === "integrale" && s.garniture.size >= 4,
    desc: "Rustique et généreuse, comme à la campagne. Une pizza bien nourrissante !",
  },
  {
    name: "Miel & Figues",
    emoji: "🍯",
    stars: 4,
    check: s =>
      s.autres.has("miel") && s.autres.has("figues"),
    desc: "Une pizza sucrée-salée étonnante. Très tendance et délicieuse !",
  },
];

function computeResult() {
  // Check special combos first
  for (const combo of COMBOS) {
    if (combo.check(state)) {
      return {
        name: combo.name,
        emoji: combo.emoji,
        stars: combo.stars,
        desc:  combo.desc,
      };
    }
  }

  // Generic score
  let score = 0;
  const ingredientCount =
    (state.pate ? 1 : 0) +
    (state.base ? 1 : 0) +
    state.fromage.size +
    state.garniture.size +
    state.autres.size;

  if (state.pate)                 score += 1;
  if (state.base)                 score += 1;
  if (state.fromage.size >= 1)    score += 2;
  if (state.garniture.size >= 2)  score += 2;
  if (state.autres.size >= 1)     score += 1;
  if (ingredientCount > MAX_INGREDIENTS_BEFORE_PENALTY) score -= 1; // too loaded
  if (ingredientCount >= 5)       score += 1;

  if (score >= 7) return { name: "Pizza Maison Délicieuse",  emoji: "😋", stars: 4, desc: "Bien équilibrée et savoureuse. Tu as le coup de main !" };
  if (score >= 5) return { name: "Pizza Correcte",           emoji: "🙂", stars: 3, desc: "Pas mal du tout ! Quelques ajustements et ce sera parfait." };
  if (score >= 3) return { name: "Pizza Basique",            emoji: "😐", stars: 2, desc: "Hmm… c'est mangeable mais un peu fade. Ose plus d'ingrédients !" };
  return              { name: "Pizza Mystère",               emoji: "🤔", stars: 1, desc: "C'est courageux… mais peut-être pas le meilleur choix. Réessaie !" };
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
      const names = [...state[cat]].map(id => INGREDIENTS[cat].find(i => i.id === id)?.label).filter(Boolean);
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

  // Baking animation
  pizzaPlate.classList.add("baking");
  document.getElementById("result-animation").textContent = "🔥";

  setTimeout(() => {
    pizzaPlate.classList.remove("baking");

    const result = computeResult();

    resultTitle.textContent       = `${result.emoji} ${result.name}`;
    resultStars.textContent        = starsHTML(result.stars);
    resultDescription.textContent  = result.desc;
    resultRecap.textContent        = buildRecap();

    overlay.classList.remove("hidden");
    resultModal.classList.remove("hidden");

    resetBtn.disabled = false;
  }, 2000);
}

// ── Reset ────────────────────────────────────────────────────
function resetGame() {
  state.pate      = null;
  state.base      = null;
  state.fromage.clear();
  state.garniture.clear();
  state.autres.clear();

  document.querySelectorAll(".ingredient-btn.selected").forEach(btn => btn.classList.remove("selected"));

  updatePizzaPreview();
  updateSummary();
  updateBakeButton();

  overlay.classList.add("hidden");
  resultModal.classList.add("hidden");

  bakeBtn.disabled = true;
}

// ── Event listeners ──────────────────────────────────────────
bakeBtn.addEventListener("click", bake);
resetBtn.addEventListener("click", resetGame);
closeResultBtn.addEventListener("click", resetGame);
overlay.addEventListener("click", () => {
  overlay.classList.add("hidden");
  resultModal.classList.add("hidden");
  resetBtn.disabled = false;
  bakeBtn.disabled  = false;
});

// ── Init ─────────────────────────────────────────────────────
renderIngredients();
updateSummary();
