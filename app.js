import { LISTINGS, DISTRICTS, AMENITIES, NEARBY, PROCESS_STEPS, TESTIMONIALS, STATS, SAMPLE_UNITS, priceBucket, areaBucket } from "./data.js?v=12";
// NOTE: tower.js is loaded by dynamic import below (not a static import) on
// purpose: if the tower module fails, this module must still run so the
// SVG fallback, listings, filters and booking form all still work.

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = window.matchMedia("(min-width: 901px)").matches;
const pointerFine = window.matchMedia("(pointer: fine)").matches;
let paused = false;
let towerApi = null;
let towerReady = false;

// ---------- Pause (global: WebGL + GSAP + CSS) ----------
// Scrubbed sections (hero floor, horizontal strip, journey stack, kinetic)
// are driven by ScrollTrigger onUpdate callbacks that check `paused` and
// return early, so pausing really freezes them. Play-on-enter tweens are
// frozen by pausing the GSAP global timeline. CSS loops (marquee,
// scaffold, progress) are frozen by body.paused in styles.css.
function setPaused(v) {
  paused = v;
  document.body.classList.toggle("paused", v);
  if (towerApi) towerApi.setPaused(v);
  if (window.gsap) { if (v) window.gsap.globalTimeline.pause(); else window.gsap.globalTimeline.play(); }
  $$(".pause-btn").forEach((b) => { b.textContent = v ? "▶ Resume motion" : "⏸ Pause motion"; b.setAttribute("aria-pressed", String(v)); });
}
$$(".pause-btn").forEach((b) => b.addEventListener("click", () => setPaused(!paused)));

// ---------- Cursor pill (one rAF loop, shared with the tower) ----------
const pill = $("#cursor-pill");
const pillLabel = $("#cursor-pill-label");
let pillX = 0, pillY = 0, pillTX = 0, pillTY = 0, pillOn = false;
if (pill && pointerFine && desktop && !reduced) {
  document.addEventListener("mousemove", (e) => {
    const target = e.target.closest ? e.target.closest("canvas, .mini-cut") : null;
    if (!target) { pillOn = false; pill.classList.remove("on"); return; }
    pillLabel.textContent = target.tagName === "CANVAS" ? "DRAG" : "VIEW";
    pillTX = e.clientX; pillTY = e.clientY; pillOn = true; pill.classList.add("on");
  });
  document.addEventListener("mouseleave", () => { pillOn = false; pill.classList.remove("on"); });
}

// ---------- Hero tower + SVG fallback ----------
const canvas = $("#tower-canvas");
const fallback = $("#tower-fallback");
const loader = $("#tower-loader");
const floorNum = $("#floor-number");
const floorLabel = $("#floor-label");
function showFallback(reason) {
  // Inline display beats the stylesheet rule on the canvas, so the canvas can
  // never linger behind the fallback text.
  if (canvas) canvas.style.display = "none";
  if (fallback) fallback.hidden = false;
  document.body.classList.add("tower-dead");
  if (loader) loader.textContent = reason === "slow"
    ? "Static cutaway — 3D tower slow to start"
    : "Static cutaway — WebGL unavailable";
}
function onFloor(f) {
  if (floorNum) floorNum.textContent = String(f).padStart(2, "0");
  if (floorLabel) floorLabel.textContent = f === 12 ? "Sample unit floor" : "Floor " + f;
}
// Loader self-release: never hide content, and never wait forever for WebGL.
let failTimer = setTimeout(() => { if (!towerReady) showFallback("slow"); }, 8000);
async function startTower() {
  try {
    const { initTower } = await import("./tower.js?v=12");
    towerApi = initTower(canvas, fallback, onFloor);
    towerApi.setReduced(reduced);
    towerApi.setPaused(paused);
    towerReady = true;
    clearTimeout(failTimer);
    // Recover cleanly if the "slow" fallback already fired while importing.
    document.body.classList.remove("tower-dead");
    if (canvas) canvas.style.display = "";
    if (fallback) fallback.hidden = true;
    if (loader) loader.style.display = "none";
    onFloor(12);
  } catch (e) {
    showFallback();
  }
}
startTower();

