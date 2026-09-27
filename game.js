["gesturestart", "gesturechange", "gestureend"].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault());
});

document.addEventListener(
  "touchmove",
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false },
);

const PAINT_COLORS = [
  { name: "green", tile: "#8ecf9e", edge: "#72b484", ink: "#3d4a38" },
  { name: "blue", tile: "#8ebce8", edge: "#72a0d0", ink: "#3d4a54" },
  { name: "black", tile: "#3a3532", edge: "#241f1d", ink: "#f3eee6" },
  { name: "white", tile: "#f7f4ef", edge: "#d0cbc3", ink: "#3a3532" },
  { name: "orange", tile: "#f0a05a", edge: "#d48640", ink: "#5a4538" },
  { name: "red", tile: "#e24b4b", edge: "#c43a3a", ink: "#4a3535" },
  { name: "pink", tile: "#f2a0c4", edge: "#d484a8", ink: "#5a3d4a" },
  { name: "yellow", tile: "#f0d56e", edge: "#d4b84e", ink: "#5a5148" },
  { name: "purple", tile: "#b07cc4", edge: "#9466a8", ink: "#4a3d50" },
];

const GRAY = { name: "gray", tile: "#c8c4be", edge: "#ada9a3", ink: "#5a5148" };

const app = document.querySelector(".app");
const board = document.getElementById("board");
const modeSelect = document.getElementById("mode");
const colorsButton = document.getElementById("colors");
const addButton = document.getElementById("addCircle");
const circleCount = document.getElementById("circleCount");
const gifBack = document.getElementById("gifBack");
const gifNext = document.getElementById("gifNext");
const gifCount = document.getElementById("gifCount");
const firePanel = document.getElementById("firePanel");
const fireCount = document.getElementById("fireCount");
const fireSpeed = document.getElementById("fireSpeed");
const fireGravity = document.getElementById("fireGravity");
const fireLife = document.getElementById("fireLife");
const fireSize = document.getElementById("fireSize");
const fireHue = document.getElementById("fireHue");
const fireRainbow = document.getElementById("fireRainbow");
const fireColor = document.getElementById("fireColor");
const RAINBOW_HUES = [0, 24, 48, 72, 130, 175, 205, 265, 300];
const caseToggle = document.getElementById("caseToggle");
const GIFS = [
  "animations/1.gif",
  "animations/2.gif",
  "animations/3.gif",
  "animations/4.gif",
  "animations/7.gif",
];
let gifIndex = 0;
let drag = null;
let circleSize = 88;

let mode = "circles";
let uppercase = true;
let found = 0;
let resetting = false;
let tiles = [];
let audioContext;
let ink = null;
let inkCtx = null;
let inkHint = null;
let blooms = [];
let bloomSerial = 0;
let animFrame = 0;
let animating = false;
let lastPointerSpawn = 0;
let fireCanvas = null;
let fireCtx = null;
let fireParticles = [];
let fireRockets = [];
let fireFrame = 0;
let fireRunning = false;
let fireLast = 0;

buildBoard();

modeSelect.addEventListener("change", () => {
  mode = modeSelect.value;
  buildBoard();
});

colorsButton.addEventListener("click", randomizeColors);
gifBack.addEventListener("click", () => stepGif(-1));
gifNext.addEventListener("click", () => stepGif(1));
bindFireReadout(fireCount, "fireCountValue", (value) => value);
bindFireReadout(fireSpeed, "fireSpeedValue", (value) => value);
bindFireReadout(fireGravity, "fireGravityValue", (value) => value);
bindFireReadout(fireLife, "fireLifeValue", (value) => Number(value).toFixed(1));
bindFireReadout(fireSize, "fireSizeValue", (value) => value);
bindFireReadout(fireHue, "fireHueValue", (value) => value);
fireRainbow.addEventListener("change", () => {
  fireHue.disabled = fireRainbow.checked;
  fireColor.classList.toggle("is-off", fireRainbow.checked);
});
addButton.addEventListener("click", () => addCircle(randomPaint(), randomSpot()));

