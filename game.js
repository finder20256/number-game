const TOTAL = 20;

const board = document.getElementById("board");

let found = 0;
let resetting = false;
let audioContext;

const tiles = Array.from({ length: TOTAL }, (_, index) => {
  const button = document.createElement("button");
  const number = index + 1;
  button.type = "button";
  button.className = "tile";
  button.dataset.number = String(number);
  button.setAttribute("aria-label", `Blank button ${number}`);
  button.addEventListener("click", () => onTileClick(button));
  board.appendChild(button);
  return button;
});

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

  const value = Number(button.dataset.number);
  found += 1;
  button.dataset.value = String(value);
  button.textContent = String(value);
  button.classList.add("revealed");
  button.setAttribute("aria-label", `Number ${value}`);
  playTone(value);

  if (found === TOTAL) {
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