// Render only while the hero is on screen (stacks with document.hidden).
let heroOnScreen = true;
if (canvas && "IntersectionObserver" in window) {
  new IntersectionObserver((es) => { heroOnScreen = es[0].isIntersecting; }, { rootMargin: "120px" })
    .observe(canvas);
}

// Fallback hero scrub (only when GSAP is absent, desktop, not reduced).
// The scrub drives the camera ride: floors highlight while the view glides up.
if (!window.gsap && desktop && !reduced) {
  window.addEventListener("scroll", () => {
    if (paused) return;
    const hero = $("#hero");
    if (!hero) return;
    const progress = Math.max(0, Math.min(1, (window.scrollY - hero.offsetTop) / Math.max(hero.offsetHeight, 1)));
    if (towerApi) towerApi.setRide(progress); else onFloor(1 + Math.round(progress * 17));
  }, { passive: true });
}

// ---------- Single rAF loop for the WebGL scene + cursor pill ----------
let lastFrame = performance.now();
function loop() {
  lastFrame = performance.now();
  if (towerApi && !document.hidden && heroOnScreen) {
    try { towerApi.tick(); } catch (e) {
      if (typeof window !== "undefined") window.__towerError = String((e && e.message) || e);
      showFallback(); towerApi = null;
    }
  }
  if (pillOn && !paused && pill) {
    pillX += (pillTX - pillX) * 0.2;
    pillY += (pillTY - pillY) * 0.2;
    pill.style.transform = `translate(${pillX}px, ${pillY}px) translate(-50%, -140%)`;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Self-heal: if rAF stalls while the tab is visible (heavy load, throttled
// webview), force reveal content instead of leaving sections blank.
setInterval(() => {
  if (paused || document.hidden) return;
  if (performance.now() - lastFrame < 900) return;
  document.body.classList.add("anim-failsafe");
}, 1200);
window.addEventListener("resize", () => { if (towerApi) towerApi.resize(); });
window.addEventListener("beforeunload", () => { if (towerApi) towerApi.dispose(); });

// ---------- Staggered reveals, re-applied after every filter render ----------
// Only elements below the fold are hidden: anything already on screen keeps
// its natural state, so a stalled rAF can never blank the first viewport.
let batchTriggers = [];
function setupBatchReveals() {
  if (!window.gsap || !window.ScrollTrigger || reduced) return;
  batchTriggers.forEach((st) => { try { st.kill(); } catch (e) {} });
  batchTriggers = [];
  const els = $$(".row, .amen-row, .testi");
  const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
  if (!below.length) return;
  window.gsap.set(below, { opacity: 0, y: 24 });
  batchTriggers = window.ScrollTrigger.batch(below, {
    start: "top 92%", once: true,
    onEnter: (batch) => window.gsap.to(batch, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.08, overwrite: true }),
  });
  window.ScrollTrigger.refresh();
}

// ---------- Filters + listings ----------
const state = { district: "all", type: "all", budget: "all", area: "all" };
const listEl = $("#listing-rows");
const countEl = $("#result-count");
const summaryEl = $("#filter-summary");

function fmtPrice(v) { return v.toFixed(2).replace(/\.00$/, "") + " bn VND"; }
function miniCut(l) {
  // Building silhouette: outlined mass + hairline floors + highlighted band.
  const top = 10, bottom = 100, span = bottom - top;
  const hi = l.floor ? Math.min(18, Math.max(1, l.floor)) : null;
  const hiY = hi !== null ? bottom - ((hi - 0.5) / 18) * span : null;
  let lines = "";
  for (let f = 1; f <= 18; f++) {
    const y = bottom - ((f - 0.5) / 18) * span;
    lines += `<line x1="24" y1="${y.toFixed(1)}" x2="66" y2="${y.toFixed(1)}" stroke="rgba(25,27,26,.28)" stroke-width="1"/>`;
  }
  const hiRect = hi !== null
    ? `<rect x="24" y="${(hiY - 2.6).toFixed(1)}" width="42" height="5.2" fill="#6d2d37"/>`
    : `<rect x="24" y="20" width="42" height="80" fill="none" stroke="#9a7652" stroke-width="1" stroke-dasharray="3 3"/>`;
  return `<svg class="mini-cut" data-cursor="VIEW" viewBox="0 0 90 120" role="img" aria-label="Building cutaway, ${l.floorLabel}">
    <rect x="22" y="${top - 4}" width="46" height="${span + 8}" fill="#efe8da" stroke="#191b1a" stroke-width="1"/>
    <line x1="20" y1="${top - 4}" x2="70" y2="${top - 4}" stroke="#9a7652" stroke-width="3"/>
    ${lines}${hiRect}
    <text x="45" y="114" text-anchor="middle" font-size="8" fill="#55524b">${l.floorLabel}</text>
  </svg>`;
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
      <article class="row">
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
  listEl.querySelectorAll("[data-book]").forEach((b) => b.addEventListener("click", (e) => openSheet(b.dataset.book, b)));
  const clear = listEl.querySelector("[data-clear]");
  if (clear) clear.addEventListener("click", clearFilters);
  setupBatchReveals();
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

// ---------- Top-drop detail sheet (Site B pattern) ----------
const backdrop = $("#sheet-backdrop");
const sheetTitle = $("#sheet-title");
const sheetBody = $("#sheet-body");
let lastTrigger = null;
let sheetCloseTimer = null;
function openSheet(name, triggerEl) {
  lastTrigger = triggerEl || null;
  sheetTitle.textContent = name ? `Viewing request (demo) — ${name}` : "Viewing request (demo)";
  sheetBody.textContent = name
    ? `You selected ${name}. Use the booking form in the burgundy band below to complete a demo request. Nothing here is saved.`
    : "Use the booking form in the burgundy band below to complete a demo request. Nothing here is saved.";
  if (sheetCloseTimer) { clearTimeout(sheetCloseTimer); sheetCloseTimer = null; }
  backdrop.hidden = false;
  requestAnimationFrame(() => backdrop.classList.add("open"));
  const cont = $("#sheet-continue");
  if (cont) cont.focus();
}
function closeSheet() {
  backdrop.classList.remove("open");
  sheetCloseTimer = setTimeout(() => { backdrop.hidden = true; }, 400);
  if (lastTrigger && lastTrigger.focus) lastTrigger.focus();
}
$("#close-sheet").addEventListener("click", closeSheet);
$("#sheet-continue").addEventListener("click", () => {
  closeSheet();
  const form = $("#booking-form");
  if (form) { form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }); }
  const nameInput = $("#bk-name");
  setTimeout(() => { if (nameInput) nameInput.focus(); }, reduced ? 0 : 450);
});
backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeSheet(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !backdrop.hidden) closeSheet();
});

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
  $$("#journey-cut rect[data-floor]").forEach((r) => r.setAttribute("fill", Number(r.dataset.floor) === f ? "#6d2d37" : "rgba(25,27,26,.08)"));
  // Fly the hero camera to this step's floor and highlight it there too.
  const hf = Math.min(18, 2 + f * 3);
  if (towerApi) towerApi.setRide((hf - 1) / 17); else onFloor(hf);
}
$$(".step", stepsEl).forEach((el) => {
  el.addEventListener("click", () => setStep(Number(el.dataset.step)));
  el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setStep(Number(el.dataset.step)); } });
});
setStep(0);