caseToggle.addEventListener("click", () => {
  uppercase = !uppercase;
  updateCaseButton();
  tiles.forEach((button) => {
    button.dataset.symbol = formatSymbol(button.dataset.raw);
    if (button.dataset.value) {
      button.textContent = button.dataset.symbol;
      button.setAttribute("aria-label", button.dataset.symbol);
    }
  });
});


function valuesForMode(selected) {
  if (selected === "abc") {
    return Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
  }

  if (selected === "colors") {
    return Array.from({ length: 20 }, (_, index) => String(index + 1));
  }

  const step = Number(selected);
  return Array.from({ length: 20 }, (_, index) => String((index + 1) * step));
}

function formatSymbol(raw) {
  if (mode !== "abc") return raw;
  return uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

function buildBoard() {
  endDrag();
  stopAnimations();
  stopFireworks();
  resetting = false;
  found = 0;
  board.innerHTML = "";
  board.classList.remove("complete");
  const isCircles = mode === "circles";
  const isAnimations = mode === "animations";
  const isReel = mode === "animations2";
  const isFire = mode === "fireworks";
  document.body.classList.toggle("circles", isCircles);
  document.body.classList.toggle("animations", isAnimations);
  document.body.classList.toggle("animations2", isReel);
  document.body.classList.toggle("fireworks", isFire);
  document.querySelector('meta[name="theme-color"]').setAttribute("content", isAnimations || isReel || isFire ? "#000000" : "#f3eee6");
  board.classList.toggle("letters", mode === "abc");
  board.classList.toggle("paint", mode === "colors");
  board.classList.toggle("playground", isCircles);
  board.classList.toggle("stage", isAnimations);
  board.classList.toggle("reel", isReel);
  board.classList.toggle("night", isFire);
  app.classList.toggle("free", isCircles || isAnimations || isReel || isFire);
  firePanel.classList.toggle("hidden", !isFire);
  board.setAttribute(
    "aria-label",
    mode === "abc"
      ? "A to Z"
      : isCircles
        ? "Circles"
        : isAnimations
          ? "Animations"
          : isReel
            ? "Animations 2"
            : isFire
              ? "Fireworks"
              : mode === "colors"
            ? "Colors"
            : `Count by ${mode}`,
  );
  caseToggle.classList.toggle("hidden", mode !== "abc");
  colorsButton.classList.toggle("hidden", isCircles || mode === "colors" || isAnimations || isReel || isFire);
  addButton.classList.toggle("hidden", !isCircles);
  circleCount.classList.toggle("hidden", !isCircles);
  gifBack.classList.toggle("hidden", !isReel);
  gifNext.classList.toggle("hidden", !isReel);
  gifCount.classList.toggle("hidden", !isReel);
  updateCircleCount();
  updateCaseButton();

  if (isCircles) {
    tiles = [];
    preparePlayground();
    return;
  }

  if (isAnimations) {
    tiles = [];
    startAnimations();
    return;
  }

  if (isReel) {
    tiles = [];
    startGifReel();
    return;
  }

  if (isFire) {
    tiles = [];
    startFireworks();
    return;
  }

  const values = valuesForMode(mode);
  tiles = values.map((raw, index) => {
    const button = document.createElement("button");
    const symbol = formatSymbol(raw);
    button.type = "button";
    button.className = "tile";
    button.dataset.raw = raw;
    button.dataset.symbol = symbol;
    button.setAttribute("aria-label", `Blank button ${index + 1}`);
    button.addEventListener("click", () => onTileClick(button));
    if (mode === "colors") paintTile(button, GRAY);
    board.appendChild(button);
    return button;
  });
}

function updateCaseButton() {
  caseToggle.textContent = uppercase ? "ABC" : "abc";
  caseToggle.setAttribute("aria-pressed", String(uppercase));
}

function wiggle(button) {
  button.classList.remove("wiggle");
  void button.offsetWidth;
  button.classList.add("wiggle");
}

function onTileClick(button) {
  if (resetting) return;

  if (button.dataset.value) {
    wiggle(button);
    return;
  }

  if (mode === "colors") {
    const color = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
    found += 1;
    button.dataset.value = color.name;
    button.classList.add("revealed");
    button.setAttribute("aria-label", color.name);
    paintTile(button, color);
    playTone(found);

    if (found === tiles.length) {
      finish();
    }
    return;
  }

  const symbol = button.dataset.symbol;
  found += 1;
  button.dataset.value = symbol;
  button.textContent = symbol;
  button.classList.add("revealed");
  button.setAttribute("aria-label", symbol);
  playTone(found);

  if (found === tiles.length) {
    finish();
  }
}

function finish() {
  resetting = true;
  board.classList.add("complete");
  playSuccess();
  window.setTimeout(resetBoard, 1900);
}

function resetBoard() {
  tiles.forEach((button, index) => {
    button.textContent = "";
    button.classList.remove("revealed", "wiggle");
    delete button.dataset.value;
    button.setAttribute("aria-label", `Blank button ${index + 1}`);
    if (mode === "colors") {
      paintTile(button, GRAY);
    }
  });

  board.classList.remove("complete");
  found = 0;
  resetting = false;
}

function preparePlayground() {
  requestAnimationFrame(() => {
    const gap = 14;
    const pad = 8;
    const byWidth = Math.floor((board.clientWidth - pad * 2 - gap * 4) / 5);
    const byHeight = Math.floor((board.clientHeight - pad * 2 - gap * 3) / 4);
    circleSize = Math.max(52, Math.min(108, byWidth, byHeight));
  });
}

let stack = 5;

function createCircle(color, born) {
  const circle = document.createElement("button");
  circle.type = "button";
  circle.className = born ? "circle born" : "circle";
  circle.style.setProperty("--size", `${circleSize}px`);
  circle.setAttribute("aria-label", `${color.name} circle`);
  paintTile(circle, color);
  circle.addEventListener("pointerdown", onPointerDown);
  circle.addEventListener("dragstart", (event) => event.preventDefault());
  board.appendChild(circle);
  return circle;
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  const circle = event.currentTarget;
  const rect = circle.getBoundingClientRect();
  drag = {
    circle,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  circle.classList.add("dragging");
  circle.classList.remove("born");
  stack += 1;
  circle.style.zIndex = String(stack);
  try {
    board.setPointerCapture(event.pointerId);
  } catch (error) {
    // Touch browsers can reject capture; window listeners still follow the finger.
  }
  event.preventDefault();
}

function onPointerMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  followFinger(event.clientX, event.clientY);
  event.preventDefault();
}

function onPointerUp(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  if (event.type === "pointercancel" && drag.pointerType === "touch") return;
  endDrag();
}

function followFinger(clientX, clientY) {
  if (!drag) return;
  const parent = board.getBoundingClientRect();
  moveCircle(
    drag.circle,
    clientX - parent.left - drag.offsetX,
    clientY - parent.top - drag.offsetY,
  );
}

function endDrag() {
  if (!drag) return;
  drag.circle.classList.remove("dragging");
  drag = null;
}

window.addEventListener("pointermove", onPointerMove, { passive: false });
window.addEventListener("pointerup", onPointerUp);
window.addEventListener("pointercancel", onPointerUp);

document.addEventListener(
  "touchmove",
  (event) => {
    if (!drag || drag.pointerType !== "touch") return;
    event.preventDefault();
    const touch = [...event.touches].find((item) => item.identifier === drag.pointerId);
    if (!touch) return;
    followFinger(touch.clientX, touch.clientY);
  },
  { passive: false },
);

document.addEventListener("touchend", (event) => {
  if (!drag || drag.pointerType !== "touch") return;
  const stillDown = [...event.touches].some((item) => item.identifier === drag.pointerId);
  if (!stillDown) endDrag();
});

document.addEventListener("touchcancel", (event) => {
  if (!drag || drag.pointerType !== "touch") return;
  const stillDown = [...event.touches].some((item) => item.identifier === drag.pointerId);
  if (!stillDown) endDrag();
});

function moveCircle(circle, x, y) {
  const maxX = Math.max(0, board.clientWidth - circle.offsetWidth);
  const maxY = Math.max(0, board.clientHeight - circle.offsetHeight - 10);
  circle.style.left = `${Math.min(Math.max(0, x), maxX)}px`;
  circle.style.top = `${Math.min(Math.max(0, y), maxY)}px`;
}

function randomPaint() {
  return PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
}

function randomSpot() {
  const maxX = Math.max(0, board.clientWidth - circleSize);
  const maxY = Math.max(0, board.clientHeight - circleSize);
  return {
    x: Math.random() * maxX,
    y: Math.random() * maxY,
  };
}

function addCircle(color, spot) {
  const circle = createCircle(color, true);
  moveCircle(circle, spot.x, spot.y);
  updateCircleCount();
}

function updateCircleCount() {
  const total = board.querySelectorAll(".circle").length;
  circleCount.textContent = String(total);
  circleCount.setAttribute("aria-label", `${total} ${total === 1 ? "circle" : "circles"}`);
}

window.addEventListener("resize", () => {
  if (mode !== "circles") return;
  board.querySelectorAll(".circle").forEach((circle) => {
    moveCircle(circle, parseFloat(circle.style.left) || 0, parseFloat(circle.style.top) || 0);
  });
});

function paintTile(button, color) {
  button.style.setProperty("--tile", color.tile);
  button.style.setProperty("--tile-edge", color.edge);
  button.style.setProperty("--tile-ink", color.ink || "#3a3532");
}

function randomizeColors() {
  tiles.forEach((button) => {
    const color = PAINT_COLORS[Math.floor(Math.random() * PAINT_COLORS.length)];
    button.style.setProperty("--tile", color.tile);
    button.style.setProperty("--tile-edge", color.edge);
    button.style.setProperty("--tile-ink", color.ink);
  });
}

function getAudio() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(value) {
  const ctx = getAudio();
  if (!ctx) return;

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(320 + value * 18, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.24);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function stopAnimations() {
  animating = false;
  cancelAnimationFrame(animFrame);
  blooms = [];
  ink = null;
  inkCtx = null;
  inkHint = null;
  window.removeEventListener("resize", resizeAnimations);
}

function bindFireReadout(input, outputId, format) {
  const output = document.getElementById(outputId);
  const paint = () => {
    output.textContent = format(input.value);
  };
  input.addEventListener("input", paint);
  paint();
}

function stopFireworks() {
  fireRunning = false;
  cancelAnimationFrame(fireFrame);
  fireParticles = [];
  fireRockets = [];
  fireCanvas = null;
  fireCtx = null;
  window.removeEventListener("resize", resizeFireworks);
}

function startFireworks() {
  fireCanvas = document.createElement("canvas");
  fireCanvas.className = "night-sky";
  fireCanvas.tabIndex = 0;
  fireCanvas.setAttribute("role", "button");
  fireCanvas.setAttribute("aria-label", "Launch a firework");
  fireCtx = fireCanvas.getContext("2d");
  board.appendChild(fireCanvas);
  fireCanvas.addEventListener("pointerdown", onFirePointer);
  window.addEventListener("resize", resizeFireworks);
  requestAnimationFrame(resizeFireworks);
}

function resizeFireworks() {
  if (!fireCanvas || !fireCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, fireCanvas.clientWidth);
  const height = Math.max(1, fireCanvas.clientHeight);
  fireCanvas.width = Math.floor(width * dpr);
  fireCanvas.height = Math.floor(height * dpr);
  fireCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintFireworks();
}

function onFirePointer(event) {
  if (event.button !== 0) return;
  const rect = fireCanvas.getBoundingClientRect();
  launchFirework(event.clientX - rect.left, event.clientY - rect.top);
}

function launchFirework(x, y) {
  if (!fireCanvas) return;
  const ground = fireCanvas.clientHeight;
  fireRockets.push({
    x,
    y: ground,
    tx: x,
    ty: Math.min(y, ground - 24),
    hue: Number(fireHue.value),
  });
  ensureFireLoop();
}

function sparkHue(base) {
  if (!fireRainbow.checked) return base + (Math.random() - 0.5) * 28;
  return RAINBOW_HUES[Math.floor(Math.random() * RAINBOW_HUES.length)];
}

function burstFirework(x, y, hue) {
  const count = Number(fireCount.value);
  const speed = Number(fireSpeed.value);
  const life = Number(fireLife.value);
  const size = Number(fireSize.value);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + Math.random() * 0.15;
    const mag = speed * skyScale() * (0.45 + Math.random() * 0.55);
    fireParticles.push({
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag,
      life,
      max: life,
      hue: sparkHue(hue),
      size: size * (0.55 + Math.random() * 0.7),
    });
  }
}

function skyScale() {
  if (!fireCanvas) return 1;
  return Math.min(fireCanvas.clientWidth, fireCanvas.clientHeight) / 520;
}

function ensureFireLoop() {
  if (fireRunning) return;
  fireRunning = true;
  fireLast = performance.now();
  fireFrame = requestAnimationFrame(tickFireworks);
}

function tickFireworks(now) {
  if (!fireRunning || !fireCtx) return;
  const dt = Math.min(0.033, (now - fireLast) / 1000 || 0.016);
  fireLast = now;
  const gravity = Number(fireGravity.value) * skyScale();

  for (let index = fireRockets.length - 1; index >= 0; index -= 1) {
    const rocket = fireRockets[index];
    const dx = rocket.tx - rocket.x;
    const dy = rocket.ty - rocket.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 12) {
      burstFirework(rocket.tx, rocket.ty, rocket.hue);
      fireRockets.splice(index, 1);
      continue;
    }
    const step = Math.min(distance, 980 * skyScale() * dt);
    rocket.x += (dx / distance) * step;
    rocket.y += (dy / distance) * step;
    fireParticles.push({
      x: rocket.x,
      y: rocket.y,
      vx: (Math.random() - 0.5) * 24,
      vy: 40 + Math.random() * 50,
      life: 0.32,
      max: 0.32,
      hue: sparkHue(rocket.hue),
      size: 2,
    });
  }

  for (let index = fireParticles.length - 1; index >= 0; index -= 1) {
    const particle = fireParticles[index];
    particle.vy += gravity * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    if (particle.life <= 0) fireParticles.splice(index, 1);
  }

  paintFireworks();
  if (fireRockets.length || fireParticles.length) fireFrame = requestAnimationFrame(tickFireworks);
  else fireRunning = false;
}

