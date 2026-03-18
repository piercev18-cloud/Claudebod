// CLAUDEBOD - Rest Timer
'use strict';

const Timer = (() => {
  let timerInterval = null;
  let timerEnd = null;
  let timerDuration = 0;
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playBeep(frequency = 880, duration = 0.15, type = 'sine') {
    try {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio not available
    }
  }

  function playDoneSound() {
    // Three ascending beeps
    setTimeout(() => playBeep(660, 0.1), 0);
    setTimeout(() => playBeep(880, 0.1), 120);
    setTimeout(() => playBeep(1100, 0.2), 240);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function updateBar() {
    const bar = document.getElementById('timer-bar');
    const label = document.getElementById('timer-label');
    const progress = document.getElementById('timer-progress');
    if (!bar) return;

    const now = Date.now();
    const remaining = Math.max(0, Math.round((timerEnd - now) / 1000));
    const elapsed = timerDuration - remaining;
    const pct = Math.min(100, (elapsed / timerDuration) * 100);

    label.textContent = remaining > 0 ? `REST ${formatTime(remaining)}` : 'REST COMPLETE';
    if (progress) progress.style.width = pct + '%';

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      playDoneSound();
      bar.classList.add('done');
      // Auto-hide after 4 seconds
      setTimeout(() => dismiss(), 4000);
    }
  }

  function start(seconds) {
    timerDuration = seconds;
    timerEnd = Date.now() + seconds * 1000;

    const bar = document.getElementById('timer-bar');
    if (bar) {
      bar.classList.remove('done', 'hidden');
      bar.classList.add('active');
    }

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateBar, 250);
    updateBar();
  }

  function dismiss() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    const bar = document.getElementById('timer-bar');
    if (bar) {
      bar.classList.remove('active', 'done');
      bar.classList.add('hidden');
    }
    timerEnd = null;
  }

  function isActive() {
    return timerEnd !== null && Date.now() < timerEnd;
  }

  return { start, dismiss, isActive, playBeep };
})();
