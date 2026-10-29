# May Song Residence — Real Estate Landing (Option B + WebGL)

A fictional real-estate landing page in the Vertical Luxury style:
ivory paper, burgundy accent, a vertical tower as the organising idea.

## What it is

- Hero: a real WebGL tower written in raw WebGL in `tower.js`
  (no Three.js dependency, so it works even when a CDN is blocked):
  18 floors with corner piers, podium, canopy, parapet and crown;
  per-pixel Lambert lighting (warm key + cool fill + rim) and distance
  fog into the paper sky; a soft ground shadow; a self-framing camera
  that always fits the whole tower at any container size; drag to rotate
  (~28s per revolution, delta-time based), pointer tilt, and a
  scroll-scrub camera ride that highlights floors from bottom to top,
  glides the view up the building and updates the floor counter.
- Filter: a fictional planning map, type chips, a budget dial and an
  area scale. Filters actually filter the listing rows and update the
  live count. An empty result is shown as an empty state, not an error.
- Listings: 8 fictional units as numbered rows along a vertical tower
  rail, each with a mini cutaway, specs, price, price/m2 and legal status.
- Buying journey: 5 steps, each mapped to a floor, with a sticky cutaway
  on desktop (not sticky on mobile). On desktop with GSAP, the steps
  stack on scroll inside a pinned section; on mobile they are a
  vertical list.
- Scroll motion (v1.1): burgundy scroll progress bar; pinned hero scrub
  (floor 1→18 + floor counter); masked heading reveals and word-by-word
  intro reveals; staggered listing/amenity/testimonial reveals, re-applied
  after every filter render; a pinned horizontal "Floors at a glance"
  strip on desktop (swipe row on mobile); a pure-CSS marquee ticker;
  kinetic outlined dividers; a cursor pill (DRAG on the tower, VIEW on
  listing cutaways, desktop only); rolling nav/footer links; a top-drop
  detail sheet (Escape closes, focus returns); magnetic buttons, chip
  press, expandable unit cards (first open); and a slow exposed-scaffold
  parallax. All durations/easings use motion tokens only
  (150ms / 250ms / 400ms / 700ms, power3.out / power4.out / linear).
- Amenities, statistics (fictional) and testimonials (fictional,
  including one with a minor drawback for credibility). The gallery is
  six hand-drawn SVG line-art figures with real captions.
- Visit: a burgundy booking band with a one-step demo form and a
  persistent booking bar that never covers the form (extra bottom
  padding is applied while the bar is visible).
- Typography (v1.2): Fraunces display serif + Manrope body (CDN, with
  Georgia/system fallback stacks), a fixed paper-grain overlay, and
  silhouette-style SVG cutaways everywhere (listings, journey, stats).

## Demo disclaimer

May Song Land, May Song Residence, all projects, prices, addresses,
coordinates, phone numbers, statistics and testimonials on this site
are **fictional illustration**. The booking form does not save data,
does not send data anywhere, and no agent will call you from it.
There is no database, no login and no payment.

## How to run

This is a static site with no build step. Open `index.html` directly,
or serve the folder with any static server, for example:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000/ . GitHub Pages can serve the same
folder as-is.

GSAP and the two display fonts are loaded from CDN but guarded: if they
fail, all content is still fully visible (reveals are never CSS-hidden
by default). The tower itself needs no CDN. If WebGL itself is
unavailable, the hero shows a static SVG building cutaway with the same
18 floors and the highlighted sample floor — never a blank hero. The
loader releases itself after 8 seconds at the latest, and a late tower
still recovers cleanly if the fallback already fired.

## Motion guards

- One rAF loop drives the WebGL scene (in `app.js`, calling `tower.js`),
  gated by `document.hidden` and an IntersectionObserver on the hero.
- If rAF stalls while the tab is visible (heavy load, throttled
  webview), a self-heal interval adds `body.anim-failsafe`, which forces
  every reveal to its final state — content beats spectacle. Only
  elements below the fold are ever hidden for reveals.
- Device pixel ratio is capped at 1.75; the GL context is disposed on
  unload via `WEBGL_lose_context`.
- `webglcontextlost` switches to the SVG fallback.
- The global Pause button (next to the hero CTA and in the booking
  band) freezes WebGL rotation, GSAP and CSS motion together, including
  pinned/horizontal/kinetic scrubs (their ScrollTrigger onUpdate
  callbacks return early while paused).
- `prefers-reduced-motion` shows the static tower and final states, with
  all pins, scrubs, marquee, horizontal, parallax and cursor pill off.
- Without GSAP (CDN blocked): the page is fully readable, the horizontal
  strip becomes a swipe row, the journey is a vertical list, and the hero
  floor scrub falls back to a corrected scroll calculation (hero height
  itself, not hero height minus viewport height).

## Files

- `index.html` — structure, hero, filter, listings, journey, amenities,
  proof, visit band, footer, and the static SVG cutaways.
- `styles.css` — Vertical Luxury tokens and layout.
- `app.js` — filters, listings, journey, booking demo, pause, rAF loop.
- `data.js` — fictional listings, amenities, journey, testimonials.
- `tower.js` — raw WebGL tower scene (separated from page logic).

## Version

REAL ESTATE — OPTION B + WEBGL — v1.2 — 2026-10-30

### Changelog v1.2 (visual upgrade pass)

- Tower v2: Lambert + rim lighting, fog, piers/podium/parapet/crown
  detail, ground shadow, self-framing camera, delta-time rotation,
  scroll-driven camera ride (was: unlit flat boxes, cropped framing,
  invisible ivory-on-ivory slabs).
- Fixed: fallback could appear together with a live 3D tower (5s race +
  `canvas.hidden` defeated by the stylesheet); now inline-display based
  with clean recovery.
- Fixed: reveal system could blank sections when rAF stalled (mask
  transform + opacity 0 pre-sets); now below-fold-only hiding plus an
  `anim-failsafe` self-heal class.
- Added: Fraunces/Manrope typography, paper grain, gallery line-art
  figures, silhouette cutaways, testimonial avatars, stat count-up,
  faster legible auto-rotation, `touch-action: pan-y` on the canvas.
