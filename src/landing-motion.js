// Decorative motion of the approved artwork; never a map or listing renderer.
const canvas = document.querySelector('#landing-motion');
const toggle = document.querySelector('#landing-motion-toggle');
const entry = document.querySelector('#entry-stage');
const surface = document.querySelector('#viewport');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;
const fragmentSource = `
precision mediump float;
uniform sampler2D artwork;
uniform vec2 crop;
uniform float time;
varying vec2 uv;
void main() {
  // Gentle periodic drift; a single rigid transform preserves every building.
  float phase = time * 0.07;
  float zoom = 1.0 + 0.007 * (1.0 - cos(phase));
  vec2 p = (uv - 0.5) * crop / zoom + 0.5;
  p.x += (zoom - 1.0) * 0.12 * sin(phase);
  vec3 color = texture2D(artwork, p).rgb;
  float y = 1.0 - p.y;
  // A conservative corridor in this illustration's open water, feathered at
  // its edges and gated by blue/green color. No facade or shoreline warping.
  float left = mix(0.36, -0.05, smoothstep(0.50, 0.76, y));
  float right = mix(0.45, 0.30, smoothstep(0.52, 0.80, y));
  right += 0.15 * smoothstep(0.88, 1.0, y);
  float water = smoothstep(left, left + 0.035, p.x)
    * (1.0 - smoothstep(right - 0.035, right, p.x))
    * smoothstep(0.51, 0.57, y)
    * smoothstep(0.035, 0.10, color.b - color.r)
    * smoothstep(0.025, 0.07, color.g - color.r);
  float ripple = sin(p.y * 530.0 + p.x * 65.0 + time * 0.65)
    * sin(p.x * 290.0 - time * 0.43);
  color += water * ripple * 0.018 * min(time * 0.3, 1.0);
  gl_FragColor = vec4(color, 1.0);
}`;

let gl, program, texture, buffer, cropUniform, timeUniform;
let loading = false, ready = false, failed = false, paused = false;
let frame = 0, previous = 0, elapsed = 0, lastDraw = 0;
let image;

function onLanding() {
  return document.body.classList.contains('empty-state');
}
function focusedInput() {
  return entry.contains(document.activeElement)
    && document.activeElement.matches('input, textarea, select');
}
function running() {
  return ready && !failed && !paused && !reduced.matches
    && onLanding() && !document.hidden && !focusedInput();
}
function stop() {
  cancelAnimationFrame(frame);
  frame = 0;
  previous = 0;
}
function fail() {
  failed = true;
  ready = false;
  stop();
  canvas.hidden = true;
  toggle.hidden = true;
  canvas.dataset.motionState = 'unavailable';
}
function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}
function draw() {
  if (!ready || !onLanding() || reduced.matches) return;
  const {width, height} = surface.getBoundingClientRect();
  if (!width || !height) return;
  // Cap the backing store at the source's useful resolution, even on Retina.
  const ratio = Math.min(devicePixelRatio, 2, 2048 / width, 1536 / height);
  const w = Math.round(width * ratio), h = Math.round(height * ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
  const scale = Math.max(width / image.width, height / image.height);
  gl.uniform2f(cropUniform, width / (image.width * scale), height / (image.height * scale));
  gl.uniform1f(timeUniform, elapsed);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  canvas.hidden = false;
}
function tick(now) {
  frame = 0;
  if (!running()) return sync();
  if (previous) elapsed += Math.min((now - previous) / 1000, 0.1);
  previous = now;
  // Thirty draws per second are ample for this deliberately slow background.
  if (now - lastDraw >= 1000 / 30) {
    draw();
    lastDraw = now;
  }
  frame = requestAnimationFrame(tick);
}
function sync() {
  if (onLanding() && !reduced.matches && !ready && !loading && !failed) init();
  if (!ready || failed) return;
  toggle.hidden = !onLanding() || reduced.matches;
  toggle.textContent = paused ? 'Play motion' : 'Pause motion';
  canvas.hidden = !onLanding() || reduced.matches;
  canvas.dataset.motionState = reduced.matches ? 'reduced'
    : !onLanding() ? 'inactive'
    : document.hidden ? 'hidden'
    : paused ? 'paused' : focusedInput() ? 'input' : 'playing';
  if (running()) {
    if (!frame) frame = requestAnimationFrame(tick);
  } else {
    stop();
    draw();
  }
}
function init() {
  loading = true;
  try {
    gl = canvas.getContext('webgl', {alpha: false, antialias: false, depth: false,
      stencil: false, powerPreference: 'low-power'});
    if (!gl) return fail();
    program = gl.createProgram();
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return fail();
    gl.useProgram(program);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    cropUniform = gl.getUniformLocation(program, 'crop');
    timeUniform = gl.getUniformLocation(program, 'time');
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    image = new Image();
    image.onload = () => {
      if (failed) return;
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
        if (gl.getError() !== gl.NO_ERROR) return fail();
        ready = true;
        loading = false;
        draw();
        sync();
      } catch { fail(); }
    };
    image.onerror = fail;
    image.src = '/hudson-daylight-illustration.webp';
  } catch { fail(); }
}

toggle.addEventListener('click', () => { paused = !paused; sync(); });
entry.addEventListener('focusin', sync);
entry.addEventListener('focusout', () => queueMicrotask(sync));
document.addEventListener('visibilitychange', sync);
reduced.addEventListener('change', sync);
new MutationObserver(sync).observe(document.body, {attributes: true, attributeFilter: ['class']});
new ResizeObserver(() => { draw(); sync(); }).observe(surface);
canvas.addEventListener('webglcontextlost', fail);
// A GPU failure keeps the CSS poster. It never blocks intake or starts retries.
sync();
