// script.js - Breathflow 1:2:4 ratio, hold/exhale shown read-only, session timer with end sound

// DOM references
const inhaleInput = document.getElementById("inhaleInput");
const holdDisplay = document.getElementById("holdDisplay");
const exhaleDisplay = document.getElementById("exhaleDisplay");
const sessionInput = document.getElementById("sessionInput");
const soundSelect = document.getElementById("soundSelect");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");

const spinnerEl = document.getElementById("spinner");
const timerEl = document.getElementById("timer");
const phaseEl = document.getElementById("phase");
const endMsg = document.getElementById("endMessage");
const endSound = document.getElementById("endSound");

// state
let inhaleTime = 4;
let holdTime = 8;   // 2 * inhale
let exhaleTime = 16; // 4 * inhale

let phase = "ready"; // inhale, hold, exhale, ready, complete
let phaseRemaining = 0;

let phaseInterval = null;   // runs every second for phase countdown
let sessionTimeout = null;  // ends whole session
let sessionEndTimestamp = null;

let isPaused = false;

// initialize computed displays (read-only)
function updateRatioDisplays() {
  inhaleTime = parseInt(inhaleInput.value) || 1;
  if (inhaleTime < 1) inhaleTime = 1;
  holdTime = inhaleTime * 2;
  exhaleTime = inhaleTime * 4;

  holdDisplay.value = holdTime;
  exhaleDisplay.value = exhaleTime;
}
updateRatioDisplays();

// update when user changes inhale
inhaleInput.addEventListener("input", () => {
  updateRatioDisplays();
});

// utility to reset spinner animation
function resetSpinner() {
  spinnerEl.style.animation = "none";
  // force reflow to allow re-applying animation
  // eslint-disable-next-line no-unused-expressions
  spinnerEl.offsetHeight;
}

// start a phase with given name and duration (seconds)
function startPhase(newPhase, seconds) {
  phase = newPhase;
  phaseRemaining = seconds;
  phaseEl.textContent = newPhase.toUpperCase();
  timerEl.textContent = phaseRemaining;

  resetSpinner();

  if (newPhase === "inhale" || newPhase === "exhale") {
    // rotate one full turn in the phase duration
    spinnerEl.style.animation = `spinOnce ${seconds}s linear forwards`;
  } else {
    // hold: stop at top (0deg)
    spinnerEl.style.transform = "rotate(0deg)";
  }
}

// phase countdown tick
function phaseTick() {
  if (isPaused) return;
  timerEl.textContent = phaseRemaining;
  phaseRemaining--;

  if (phaseRemaining < 0) {
    // move to next phase
    if (phase === "inhale") startPhase("hold", holdTime);
    else if (phase === "hold") startPhase("exhale", exhaleTime);
    else if (phase === "exhale") startPhase("inhale", inhaleTime);
  }
}

// Start full session
function startSession() {
  // clear prior timers
  clearInterval(phaseInterval);
  clearTimeout(sessionTimeout);
  endMsg.textContent = "";

  updateRatioDisplays(); // ensure latest inhale applied

  // Set audio src from selection
  endSound.src = soundSelect.value;

  // compute session end timestamp
  const minutes = parseInt(sessionInput.value) || 1;
  const totalMs = minutes * 60 * 1000; // convert to ms
  sessionEndTimestamp = Date.now() + totalMs;

  // start first phase
  startPhase("inhale", inhaleTime);

  // start per-second phase countdown
  phaseInterval = setInterval(phaseTick, 1000);

  // schedule session end
  sessionTimeout = setTimeout(endSession, totalMs);

  // update buttons
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
  isPaused = false;
}

// Pause / Resume
function togglePause() {
  if (!phaseInterval) return;
  if (isPaused) {
    // resume
    isPaused = false;
    pauseBtn.textContent = "Pause";
    // fix sessionTimeout to remaining time
    const remainingMs = sessionEndTimestamp - Date.now();
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(endSession, Math.max(0, remainingMs));
  } else {
    // pause
    isPaused = true;
    pauseBtn.textContent = "Resume";
    // freeze session end
    const remainingMs = sessionEndTimestamp - Date.now();
    clearTimeout(sessionTimeout);
    // store remaining time by adjusting timestamp forward until resumed
    sessionEndTimestamp = Date.now() + Math.max(0, remainingMs);
  }
}

// Stop session
function stopSession() {
  clearInterval(phaseInterval);
  clearTimeout(sessionTimeout);
  phaseInterval = null;
  sessionTimeout = null;
  phase = "ready";
  phaseRemaining = 0;
  spinnerEl.style.animation = "none";
  spinnerEl.style.transform = "rotate(0deg)";
  phaseEl.textContent = "Ready";
  timerEl.textContent = "0";
  endMsg.textContent = "Session stopped.";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = "Pause";
  stopBtn.disabled = true;
  isPaused = false;
}

// End of session handler
function endSession() {
  clearInterval(phaseInterval);
  phaseInterval = null;
  phase = "complete";
  phaseEl.textContent = "Complete";
  timerEl.textContent = "🌸";
  spinnerEl.style.animation = "none";
  endMsg.textContent = "Session complete — well done.";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
  isPaused = false;

  // play end sound (may be blocked until user interacted with page - user must click Start)
  try { endSound.currentTime = 0; endSound.play(); }
  catch (e) { /* may be blocked by autoplay policy */ }
}

// Wire buttons
startBtn.addEventListener("click", startSession);
pauseBtn.addEventListener("click", togglePause);
stopBtn.addEventListener("click", stopSession);

// Accessibility: allow Enter key on inputs to start
[inhaleInput, sessionInput, soundSelect].forEach(el => {
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") startSession();
  });
});