function paintFireworks() {
  if (!fireCtx || !fireCanvas) return;
  const width = fireCanvas.clientWidth;
  const height = fireCanvas.clientHeight;
  fireCtx.clearRect(0, 0, width, height);
  fireCtx.fillStyle = "#000";
  fireCtx.fillRect(0, 0, width, height);
  fireParticles.forEach((particle) => {
    const alpha = Math.max(0, particle.life / particle.max);
    fireCtx.beginPath();
    fireCtx.fillStyle = `hsla(${particle.hue}, 92%, 68%, ${alpha})`;
    fireCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    fireCtx.fill();
  });
  fireRockets.forEach((rocket) => {
    fireCtx.beginPath();
    fireCtx.fillStyle = `hsl(${rocket.hue}, 95%, 78%)`;
    fireCtx.arc(rocket.x, rocket.y, 3, 0, Math.PI * 2);
    fireCtx.fill();
  });
}

function startGifReel() {
  const image = document.createElement("img");
  image.className = "reel-gif";
  image.draggable = false;
  board.appendChild(image);
  showGif();
}

function showGif() {
  const image = board.querySelector(".reel-gif");
  if (!image) return;
  image.src = GIFS[gifIndex];
  image.alt = `Animation ${gifIndex + 1}`;
  gifCount.textContent = `${gifIndex + 1} / ${GIFS.length}`;
}

