// Raw WebGL hero tower for May Song Residence — no external dependency (v2).
// v2 upgrades over v1: per-pixel Lambert lighting with a warm key light and a
// cool fill, a rim term for the glass bands, distance fog into the paper sky,
// corner piers + podium + parapet + crown for an architectural silhouette, a
// soft ground shadow, a self-framing camera that always fits the whole tower,
// delta-time rotation, and a scroll-driven camera "ride" that glides the view
// up the building as floors highlight.
// If WebGL is unavailable or the context is lost, the caller shows the
// SVG fallback instead — never a blank hero.

const FLOORS = 18;

function hexRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}

// Column-major 4x4 helpers (the layout WebGL expects).
function multiply(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2);
  const o = new Float32Array(16);
  o[0] = f / aspect; o[5] = f; o[10] = (far + near) / (near - far); o[11] = -1;
  o[14] = (2 * far * near) / (near - far);
  return o;
}
function lookAt(eye, target, up) {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  const o = new Float32Array(16);
  o[0] = x[0]; o[1] = y[0]; o[2] = z[0];
  o[4] = x[1]; o[5] = y[1]; o[6] = z[1];
  o[8] = x[2]; o[9] = y[2]; o[10] = z[2];
  o[12] = -dot(x, eye); o[13] = -dot(y, eye); o[14] = -dot(z, eye); o[15] = 1;
  return o;
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(v) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }
function rotY(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
}

// Albedo palette — distinct from the stage sky so the mass always reads.
const SLAB = hexRgb(0xe7dfcf);   // floor slabs (warm ivory)
const GLASS = hexRgb(0x6f8a8e);  // window bands (deep teal glass)
const PIER = hexRgb(0xc9b795);   // corner piers (limestone)
const BURG = hexRgb(0x6d2d37);   // highlight slab
const BRONZE = hexRgb(0x9a7652); // highlight band + roof
const PODIUM = hexRgb(0x55524b); // lobby base
const DARK = hexRgb(0x2e2c28);   // entrance, mast
const PAD = hexRgb(0xcfc0a2);    // ground pad
const SHADOW = hexRgb(0xb7a685); // soft shadow ellipse

const FLOOR_H = 0.62;
const PODIUM_TOP = 0.85;
const TOP_Y = PODIUM_TOP + FLOORS * FLOOR_H + 0.9; // roof crown tip ≈ 13.0

