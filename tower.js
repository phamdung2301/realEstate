// Raw WebGL hero tower for May Song Residence — no external dependency.
// The tower is drawn with real WebGL (not CSS): 18 stacked floor slabs,
// a glass band per floor, a burgundy-highlighted sample floor, a bronze
// roof and a stone lobby. One render loop is owned by app.js (tick).
// If WebGL is unavailable or the context is lost, the caller shows the
// SVG fallback instead — never a blank hero.

const FLOORS = 18;
const HIGHLIGHT = 12;

function hexRgb(hex) {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
}
function shade(rgb, f) {
  return rgb.map((v) => Math.min(1, v * f));
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
function rotX(a) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
}

const FACE_SHADE = [1, 0.85, 0.72, 0.72, 1.12, 0.55]; // front, back, right, left, top, bottom

export function initTower(canvas, fallbackEl, onFloorChange) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true }) || canvas.getContext("experimental-webgl", { alpha: true });
  if (!gl) throw new Error("WebGL unavailable");

  const vs = `attribute vec3 aPos; attribute vec3 aColor; uniform mat4 uMVP; varying vec3 vColor;
    void main(){ vColor = aColor; gl_Position = uMVP * vec4(aPos, 1.0); }`;
  const fs = `precision mediump float; varying vec3 vColor;
    void main(){ gl_FragColor = vec4(vColor, 1.0); }`;
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
  const colLoc = gl.getAttribLocation(prog, "aColor");
  const mvpLoc = gl.getUniformLocation(prog, "uMVP");
  gl.enable(gl.DEPTH_TEST);

  // Geometry: boxes with per-face shading. Vertices are grouped by face
  // (6 vertices per face, 6 faces per box) so highlighting a floor can
  // rewrite exactly that floor's colours.
  const positions = [];
  const colors = [];
  const floorRanges = {}; // floor -> { slab: [start, count], band: [start, count] }
  function pushBox(cx, cy, cz, w, h, d, base) {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, z0 = cz - d / 2, z1 = cz + d / 2;
    const faces = [
      [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y0, z1], [x1, y1, z1], [x0, y1, z1]], // front
      [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0]], // back
      [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y0, z1], [x1, y1, z0], [x1, y1, z1]], // right
      [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y0, z0], [x0, y1, z1], [x0, y1, z0]], // left
      [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z1], [x1, y1, z0], [x0, y1, z0]], // top
      [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z0], [x1, y0, z1], [x0, y0, z1]], // bottom
    ];
    const start = positions.length / 3;
    faces.forEach((face, fi) => {
      const col = shade(base, FACE_SHADE[fi]);
      face.forEach((v) => { positions.push(...v); colors.push(...col); });
    });
    return [start, 36];
  }
  const IVORY = hexRgb(0xe8e1d5), GLASS = hexRgb(0x769094), BURG = hexRgb(0x6d2d37),
    BRONZE = hexRgb(0x9a7652), STONE = hexRgb(0x484642), PAPER = hexRgb(0xf4efe7);
  for (let i = 1; i <= FLOORS; i++) {
    const y = 0.6 + i * 0.62;
    const isHi = i === HIGHLIGHT;
    const slab = pushBox(0, y, 0, 4, 0.52, 4, isHi ? BURG : IVORY);
    const band = pushBox(0, y + 0.18, 0, 4.14, 0.22, 4.14, isHi ? BRONZE : GLASS);
    floorRanges[i] = { slab, band };
  }
  pushBox(0, 0.3, 0, 4.6, 0.6, 4.6, STONE); // lobby
  pushBox(0, 0.6 + FLOORS * 0.62 + 0.42, 0, 4.3, 0.28, 4.3, BRONZE); // roof
  pushBox(0, -0.06, 0, 9, 0.12, 9, PAPER); // ground

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
  const colBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(colLoc);
  gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 0, 0);
  const vertexCount = positions.length / 3;

  function paintRange(range, base) {
    const [start, count] = range;
    for (let vi = 0; vi < count; vi++) {
      const face = Math.floor(vi / 6) % 6;
      const col = shade(base, FACE_SHADE[face]);
      const idx = (start + vi) * 3;
      colors[idx] = col[0]; colors[idx + 1] = col[1]; colors[idx + 2] = col[2];
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, start * 12, new Float32Array(colors.slice(start * 3, (start + count) * 3)));
  }

  let targetRot = 0.45, currentRot = 0.45, tilt = 0, targetTilt = 0;
  let dragging = false, lastX = 0, highlighted = HIGHLIGHT;
  let paused = false, reduced = false, disposed = false;

  function setHighlight(floor) {
    const f = Math.max(1, Math.min(FLOORS, Math.round(floor)));
    if (f === highlighted) return;
    const old = floorRanges[highlighted];
    paintRange(old.slab, IVORY); paintRange(old.band, GLASS);
    highlighted = f;
    const cur = floorRanges[f];
    paintRange(cur.slab, BURG); paintRange(cur.band, BRONZE);
    if (onFloorChange) onFloorChange(f);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.max(1, Math.round((canvas.clientWidth || 520) * dpr));
    const h = Math.max(1, Math.round((canvas.clientHeight || 620) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
  }
  resize();

  canvas.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; try { canvas.setPointerCapture(e.pointerId); } catch (err) {} });
  canvas.addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("pointercancel", () => { dragging = false; });
  canvas.addEventListener("pointermove", (e) => {
    if (dragging && !reduced && !paused) { targetRot += (e.clientX - lastX) * 0.008; lastX = e.clientX; }
    const r = canvas.getBoundingClientRect();
    targetTilt = ((e.clientY - r.top) / Math.max(r.height, 1) - 0.5) * 0.12;
  });
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    if (fallbackEl) fallbackEl.hidden = false;
    canvas.hidden = true;
  });

  function tick() {
    if (disposed) return;
    if (reduced) {
      currentRot = 0.45; tilt = 0;
    } else if (!paused) {
      if (!dragging) targetRot += 0.0009;
      currentRot += (targetRot - currentRot) * 0.08;
      tilt += (targetTilt - tilt) * 0.06;
    }
    if (typeof window !== "undefined") window.__towerRot = currentRot;
    const aspect = canvas.width / Math.max(canvas.height, 1);
    const proj = perspective(38 * Math.PI / 180, aspect, 0.1, 100);
    const view = lookAt([7.5, 7, 11], [0, 6, 0], [0, 1, 0]);
    const model = multiply(rotY(currentRot), rotX(tilt));
    // Centre the tower vertically: shift the model down in view space is
    // approximated by the camera target (0,6,0) above; no extra translation.
    const mvp = multiply(multiply(proj, view), model);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(mvpLoc, false, mvp);
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }

  function dispose() {
    disposed = true;
    try { const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); } catch (err) {}
  }

  return {
    tick, resize, dispose, setHighlight,
    setPaused: (v) => { paused = !!v; },
    setReduced: (v) => { reduced = !!v; },
    get highlighted() { return highlighted; },
  };
}
