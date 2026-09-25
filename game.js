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

const COLORS = [
  { name: "green", tile: "#5cb86a", edge: "#449954", ink: "#3d4a38" },
  { name: "blue", tile: "#5a9fd4", edge: "#3f86b8", ink: "#3d4a54" },
  { name: "red", tile: "#e24b4b", edge: "#c43a3a", ink: "#4a3535" },
  { name: "yellow", tile: "#f0d56e", edge: "#d4b84e", ink: "#5a5148" },
  { name: "purple", tile: "#b07cc4", edge: "#9466a8", ink: "#4a3d50" },
  { name: "orange", tile: "#f0a05a", edge: "#d48640", ink: "#5a4538" },
  { name: "white", tile: "#f7f4ef", edge: "#d0cbc3", ink: "#3a3532" },
  { name: "black", tile: "#3a3532", edge: "#241f1d", ink: "#f3eee6" },
];

const board = document.getElementById("board");
const modeSelect = document.getElementById("mode");
const colorsButton = document.getElementById("colors");
const caseToggle = document.getElementById("caseToggle");

let mode = "1";
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

  const step = Number(selected);
  return Array.from({ length: 20 }, (_, index) => String((index + 1) * step));
}

function formatSymbol(raw) {
  if (mode !== "abc") return raw;
  return uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

function buildBoard() {
  resetting = false;
  found = 0;
  board.innerHTML = "";
  board.classList.remove("complete");
  board.classList.toggle("letters", mode === "abc");
  board.setAttribute("aria-label", mode === "abc" ? "A to Z" : `Count by ${mode}`);
  caseToggle.classList.toggle("hidden", mode !== "abc");
  updateCaseButton();

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
  });

  board.classList.remove("complete");
  found = 0;
  resetting = false;
}

function randomizeColors() {
  tiles.forEach((button) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
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
