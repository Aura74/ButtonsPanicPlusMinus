/* ==========================================================================
   Crystal Alarm — App Logic
   ========================================================================== */

// ---- DOM refs ----
const clock = document.getElementById("clock");
const statusClock = document.getElementById("statusClock");
const timerDisplay = document.getElementById("timerDisplay");
const increaseBtn = document.getElementById("increaseBtn");
const decreaseBtn = document.getElementById("decreaseBtn");
const activateBtn = document.getElementById("activateBtn");
const activateLabel = activateBtn.querySelector(".activate-btn__label");
const activateIcon = activateBtn.querySelector(".activate-btn__icon");
const settingsBtn = document.getElementById("settingsBtn");
const settingsOverlay = document.getElementById("settingsOverlay");
const settingsBackBtn = document.getElementById("settingsBackBtn");
const volumeSlider = document.getElementById("volumeSlider");
const alarmSoundSelect = document.getElementById("alarmSound");
const vibrateToggle = document.getElementById("vibrateToggle");

// ---- State ----
let timerSeconds = 0;
let countdownInterval = null;
let alarmInterval = null;
let isCountingDown = false;
let isAlarming = false;
let audioCtx = null;

// ---- AudioContext (lazy, avoids browser autoplay block) ----
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// ---- Status-bar clock ----
function updateStatusClock() {
  const now = new Date();
  statusClock.textContent =
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
}
updateStatusClock();
setInterval(updateStatusClock, 10000);

// ---- Timer display ----
function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const s = String(timerSeconds % 60).padStart(2, "0");
  clock.textContent = m + ":" + s;
  updateButtonState();
}

// ---- Button state based on timer ----
function updateButtonState() {
  if (isCountingDown || isAlarming) return;

  decreaseBtn.disabled = timerSeconds === 0;

  if (timerSeconds === 0) {
    activateLabel.textContent = "Larma";
    activateIcon.textContent = "crisis_alert";
  } else {
    activateLabel.textContent = "Aktivera";
    activateIcon.textContent = "alarm";
  }
}

// ---- Increase / Decrease ----
function increaseTime() {
  if (isCountingDown || isAlarming) return;

  if (timerSeconds < 15) timerSeconds += 5;
  else if (timerSeconds < 60) timerSeconds += 15;
  else if (timerSeconds < 180) timerSeconds += 30;
  else timerSeconds += 60;

  if (timerSeconds > 3599) timerSeconds = 3599; // max 59:59
  updateTimerDisplay();
}

function decreaseTime() {
  if (isCountingDown || isAlarming) return;

  if (timerSeconds > 180) timerSeconds -= 60;
  else if (timerSeconds > 60) timerSeconds -= 30;
  else if (timerSeconds > 15) timerSeconds -= 15;
  else if (timerSeconds > 0) timerSeconds -= 5;

  if (timerSeconds < 0) timerSeconds = 0;
  updateTimerDisplay();
}

// ---- Activate handler ----
function handleActivate() {
  getAudioCtx(); // unlock audio

  if (isAlarming) {
    stopAlarm();
    return;
  }
  if (isCountingDown) {
    stopCountdown();
    return;
  }
  if (timerSeconds === 0) {
    triggerAlarm();
  } else {
    startCountdown();
  }
}

// ---- Countdown ----
function startCountdown() {
  isCountingDown = true;
  activateBtn.classList.add("activate-btn--active");
  activateLabel.textContent = "Avbryt";
  activateIcon.textContent = "alarm_off";
  timerDisplay.classList.add("timer--active");
  setControlsDisabled(true);

  countdownInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      isCountingDown = false;
      timerDisplay.classList.remove("timer--active");
      triggerAlarm();
    }
  }, 1000);
}

function stopCountdown() {
  clearInterval(countdownInterval);
  countdownInterval = null;
  isCountingDown = false;
  timerSeconds = 0;
  updateTimerDisplay();
  timerDisplay.classList.remove("timer--active");
  resetUI();
}