function stepGif(delta) {
  if (mode !== "animations2") return;
  gifIndex = (gifIndex + delta + GIFS.length) % GIFS.length;
  showGif();
}

function startAnimations() {
  ink = document.createElement("canvas");
  ink.className = "ink";
  ink.tabIndex = 0;
  ink.setAttribute("role", "button");
  ink.setAttribute("aria-label", "Grow a pattern");
  inkCtx = ink.getContext("2d");
  inkHint = document.createElement("p");
  inkHint.className = "anim-hint";
  inkHint.textContent = "Tap";
  board.appendChild(ink);
  board.appendChild(inkHint);
  ink.addEventListener("pointerdown", onAnimPointer);
  ink.addEventListener("click", onAnimPointer);
  ink.addEventListener("keydown", onAnimKey);
  window.addEventListener("resize", resizeAnimations);
  requestAnimationFrame(resizeAnimations);
}

function resizeAnimations() {
  if (!ink || !inkCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, ink.clientWidth);
  const height = Math.max(1, ink.clientHeight);
  ink.width = Math.floor(width * dpr);
  ink.height = Math.floor(height * dpr);
  inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintAnimations(performance.now());
}

function onAnimPointer(event) {
  if (event.button !== 0) return;
  if (event.type === "click" && performance.now() - lastPointerSpawn < 500) return;
  if (event.type === "pointerdown") lastPointerSpawn = performance.now();
  const rect = ink.getBoundingClientRect();
  const x = Number.isFinite(event.clientX) ? event.clientX - rect.left : ink.clientWidth / 2;
  const y = Number.isFinite(event.clientY) ? event.clientY - rect.top : ink.clientHeight / 2;
  spawnBloom(x, y);
}

