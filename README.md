# May Song Residence — Real Estate Landing (Option B + WebGL)

A fictional real-estate landing page in the Vertical Luxury style:
ivory paper, burgundy accent, a vertical tower as the organising idea.

## What it is

- Hero: a real WebGL tower written in raw WebGL in `tower.js`
  (no Three.js dependency, so it works even when a CDN is blocked):
  18 floors, burgundy sample floor 12, slow auto-rotation, drag to
  rotate, mouse tilt, and scroll-scrub that highlights floors from
  bottom to top and updates the floor counter.
- Filter: a fictional planning map, type chips, a budget dial and an
  area scale. Filters actually filter the listing rows and update the
  live count. An empty result is shown as an empty state, not an error.
- Listings: 8 fictional units as numbered rows along a vertical tower
  rail, each with a mini cutaway, specs, price, price/m2 and legal status.
- Buying journey: 5 steps, each mapped to a floor, with a sticky cutaway
  on desktop (not sticky on mobile).
- Amenities, statistics (fictional) and testimonials (fictional,
  including one with a minor drawback for credibility).
- Visit: a burgundy booking band with a one-step demo form and a
  persistent booking bar that never covers the form (extra bottom
  padding is applied while the bar is visible).

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

GSAP is loaded from CDN but guarded: if it fails, all content is
still fully visible (reveals are never CSS-hidden by default). The
tower itself needs no CDN. If WebGL itself is unavailable, the hero
shows a static SVG building cutaway with the same 18 floors and the
highlighted sample floor — never a blank hero. The loader releases
itself after 5 seconds at the latest.

## Motion guards

- One rAF loop drives the WebGL scene (in `app.js`, calling `tower.js`).
- Device pixel ratio is capped at 1.75; geometry, materials and the
  renderer are disposed on unload.
- `webglcontextlost` switches to the SVG fallback.
- The global Pause button (next to the hero CTA and in the booking
  band) freezes WebGL rotation, GSAP and CSS motion together.
- `prefers-reduced-motion` shows the static tower and final states.

## Files

- `index.html` — structure, hero, filter, listings, journey, amenities,
  proof, visit band, footer, and the static SVG cutaways.
- `styles.css` — Vertical Luxury tokens and layout.
- `app.js` — filters, listings, journey, booking demo, pause, rAF loop.
- `data.js` — fictional listings, amenities, journey, testimonials.
- `tower.js` — raw WebGL tower scene (separated from page logic).

## Version

REAL ESTATE — OPTION B + WEBGL — v1.0 — 2026-10-26
