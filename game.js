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
];

const app = document.querySelector(".app");
const board = document.getElementById("board");
const modeSelect = document.getElementById("mode");
const colorsButton = document.getElementById("colors");
const addButton = document.getElementById("addCircle");
const circleCount = document.getElementById("circleCount");
const caseToggle = document.getElementById("caseToggle");
let drag = null;
let circleSize = 88;

let mode = "circles";
let uppercase = true;
let found = 0;
let resetting = false;
let tiles = [];
let audioContext;

buildBoard();

modeSelect.addEventListener("change", () => {
  mode = modeSelect.value;
  buildBoard();
});

colorsButton.addEventListener("click", randomizeColors);
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

const WHITE = PAINT_COLORS.find((color) => color.name === "white");

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
  resetting = false;
  found = 0;
  board.innerHTML = "";
  board.classList.remove("complete");
  const isCircles = mode === "circles";
  document.body.classList.toggle("circles", isCircles);
  board.classList.toggle("letters", mode === "abc");
  board.classList.toggle("paint", mode === "colors");
  board.classList.toggle("playground", isCircles);
  app.classList.toggle("free", isCircles);
  board.setAttribute(
    "aria-label",
    mode === "abc" ? "A to Z" : isCircles ? "Circles" : mode === "colors" ? "Colors" : `Count by ${mode}`,
  );
  caseToggle.classList.toggle("hidden", mode !== "abc");
  colorsButton.classList.toggle("hidden", isCircles || mode === "colors");
  addButton.classList.toggle("hidden", !isCircles);
  circleCount.classList.toggle("hidden", !isCircles);
  updateCircleCount();
  updateCaseButton();

  if (isCircles) {
    tiles = [];
    preparePlayground();
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
    if (mode === "colors") paintTile(button, WHITE);
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
      paintTile(button, WHITE);
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