// ---- Alarm ----
function triggerAlarm() {
  isAlarming = true;
  timerSeconds = 0;
  updateTimerDisplay();

  activateBtn.classList.remove("activate-btn--active");
  activateBtn.classList.add("activate-btn--alarming");
  activateLabel.textContent = "Stoppa larm";
  activateIcon.textContent = "alarm_off";
  timerDisplay.classList.add("timer--alarming");
  setControlsDisabled(true);

  playAlarmLoop();

  if (vibrateToggle.checked && navigator.vibrate) {
    navigator.vibrate([300, 100, 300, 100, 300, 200, 300, 100, 300, 100, 300]);
  }
}

function stopAlarm() {
  isAlarming = false;

  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (navigator.vibrate) navigator.vibrate(0);

  activateBtn.classList.remove("activate-btn--alarming");
  timerDisplay.classList.remove("timer--alarming");
  resetUI();
}

function resetUI() {
  activateBtn.classList.remove("activate-btn--active", "activate-btn--alarming");
  setControlsDisabled(false);
  updateButtonState();
}

function setControlsDisabled(disabled) {
  increaseBtn.disabled = disabled;
  decreaseBtn.disabled = disabled;
}

// ---- Sound engine ----
function playAlarmLoop() {
  const soundType = alarmSoundSelect.value;
  const volume = volumeSlider.value / 100;

  playPattern(soundType, volume);
  alarmInterval = setInterval(() => {
    if (isAlarming) {
      playPattern(soundType, volume);
    } else {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  }, 1400);
}

function playPattern(type, vol) {
  const ctx = getAudioCtx();
  const t = ctx.currentTime;

  switch (type) {
    case "beep":
      scheduleBeep(ctx, t, vol);
      break;
    case "siren":
      scheduleSiren(ctx, t, vol);
      break;
    case "bell":
      scheduleBell(ctx, t, vol);
      break;
  }
}

function scheduleBeep(ctx, t, vol) {
  for (let i = 0; i < 3; i++) {
    const start = t + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(vol * 0.25, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
    osc.start(start);
    osc.stop(start + 0.16);
  }
}

function scheduleSiren(ctx, t, vol) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sawtooth";
  gain.gain.setValueAtTime(vol * 0.18, t);
  osc.frequency.setValueAtTime(600, t);
  osc.frequency.linearRampToValueAtTime(1200, t + 0.5);
  osc.frequency.linearRampToValueAtTime(600, t + 1);
  gain.gain.setValueAtTime(vol * 0.18, t + 1);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc.start(t);
  osc.stop(t + 1.25);
}

function scheduleBell(ctx, t, vol) {
  for (let i = 0; i < 2; i++) {
    const start = t + i * 0.5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 1047;
    gain.gain.setValueAtTime(vol * 0.3, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
    osc.start(start);
    osc.stop(start + 0.42);
  }
}

// ---- Dark mode ----
const darkModeToggle = document.getElementById("darkModeToggle");
const phoneScreen = document.querySelector(".phone__screen");

function applyTheme(dark) {
  phoneScreen.classList.toggle("phone__screen--dark", dark);
  localStorage.setItem("darkMode", dark ? "1" : "0");

  // Update body bg + theme-color for mobile fullscreen mode
  document.body.style.backgroundColor = dark ? "#1c1b1f" : "#f4efe9";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? "#1c1b1f" : "#f4efe9";
}

darkModeToggle.addEventListener("change", () => {
  applyTheme(darkModeToggle.checked);
});

// Restore saved preference
if (localStorage.getItem("darkMode") === "1") {
  darkModeToggle.checked = true;
  applyTheme(true);
}

// ---- Settings ----
settingsBtn.addEventListener("click", () => {
  settingsOverlay.classList.add("settings--open");
});

settingsBackBtn.addEventListener("click", () => {
  settingsOverlay.classList.remove("settings--open");
});

// ---- Event listeners ----
increaseBtn.addEventListener("click", increaseTime);
decreaseBtn.addEventListener("click", decreaseTime);
activateBtn.addEventListener("click", handleActivate);

// ---- Init ----
updateTimerDisplay();
decreaseBtn.disabled = true;
