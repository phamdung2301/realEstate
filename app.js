import { LISTINGS, DISTRICTS, AMENITIES, NEARBY, PROCESS_STEPS, TESTIMONIALS, STATS, SAMPLE_UNITS, priceBucket, areaBucket } from "./data.js";
// NOTE: tower.js is loaded by dynamic import below (not a static import) on
// purpose: if the Three.js CDN fails, this module must still run so the
// SVG fallback, listings, filters and booking form all still work.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let paused = false;
let towerApi = null;
let towerReady = false;

// ---------- Pause (global: WebGL + GSAP + CSS) ----------
function setPaused(v) {
  paused = v;
  document.body.classList.toggle("paused", v);
  if (towerApi) towerApi.setPaused(v);
  if (window.gsap) { if (v) window.gsap.globalTimeline.pause(); else window.gsap.globalTimeline.play(); }
  $$(".pause-btn").forEach((b) => { b.textContent = v ? "▶ Resume motion" : "⏸ Pause motion"; b.setAttribute("aria-pressed", String(v)); });
}
$$(".pause-btn").forEach((b) => b.addEventListener("click", () => setPaused(!paused)));

// ---------- Hero tower + SVG fallback ----------
const canvas = $("#tower-canvas");
const fallback = $("#tower-fallback");
const loader = $("#tower-loader");
const floorNum = $("#floor-number");
const floorLabel = $("#floor-label");
function showFallback() {
  if (canvas) canvas.hidden = true;
  if (fallback) fallback.hidden = false;
  if (loader) loader.textContent = "Static cutaway — WebGL unavailable";
}
function onFloor(f) {
  if (floorNum) floorNum.textContent = String(f).padStart(2, "0");
  if (floorLabel) floorLabel.textContent = f === 12 ? "Sample unit floor" : "Floor " + f;
}
async function startTower() {
  try {
    const { initTower } = await import("./tower.js");
    towerApi = initTower(canvas, fallback, onFloor);
    towerApi.setReduced(reduced);
    towerApi.setPaused(paused);
    towerReady = true;
    if (loader) loader.style.display = "none";
    // Scroll scrub inside the hero: hero progress -> floor 1..18.
    const hero = $("#hero");
    const updateScrub = () => {
      if (!towerApi || paused || reduced) return;
      const r = hero.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -r.top / Math.max(r.height - window.innerHeight, 1)));
      towerApi.setHighlight(1 + Math.round(progress * 17));
    };
    window.addEventListener("scroll", updateScrub, { passive: true });
    onFloor(12);
  } catch (e) {
    showFallback();
  }
}
startTower();
// Loader self-release: never hide content, and never wait forever for WebGL.
setTimeout(() => { if (!towerReady) showFallback(); }, 5000);

