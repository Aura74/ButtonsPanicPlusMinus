let countdownTime = 0;
let countdownInterval;
let increaseCounter = 0;
const clockElement = document.getElementById("clock");
const activateButton = document.querySelector(".buttonDownAC");
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function updateDisplay() {
  const minutes = String(Math.floor(countdownTime / 60)).padStart(2, "0");
  const seconds = String(countdownTime % 60).padStart(2, "0");
  clockElement.textContent = `${minutes}:${seconds}`;
}

function increaseTime() {
  increaseCounter += 1;
  if (increaseCounter <= 3) {
    countdownTime += 5; // Första tre gångerna ökar med 5 sekunder
  } else if (increaseCounter <= 6) {
    countdownTime += 15; // Fjärde till sjätte gången ökar med 15 sekunder
  } else if (countdownTime < 180) {
    countdownTime += 30; // Därefter ökar med 30 sekunder tills man når 3 minuter
  } else {
    countdownTime += 60; // Efter 3 minuter ökar med 1 minut
  }
  updateDisplay();
}

function decreaseTime() {
  if (countdownTime >= 60) {
    countdownTime -= 60;
  } else if (countdownTime >= 30 && increaseCounter > 6) {
    countdownTime -= 30;
  } else if (
    countdownTime >= 15 &&
    increaseCounter <= 6 &&
    increaseCounter > 3
  ) {
    countdownTime -= 15;
  } else if (countdownTime >= 5 && increaseCounter <= 3) {
    countdownTime -= 5;
  }
  updateDisplay();
}

function startCountdown() {
  if (countdownTime === 0) {
    triggerAlarm();
    return;
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  activateButton.textContent = "AVAKTIVERA LARM";

  countdownInterval = setInterval(() => {
    if (countdownTime > 0) {
      countdownTime -= 1;
      updateDisplay();
    } else {
      triggerAlarm();
    }
  }, 1000);
}

function triggerAlarm() {
  clearInterval(countdownInterval);
  clockElement.classList.add("blink");
  activateButton.classList.add("blink");
  activateButton.textContent = "AVAKTIVERA LARM";
  playRepeatedBeep(); // Spela upp pip-ljud tre gånger per sekund
}

function stopAlarm() {
  clearInterval(countdownInterval);
  countdownTime = 0;
  increaseCounter = 0; // Återställ räknaren
  updateDisplay();
  clockElement.classList.remove("blink");
  activateButton.classList.remove("blink");
  activateButton.textContent = "Activate";
}

function playBeep() {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // 440 Hz är tonen A4
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(
    0.00001,
    audioContext.currentTime + 0.1
  ); // Kortare tid för snabbare pip
  oscillator.stop(audioContext.currentTime + 0.1); // Kortare tid för snabbare pip
}

function playRepeatedBeep() {
  let beepCount = 0;
  const beepInterval = setInterval(() => {
    playBeep();
    beepCount += 1;
    if (beepCount >= 3) {
      clearInterval(beepInterval);
    }
  }, 333); // 3 gånger per sekund (1000ms / 3 ≈ 333ms)
}

activateButton.addEventListener("click", () => {
  if (activateButton.classList.contains("blink")) {
    stopAlarm();
  } else {
    startCountdown();
  }
});

document
  .querySelector(".buttonDownRight")
  .addEventListener("click", increaseTime);
document
  .querySelector(".buttonDownleft")
  .addEventListener("click", decreaseTime);

updateDisplay();
