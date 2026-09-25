const TOTAL = 20;

const board = document.getElementById("board");
const hint = document.getElementById("hint");
const status = document.getElementById("status");

let nextNumber = 1;
let resetting = false;
let audioContext;

const tiles = Array.from({ length: TOTAL }, (_, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tile";
  button.setAttribute("aria-label", `Blank button ${index + 1}`);
  button.addEventListener("click", () => onTileClick(button));
  board.appendChild(button);
  return button;
});

function onTileClick(button) {
  if (resetting) return;

  if (button.dataset.value) {
    button.classList.remove("wiggle");
    void button.offsetWidth;
    button.classList.add("wiggle");
    return;
  }

  const value = nextNumber;
  nextNumber += 1;

  button.dataset.value = String(value);
  button.textContent = String(value);
  button.classList.add("revealed");
  button.setAttribute("aria-label", `Number ${value}`);
  playTone(value);

  if (value === TOTAL) {
    finish();
    return;
  }

  hint.textContent = "Tap another blank button.";
  status.textContent = `Next up is ${value + 1}`;
}

function finish() {
  resetting = true;
  board.classList.add("complete");
  hint.textContent = "Every number came out to play.";
  status.textContent = "All done!";
  status.classList.add("done");
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
  status.classList.remove("done");
  nextNumber = 1;
  hint.textContent = "Tap a button. The next number will peek out.";
  status.textContent = "Next up is 1";
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