// ---------- Single rAF loop for the WebGL scene ----------
function loop() {
  if (towerApi && !document.hidden) {
    try { towerApi.tick(); } catch (e) { showFallback(); towerApi = null; }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.addEventListener("resize", () => { if (towerApi) towerApi.resize(); });
window.addEventListener("beforeunload", () => { if (towerApi) towerApi.dispose(); });

// ---------- GSAP reveals (content is visible even if GSAP fails) ----------
if (window.gsap && !reduced) {
  window.gsap.utils.toArray("[data-reveal]").forEach((el) => {
    window.gsap.from(el, { y: 24, opacity: 0, duration: 0.4, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" } });
  });
}

// ---------- Filters + listings ----------
const state = { district: "all", type: "all", budget: "all", area: "all" };
const listEl = $("#listing-rows");
const countEl = $("#result-count");
const summaryEl = $("#filter-summary");

function fmtPrice(v) { return v.toFixed(2).replace(/\.00$/, "") + " bn VND"; }
function miniCut(l) {
  const hi = l.floor ? Math.min(18, Math.max(1, l.floor)) : null;
  let bars = "";
  for (let f = 18; f >= 1; f--) {
    const y = (18 - f) * 6 + 4;
    const fill = f === hi ? "#6d2d37" : "#e8e1d5";
    bars += `<rect x="18" y="${y}" width="54" height="4" fill="${fill}" stroke="#191b1a" stroke-width="0.5"/>`;
  }
  return `<svg class="mini-cut" viewBox="0 0 90 120" role="img" aria-label="Vertical cutaway">${bars}<text x="45" y="116" text-anchor="middle" font-size="8">${l.floorLabel}</text></svg>`;
}
function renderListings() {
  const items = LISTINGS.filter((l) =>
    (state.district === "all" || l.districtKey === state.district) &&
    (state.type === "all" || l.typeKey === state.type) &&
    (state.budget === "all" || priceBucket(l.price) === state.budget) &&
    (state.area === "all" || areaBucket(l.area) === state.area));
  countEl.textContent = `Showing ${items.length} / ${LISTINGS.length} listings`;
  summaryEl.textContent = items.length ? "" : "No listing matches this combination.";
  if (!items.length) {
    listEl.innerHTML = `<div class="empty"><p><strong>No listing matches this combination.</strong></p><p>This is an empty result, not an error. Try widening the budget or area, or clear all filters.</p><button class="btn ghost" data-clear>Clear filters</button></div>`;
  } else {
    listEl.innerHTML = items.map((l) => `
      <article class="row" data-reveal>
        <div class="marker">${l.id}</div>
        ${miniCut(l)}
        <div>
          <h3>${l.name}</h3>
          <p><span class="tag">${l.type}</span><span class="tag">${l.district}</span><span class="tag">${l.legal}</span><span class="tag">${l.status}</span></p>
          <p>${l.area} m2 · ${l.bedrooms} · ${l.direction} · ${l.floorLabel}</p>
          <p>${l.note}</p>
        </div>
        <div class="price"><b>${fmtPrice(l.price)}</b><p>${l.pricePerM2} m VND/m2</p>
        <button class="btn small" data-book="${l.name}">Book a viewing (demo)</button></div>
      </article>`).join("");
  }
  listEl.querySelectorAll("[data-book]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.book)));
  const clear = listEl.querySelector("[data-clear]");
  if (clear) clear.addEventListener("click", clearFilters);
}
function bindChipGroup(name, key) {
  $$(`[data-group="${name}"] .chip, [data-group="${name}"] button[data-value]`).forEach((b) => {
    b.addEventListener("click", () => {
      state[key] = b.dataset.value;
      $$(`[data-group="${name}"] .chip, [data-group="${name}"] button[data-value]`).forEach((x) => x.classList.toggle("active", x === b));
      renderListings();
    });
  });
}
function clearFilters() {
  Object.assign(state, { district: "all", type: "all", budget: "all", area: "all" });
  $$(".chip, .dial button").forEach((b) => b.classList.toggle("active", b.dataset.value === "all"));
  $$(".map-zone").forEach((z) => z.classList.toggle("active", false));
  renderListings();
}
$$("[data-clear]").forEach((b) => b.addEventListener("click", clearFilters));
$$(".map-zone").forEach((z) => z.addEventListener("click", () => {
  state.district = z.dataset.district;
  $$(".map-zone").forEach((x) => x.classList.toggle("active", x === z));
  $$('[data-group="district"] .chip').forEach((c) => c.classList.toggle("active", c.dataset.value === state.district));
  renderListings();
}));
bindChipGroup("district", "district");
bindChipGroup("type", "type");
bindChipGroup("budget", "budget");
bindChipGroup("area", "area");
renderListings();

// ---------- Detail / booking sheet ----------
const sheet = $("#detail-sheet");
function openSheet(name) {
  sheet.classList.add("open");
  $("#sheet-title").textContent = name ? `Viewing request (demo) — ${name}` : "Viewing request (demo)";
  sheet.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
}
$("#close-sheet").addEventListener("click", () => sheet.classList.remove("open"));

// ---------- Journey steps ----------
const stepsEl = $("#journey-steps");
stepsEl.innerHTML = PROCESS_STEPS.map((s, i) => `
  <div class="step ${i === 0 ? "active" : ""}" data-step="${i}" tabindex="0" role="button">
    <p class="eyebrow">Floor ${String(s.floor).padStart(2, "0")}</p>
    <h3>${s.title}</h3><p>${s.body}</p><p><strong>${s.meta}</strong></p>
  </div>`).join("");
function setStep(i) {
  $$(".step", stepsEl).forEach((el, j) => el.classList.toggle("active", j === i));
  const f = PROCESS_STEPS[i].floor;
  $$("#journey-cut rect[data-floor]").forEach((r) => r.setAttribute("fill", Number(r.dataset.floor) === f ? "#6d2d37" : "#e8e1d5"));
  if (towerApi) towerApi.setHighlight(Math.min(18, 2 + f * 3));
}
$$(".step", stepsEl).forEach((el) => {
  el.addEventListener("click", () => setStep(Number(el.dataset.step)));
  el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(Number(el.dataset.step)); } });
});
setStep(0);

// ---------- Amenities, testimonials, stats ----------
$("#amen-list").innerHTML = AMENITIES.map((a) => `<div class="amen-row"><div><strong>${a.code} · ${a.name}</strong><br>${a.level}</div><div>${a.distance}<br>${a.hours}</div></div>`).join("")
  + `<h3>Nearby (illustration)</h3>` + NEARBY.map((n) => `<div class="amen-row"><div>${n.name}</div><div>${n.distance}</div></div>`).join("");
$("#testi-list").innerHTML = TESTIMONIALS.map((t) => `<article class="testi"><blockquote>“${t.quote}”</blockquote><p><strong>${t.name}</strong><br>${t.detail}</p></article>`).join("");
$("#stats-list").innerHTML = STATS.map((s) => `<div><b>${s.value} ${s.suffix}</b><p>${s.label}</p></div>`).join("");

// ---------- Booking form ----------
const unitWrap = $("#unit-cards");
unitWrap.innerHTML = SAMPLE_UNITS.map((u, i) => `<button type="button" class="unit-card ${i === 0 ? "active" : ""}" data-unit="${u}">${u}</button>`).join("");
let chosenUnit = SAMPLE_UNITS[0];
$$(".unit-card", unitWrap).forEach((b) => b.addEventListener("click", () => {
  chosenUnit = b.dataset.unit;
  $$(".unit-card", unitWrap).forEach((x) => x.classList.toggle("active", x === b));
}));
$("#booking-form").addEventListener("submit", (e) => {
  e.preventDefault();
  $("#booking-notice").hidden = false;
  $("#booking-notice").textContent = `Demo only — your request for ${chosenUnit} was NOT saved and no agent will call you from this form. This page is a fictional illustration.`;
});
$("#booking-form").addEventListener("reset", () => { $("#booking-notice").hidden = true; });

// ---------- Persistent booking bar ----------
const bar = $("#booking-bar");
window.addEventListener("scroll", () => {
  const show = window.scrollY > 700;
  bar.classList.toggle("show", show);
  document.body.classList.toggle("has-bar", show);
}, { passive: true });
$("#bar-book").addEventListener("click", () => document.querySelector("#visit").scrollIntoView({ behavior: reduced ? "auto" : "smooth" }));