export function initTower(canvas, fallbackEl, onFloorChange) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true }) || canvas.getContext("experimental-webgl", { alpha: true });
  if (!gl) throw new Error("WebGL unavailable");

  const vs = `attribute vec3 aPos; attribute vec3 aNormal; attribute vec3 aColor;
    uniform mat4 uMVP; uniform mat4 uModel;
    varying vec3 vNormal; varying vec3 vColor; varying vec3 vWorld;
    void main(){
      mat3 nm = mat3(uModel[0].xyz, uModel[1].xyz, uModel[2].xyz);
      vNormal = nm * aNormal;
      vColor = aColor;
      vWorld = (uModel * vec4(aPos, 1.0)).xyz;
      gl_Position = uMVP * vec4(aPos, 1.0);
    }`;
  const fs = `precision mediump float;
    varying vec3 vNormal; varying vec3 vColor; varying vec3 vWorld;
    uniform vec3 uEye;
    void main(){
      vec3 N = normalize(vNormal);
      vec3 V = normalize(uEye - vWorld);
      if (dot(N, V) < 0.0) N = -N;
      vec3 SUN = normalize(vec3(0.42, 0.80, 0.44));
      vec3 FILL = normalize(vec3(-0.55, 0.10, -0.62));
      float diff = max(dot(N, SUN), 0.0);
      float fill = max(dot(N, FILL), 0.0);
      float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      float fog = smoothstep(16.0, 36.0, length(uEye - vWorld));
      vec3 col = vColor * (0.50 + 0.55 * diff) + vec3(0.09) * fill
               + vec3(1.0, 0.86, 0.62) * rim * 0.16;
      vec3 sky = vec3(0.88, 0.84, 0.75);
      gl_FragColor = vec4(mix(col, sky, fog * 0.55), 1.0);
    }`;
  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const posLoc = gl.getAttribLocation(prog, "aPos");
  const nrmLoc = gl.getAttribLocation(prog, "aNormal");
  const colLoc = gl.getAttribLocation(prog, "aColor");
  const mvpLoc = gl.getUniformLocation(prog, "uMVP");
  const modelLoc = gl.getUniformLocation(prog, "uModel");
  const eyeLoc = gl.getUniformLocation(prog, "uEye");
  gl.enable(gl.DEPTH_TEST);

  // Geometry: boxes grouped by face (6 verts/face) so highlight repaints only
  // touch one floor's colours. Normals per face feed the lighting model.
  const positions = [];
  const normals = [];
  const colors = [];
  function pushBox(cx, cy, cz, w, h, d, base) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const faces = [
      { n: [0, 0, 1], q: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
      { n: [0, 0, -1], q: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] },
      { n: [1, 0, 0], q: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] },
      { n: [-1, 0, 0], q: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
      { n: [0, 1, 0], q: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] },
      { n: [0, -1, 0], q: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    ];
    const start = positions.length / 3;
    faces.forEach((f) => {
      [0, 1, 2, 0, 2, 3].forEach((i) => {
        positions.push(...f.q[i]); normals.push(...f.n); colors.push(...base);
      });
    });
    return [start, 36];
  }
  function pushEllipse(cx, cy, cz, rx, rz, base, seg = 28) {
    const start = positions.length / 3;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      positions.push(cx, cy, cz, cx + Math.cos(a0) * rx, cy, cz + Math.sin(a0) * rz, cx + Math.cos(a1) * rx, cy, cz + Math.sin(a1) * rz);
      for (let k = 0; k < 3; k++) { normals.push(0, 1, 0); colors.push(...base); }
    }
    return [start, seg * 3];
  }

  const floorRanges = {}; // floor -> { slab, band }
  for (let i = 1; i <= FLOORS; i++) {
    const y = PODIUM_TOP + i * FLOOR_H;
    const isHi = i === 12;
    const slab = pushBox(0, y, 0, 4.3, 0.30, 4.3, isHi ? BURG : SLAB);
    const band = pushBox(0, y + 0.26, 0, 4.02, 0.30, 4.02, isHi ? BRONZE : GLASS);
    // Corner piers run the full height, stacked per floor.
    pushBox(-2.0, y + 0.13, -2.0, 0.36, FLOOR_H, 0.36, PIER);
    pushBox(2.0, y + 0.13, -2.0, 0.36, FLOOR_H, 0.36, PIER);
    pushBox(-2.0, y + 0.13, 2.0, 0.36, FLOOR_H, 0.36, PIER);
    pushBox(2.0, y + 0.13, 2.0, 0.36, FLOOR_H, 0.36, PIER);
    floorRanges[i] = { slab, band };
  }
  // Podium, canopy, entrance.
  pushBox(0, PODIUM_TOP / 2, 0, 5.3, PODIUM_TOP, 5.3, PODIUM);
  pushBox(0, PODIUM_TOP + 0.12, 0, 5.9, 0.14, 5.9, BRONZE);
  pushBox(0, 0.55, 2.7, 1.3, 1.1, 0.12, DARK);
  // Roof: parapet ring, crown, mast.
  const roofY = PODIUM_TOP + FLOORS * FLOOR_H + 0.15;
  pushBox(-2.05, roofY + 0.16, 0, 0.4, 0.32, 4.5, BRONZE);
  pushBox(2.05, roofY + 0.16, 0, 0.4, 0.32, 4.5, BRONZE);
  pushBox(0, roofY + 0.16, -2.05, 4.5, 0.32, 0.4, BRONZE);
  pushBox(0, roofY + 0.16, 2.05, 4.5, 0.32, 0.4, BRONZE);
  pushBox(0, roofY + 0.55, 0, 2.1, 0.5, 2.1, PIER);
  pushBox(0, roofY + 1.15, 0, 0.08, 0.75, 0.08, DARK);
  // Ground pad + soft shadow.
  pushBox(0, 0.06, 0, 24, 0.12, 24, PAD);
  pushEllipse(0, 0.13, 0, 3.9, 3.9, SHADOW);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
  const nrmBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(nrmLoc);
  gl.vertexAttribPointer(nrmLoc, 3, gl.FLOAT, false, 0, 0);
  const colBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(colLoc);
  gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);
  const vertexCount = positions.length / 3;

  function paintRange(range, base) {
    const [start, count] = range;
    for (let vi = 0; vi < count; vi++) {
      const idx = (start + vi) * 3;
      colors[idx] = base[0]; colors[idx + 1] = base[1]; colors[idx + 2] = base[2];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, start * 12, new Float32Array(colors.slice(start * 3, (start + count) * 3)));
  }

  // Camera: yaw (drag + slow auto-rotate), pointer tilt as a small height
  // shift, and a scroll "ride" that lifts the view as floors highlight.
  let targetYaw = 0.55, currentYaw = 0.55, tilt = 0, targetTilt = 0;
  let targetRide = 11 / 17, currentRide = 11 / 17; // starts on the sample floor 12
  let dragging = false, lastX = 0, highlighted = 12;
  let paused = false, reduced = false, disposed = false;
  let fitRadius = 17.6, lastTime = 0;

  function setHighlight(floor) {
    const f = Math.max(1, Math.min(FLOORS, Math.round(floor)));
    if (f === highlighted) return;
    const old = floorRanges[highlighted];
    paintRange(old.slab, SLAB); paintRange(old.band, GLASS);
    highlighted = f;
    const cur = floorRanges[f];
    paintRange(cur.slab, BURG); paintRange(cur.band, BRONZE);
    if (onFloorChange) onFloorChange(f);
  }

  // Scroll ride 0..1: highlights floor round(p*17)+1 and glides the camera up.
  function setRide(p) {
    const c = Math.max(0, Math.min(1, p));
    targetRide = c;
    setHighlight(Math.round(c * (FLOORS - 1)) + 1);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round((canvas.clientWidth || 520) * dpr));
    const h = Math.max(1, Math.round((canvas.clientHeight || 620) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    // Self-framing: far enough that the whole tower fits height and width.
    const halfFov = Math.tan(25 * Math.PI / 180); // vertical fov 50°
    const aspect = w / Math.max(h, 1);
    fitRadius = Math.max((TOP_Y / 2 + 1.4) / halfFov, 3.4 / (halfFov * aspect));
  }
  resize();

  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging && !reduced && !paused) { targetYaw += (e.clientX - lastX) * 0.006; lastX = e.clientX; }
    const r = canvas.getBoundingClientRect();
    targetTilt = ((e.clientY - r.top) / Math.max(r.height, 1) - 0.5) * 0.28;
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") window.__ctxLost = true;
    if (fallbackEl) {
      fallbackEl.hidden = false;
      const msg = fallbackEl.querySelector("p");
      if (msg) msg.textContent = "Static cutaway — the 3D context was lost, so the tower is replaced by this drawing.";
    }
    canvas.style.display = "none";
  });

  function tick() {
    if (disposed) return;
    const now = performance.now();
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = now;
    if (reduced) {
      currentYaw = 0.55; tilt = 0; currentRide = targetRide;
    } else if (!paused) {
      if (!dragging) targetYaw += 0.22 * dt; // one revolution ≈ 28s — visible but calm
      currentYaw += (targetYaw - currentYaw) * 0.08;
      tilt += (targetTilt - tilt) * 0.06;
      currentRide += (targetRide - currentRide) * 0.06;
    }
    if (typeof window !== "undefined") window.__towerRot = currentYaw;
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const proj = perspective(50 * Math.PI / 180, aspect, 0.1, 60);
    const targetY = 5.4 + currentRide * 2.6 - tilt * 2;
    const eyeY = 7.6 + currentRide * 2.6 + tilt * 6;
    const R = fitRadius * (1 - currentRide * 0.08);
    const eye = [Math.sin(currentYaw) * R, eyeY, Math.cos(currentYaw) * R];
    const view = lookAt(eye, [0, targetY, 0], [0, 1, 0]);
    const model = rotY(currentYaw);
    const mvp = multiply(multiply(proj, view), model);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.uniformMatrix4fv(modelLoc, false, model);
    gl.uniform3fv(eyeLoc, new Float32Array(eye));
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  function dispose() {
    disposed = true;
    try { const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (err) {}
  }

  const api = {
    tick, resize, dispose, setRide, setHighlight,
    setPaused: (v) => { paused = !!v; },
    setReduced: (v) => { reduced = !!v; },
    get highlighted() { return highlighted; },
  };
  // Debug/verification handle (harmless in production).
  if (typeof window !== "undefined") window.__towerApi = api;
  return api;
}