function onAnimKey(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  spawnBloom(ink.clientWidth / 2, ink.clientHeight / 2);
}

function spawnBloom(x, y) {
  if (!ink) return;
  const width = ink.clientWidth;
  const height = ink.clientHeight;
  const room = Math.max(36, Math.min(x, y, width - x, height - y, Math.min(width, height) * 0.46));
  const kind = bloomSerial % 2 === 0 ? "burst" : "wreath";
  bloomSerial += 1;
  const bloom = {
    x,
    y,
    kind,
    seed: Math.random() * Math.PI * 2,
    born: performance.now(),
    life: 16000,
    strands: kind === "burst" ? burstStrands(room) : wreathStrands(room),
  };
  blooms.push(bloom);
  if (blooms.length > 4) {
    const oldest = blooms[0];
    oldest.life = Math.min(oldest.life, performance.now() - oldest.born + 1400);
  }
  if (inkHint) inkHint.hidden = true;
  if (!animating) {
    animating = true;
    animFrame = requestAnimationFrame(tickAnimations);
  }
}

function burstStrands(room) {
  const count = 210 + Math.floor(Math.random() * 40);
  return Array.from({ length: count }, (_, index) => {
    const spin = (index / count) * Math.PI * 2;
    const reach = Math.random();
    return {
      angle: spin + (Math.random() - 0.5) * 0.08,
      length: room * (0.18 + reach * reach * 0.82),
      amp: 1.5 + Math.random() * 5,
      freq: 2 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      curl: (Math.random() - 0.5) * 0.35,
      width: Math.random() < 0.08 ? 1.05 : 0.35 + Math.random() * 0.35,
      alpha: 0.22 + Math.random() * 0.45,
    };
  });
}