// ---------- Amenities, testimonials, stats ----------
$("#amen-list").innerHTML = AMENITIES.map((a) => `<div class="amen-row"><div><strong>${a.code} · ${a.name}</strong><br>${a.level}</div><div>${a.distance}<br>${a.hours}</div></div>`).join("")
  + `<h3>Nearby (illustration)</h3>` + NEARBY.map((n) => `<div class="amen-row"><div>${n.name}</div><div>${n.distance}</div></div>`).join("");
$("#testi-list").innerHTML = TESTIMONIALS.map((t) => {
  const initials = t.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  return `<article class="testi"><blockquote>“${t.quote}”</blockquote>
    <p class="who"><span class="avatar" aria-hidden="true">${initials}</span><span><strong>${t.name}</strong><br>${t.detail}</span></p></article>`;
}).join("");
$("#stats-list").innerHTML = STATS.map((s) => `<div><b>${s.value} ${s.suffix}</b><p>${s.label}</p></div>`).join("");

// ---------- Booking form: expandable unit cards, first open by default ----------
const unitWrap = $("#unit-cards");
const UNIT_DETAILS = [
  "68 m2 · 2BR · Southeast · Sample unit on Floor 12.",
  "96 m2 · 3BR · Sample unit on Floor 16.",
  "120 m2 · South · Land plot, no floor.",
];
unitWrap.innerHTML = SAMPLE_UNITS.map((u, i) => `
  <div class="unit-accordion ${i === 0 ? "open" : ""}">
    <button type="button" class="unit-card ${i === 0 ? "active" : ""}" data-unit="${u}">${u}</button>
    <div class="unit-body"><div><p>${UNIT_DETAILS[i]} Demo only — this does not save data.</p></div></div>
  </div>`).join("");