function wreathStrands(room) {
  const count = 46 + Math.floor(Math.random() * 10);
  const inner = room * 0.42;
  const direction = Math.random() < 0.5 ? 1 : -1;
  const turn = direction * (1.25 + Math.random() * 0.35);
  const hook = direction * (2.1 + Math.random() * 0.8);
  return Array.from({ length: count }, (_, index) => ({
    angle: (index / count) * Math.PI * 2,
    inner,
    reach: room * (0.34 + Math.random() * 0.16),
    hookReach: room * (0.08 + Math.random() * 0.08),
    turn: turn + direction * (Math.random() - 0.5) * 0.18,
    hook: hook + direction * (Math.random() - 0.5) * 0.35,
    phase: Math.random() * Math.PI * 2,
    width: 1 + Math.random() * 0.25,
  }));
}

function tickAnimations(now) {
  if (!animating) return;
  blooms = blooms.filter((bloom) => now - bloom.born < bloom.life);
  paintAnimations(now);
  if (blooms.length) animFrame = requestAnimationFrame(tickAnimations);
  else animating = false;
}

function paintAnimations(now) {
  if (!inkCtx || !ink) return;
  const width = ink.clientWidth;
  const height = ink.clientHeight;
  inkCtx.clearRect(0, 0, width, height);
  inkCtx.fillStyle = "#000";
  inkCtx.fillRect(0, 0, width, height);
  blooms.forEach((bloom) => drawBloom(bloom, now));
}

function bloomProgress(bloom, now) {
  const age = now - bloom.born;
  const grow = reducedMotion ? 1 : Math.min(1, age / 140);
  const appear = reducedMotion ? 1 : Math.min(1, age / 420);
  const fadeOut = age < 11000 ? 1 : Math.max(0, 1 - (age - 11000) / 2800);
  return {
    grow: easeOut(grow),
    fade: fadeOut * appear,
  };
}