let chosenUnit = SAMPLE_UNITS[0];
$$(".unit-card", unitWrap).forEach((b) => b.addEventListener("click", () => {
  chosenUnit = b.dataset.unit;
  $$(".unit-accordion", unitWrap).forEach((acc) => acc.classList.toggle("open", acc.contains(b)));
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

// ---------- Magnetic buttons (desktop, pointer fine, transform only, max ~4px) ----------
if (pointerFine && desktop && !reduced) {
  $$(".btn").forEach((btn) => {
    btn.addEventListener("mousemove", (e) => {
      if (paused) return;
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 1);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 1);
      btn.style.transform = `translate(${(dx * 8).toFixed(1)}px, ${(dy * 8).toFixed(1)}px)`;
    });
    btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
  });
}

// ---------- Scroll progress fallback (only if CSS scroll() is unsupported) ----------
if (window.CSS && !window.CSS.supports("animation-timeline: scroll()")) {
  const prog = $(".scroll-progress");
  window.addEventListener("scroll", () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    if (prog) prog.style.transform = `scaleX(${Math.min(1, window.scrollY / max)})`;
  }, { passive: true });
}

// ---------- GSAP motion system (guarded: no GSAP = fully readable page) ----------
function initMotion() {
  if (!window.gsap || !window.ScrollTrigger || reduced) {
    if (!window.gsap) document.body.classList.add("no-gsap");
    return;
  }
  window.gsap.registerPlugin(window.ScrollTrigger);
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;

  // Simple reveals for elements that exist at load (hero stage, stats strip).
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.from(el, { y: 24, opacity: 0, duration: 0.4, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" } });
  });

  // Masked line reveals for headings (gsap-patterns 1: yPercent 115, power4.out).
  // Headings are only wrapped when GSAP is present, so without GSAP they
  // render normally and are never CSS-hidden.
  $$("h1, h2").forEach((h) => {
    const original = h.innerHTML;
    h.innerHTML = `<span class="mask-line"><span class="mask-inner">${original}</span></span>`;
    gsap.from(h.querySelector(".mask-inner"), { yPercent: 115, duration: 0.7, ease: "power4.out",
      scrollTrigger: { trigger: h, start: "top 88%" } });
  });

  // Word-by-word reveal, dim to full (Site D), one intro paragraph per section.
  $$(".word-reveal").forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    const spans = $$(".w", p);
    gsap.fromTo(spans, { opacity: 0.2 }, { opacity: 1, duration: 0.4, ease: "power3.out", stagger: 0.05,
      scrollTrigger: { trigger: p, start: "top 85%" } });
  });

  // Staggered reveals for rows/cards rendered at load.
  setupBatchReveals();

  // Count-up for the statistics strips (works on mobile and desktop).
  $$(".stats-strip").forEach((strip) => {
    const bs = $$("b", strip);
    if (!bs.length) return;
    ST.create({
      trigger: strip, start: "top 85%", once: true,
      onEnter: () => {
        bs.forEach((b) => {
          const m = b.textContent.match(/^([\d.]+)(\s*)(.*)$/);
          if (!m) return;
          const target = parseFloat(m[1]);
          const dec = (m[1].split(".")[1] || "").length;
          const obj = { v: 0 };
          gsap.to(obj, {
            v: target, duration: 1.1, ease: "power2.out",
            onUpdate: () => { b.textContent = obj.v.toFixed(dec) + m[2] + m[3]; },
          });
        });
      },
    });
  });

  if (!desktop) return; // Mobile: batch reveals + count-up only, no pin/horizontal/stack/kinetic.

  // Pinned hero scrub (pin only; camera ride driven by onUpdate so Pause freezes it).
  ST.create({
    trigger: "#hero", start: "top top", end: "+=120%", pin: true, anticipatePin: 1,
    onUpdate: (self) => {
      if (paused) return;
      if (towerApi) towerApi.setRide(self.progress); else onFloor(1 + Math.round(self.progress * 17));
    },
  });

  // Horizontal floors strip (pinned reel pattern; x driven by onUpdate, not a scrub tween).
  const viewport = $("#horiz-viewport");
  const track = $("#horiz-track");
  const hbar = $("#horiz-progress-bar");
  if (viewport && track) {
    ST.create({
      trigger: "#floors", start: "top top", pin: true, anticipatePin: 1, invalidateOnRefresh: true,
      end: () => "+=" + Math.max(track.scrollWidth - viewport.clientWidth, 1),
      onUpdate: (self) => {
        if (paused) return;
        const dist = Math.max(track.scrollWidth - viewport.clientWidth, 0);
        track.style.transform = `translateX(${-self.progress * dist}px)`;
        if (hbar) hbar.style.width = `${self.progress * 100}%`;
      },
    });
  }

  // Pinned stacked journey (card deck pattern, adapted to steps).
  const journeySection = $("#journey");
  const steps = $$(".step", stepsEl);
  if (journeySection && steps.length > 1) {
    journeySection.classList.add("journey-stacked");
    const firstH = steps[0].offsetHeight || 160;
    gsap.set(stepsEl, { height: firstH });
    gsap.set(steps, { position: "absolute", top: 0, left: 0, right: 0 });
    gsap.set(steps, { opacity: (i) => (i === 0 ? 1 : 0), y: (i) => (i === 0 ? 0 : 40) });
    ST.create({
      trigger: "#journey", start: "top top", end: "+=200%", pin: true, anticipatePin: 1,
      onUpdate: (self) => {
        if (paused) return;
        const idx = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
        steps.forEach((s, i) => gsap.set(s, { opacity: i === idx ? 1 : (i < idx ? 0.15 : 0), y: i === idx ? 0 : 40 }));
        setStep(idx);
      },
    });
  }

  // Kinetic typography (giant-word drift, x driven by onUpdate so Pause freezes it).
  $$(".kinetic").forEach((k) => {
    const span = k.querySelector("span");
    if (!span) return;
    ST.create({
      trigger: k, start: "top bottom", end: "bottom top",
      onUpdate: (self) => { if (!paused) span.style.transform = `translateX(${-12 * self.progress}%)`; },
    });
  });

  window.addEventListener("load", () => ST.refresh());
}
initMotion();