function easeOut(value) {
  return 1 - (1 - value) ** 3;
}

function drawBloom(bloom, now) {
  const { grow, fade } = bloomProgress(bloom, now);
  if (fade <= 0 || grow <= 0) return;
  inkCtx.save();
  inkCtx.globalAlpha = fade;
  if (bloom.kind === "burst") drawBurst(bloom, now, grow, 1);
  else drawWreath(bloom, now, grow, 1);
  inkCtx.restore();
}

function drawBurst(bloom, now, grow, fade) {
  inkCtx.save();
  inkCtx.lineCap = "round";
  const core = Math.max(...bloom.strands.map((strand) => strand.length)) * 0.22;
  const glow = inkCtx.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, core);
  glow.addColorStop(0, `rgba(255,255,255,${0.55 * fade})`);
  glow.addColorStop(1, "rgba(255,255,255,0)");
  inkCtx.fillStyle = glow;
  inkCtx.beginPath();
  inkCtx.arc(bloom.x, bloom.y, core, 0, Math.PI * 2);
  inkCtx.fill();
  bloom.strands.forEach((strand) => {
    traceStrand(inkCtx, 40, grow, (step) => burstPoint(bloom, strand, step, now));
    inkCtx.strokeStyle = `rgba(255,255,255,${strand.alpha * fade})`;
    inkCtx.lineWidth = strand.width;
    inkCtx.stroke();
  });
  inkCtx.restore();
}

function drawWreath(bloom, now, grow, fade) {
  inkCtx.save();
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  bloom.strands.forEach((strand) => {
    traceStrand(inkCtx, 48, grow, (step) => wreathPoint(bloom, strand, step, now));
    inkCtx.strokeStyle = `rgba(255,255,255,${0.78 * fade})`;
    inkCtx.lineWidth = strand.width;
    inkCtx.stroke();
    if (grow > 0.82) {
      const [tipX, tipY] = wreathPoint(bloom, strand, grow, now);
      inkCtx.beginPath();
      inkCtx.arc(tipX, tipY, 1.7, 0, Math.PI * 2);
      inkCtx.fillStyle = `rgba(255,255,255,${0.9 * fade})`;
      inkCtx.fill();
    }
  });
  inkCtx.restore();
}

function traceStrand(context, steps, grow, pointAt) {
  const drawn = Math.max(2, Math.round(steps * grow));
  context.beginPath();
  for (let step = 0; step <= drawn; step += 1) {
    const [x, y] = pointAt(step / steps);
    if (step === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
}

function burstPoint(bloom, strand, step, now) {
  const sway = Math.sin(now / 1200 + strand.phase) * 1.4 * step;
  const wave = Math.sin(step * strand.freq + strand.phase) * strand.amp * step;
  const angle = strand.angle + strand.curl * step;
  const distance = strand.length * step ** 0.92;
  const offset = wave + sway;
  return [
    bloom.x + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * offset,
    bloom.y + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * offset,
  ];
}

function wreathPoint(bloom, strand, step, now) {
  const drift = Math.sin(now / 1600 + bloom.seed) * 0.06;
  const hookStart = 0.7;
  const hook = step > hookStart ? ((step - hookStart) / (1 - hookStart)) ** 2 * strand.hook : 0;
  const angle = strand.angle + drift + step * strand.turn + hook;
  const along = step < hookStart ? step / hookStart : 1;
  const extra = step > hookStart ? (step - hookStart) / (1 - hookStart) : 0;
  const distance = strand.inner + strand.reach * along + strand.hookReach * extra;
  const flutter = Math.sin(step * 2.2 + strand.phase) * 2.2 * step;
  return [
    bloom.x + Math.cos(angle) * distance + Math.cos(angle + Math.PI / 2) * flutter,
    bloom.y + Math.sin(angle) * distance + Math.sin(angle + Math.PI / 2) * flutter,
  ];
}

function playSuccess() {
  const ctx = getAudio();
  if (!ctx) return;

  [523, 659, 784].forEach((frequency, index) => {
    const now = ctx.currentTime + index * 0.12;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  });
}
