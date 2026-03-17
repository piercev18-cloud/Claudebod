// CLAUDEBOD - Main App
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = 'today';
let activeExerciseId = null;
let deferredInstallPrompt = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await Store.open();
  await Session.loadSessionForDate(Session.getTodayDateString());
  renderApp();
  setupNav();
  setupInstallPrompt();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
});

// ── Install Prompt ────────────────────────────────────────────────────────────
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('install-btn');
    if (btn) btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const btn = document.getElementById('install-btn');
    if (btn) btn.classList.add('hidden');
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
function setupNav() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;
  activeExerciseId = null;
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderApp();
}

// ── Main Render ───────────────────────────────────────────────────────────────
function renderApp() {
  const main = document.getElementById('main-content');
  if (!main) return;

  if (currentTab === 'today') {
    renderToday(main);
  } else if (currentTab === 'history') {
    renderHistory(main);
  } else if (currentTab === 'progress') {
    renderProgress(main);
  }
}

// ── TODAY TAB ─────────────────────────────────────────────────────────────────
function renderToday(container) {
  const { day } = getTodayDay();
  const accent = day.accent;

  let html = `<div class="today-header" style="--accent:${accent}">`;
  html += `<div class="today-day">${day.name.toUpperCase()}</div>`;

  if (day.type === 'rest') {
    html += `<div class="today-label rest-label">REST DAY</div></div>`;
    html += `<div class="rest-day-content">`;
    html += `<div class="rest-icon">💤</div>`;
    html += `<p class="rest-msg">Recovery is part of training.</p>`;
    html += renderNutritionCard();
    html += renderBodyweightCard();
    html += `</div>`;
    container.innerHTML = html;
    attachBWEvents();
    return;
  }

  html += `<div class="today-label">${day.label}</div></div>`;
  html += renderNutritionCard();
  html += renderBodyweightCard();

  if (activeExerciseId) {
    html += `<div id="exercise-detail-container"></div>`;
    container.innerHTML = html;
    attachBWEvents();
    loadAndRenderExerciseDetail(activeExerciseId, day);
  } else {
    html += `<div class="exercise-list">`;
    for (const ex of day.exercises) {
      html += renderExerciseCard(ex, accent);
    }
    html += `</div>`;
    container.innerHTML = html;
    attachBWEvents();
    attachExerciseCardEvents();
  }
}

function renderNutritionCard() {
  const { calories, protein, carbs, fatMin, fatMax } = PROGRAM.nutrition;
  return `
    <div class="nutrition-card">
      <div class="card-label">DAILY TARGETS</div>
      <div class="nutrition-grid">
        <div class="nut-item"><span class="nut-val">${calories}</span><span class="nut-key">CAL</span></div>
        <div class="nut-item"><span class="nut-val">${protein}g</span><span class="nut-key">PROTEIN</span></div>
        <div class="nut-item"><span class="nut-val">${carbs}g</span><span class="nut-key">CARBS</span></div>
        <div class="nut-item"><span class="nut-val">${fatMin}–${fatMax}g</span><span class="nut-key">FAT</span></div>
      </div>
    </div>`;
}

function renderBodyweightCard() {
  return `
    <div class="bw-card">
      <div class="bw-log-row">
        <div class="card-label">BODYWEIGHT</div>
        <div class="bw-input-row">
          <input type="number" id="bw-input" placeholder="lbs" step="0.1" min="50" max="400" class="bw-input" inputmode="decimal">
          <button class="bw-save-btn" id="bw-save-btn">LOG</button>
        </div>
      </div>
      <div id="bw-history"></div>
    </div>`;
}

function renderExerciseCard(ex, accent) {
  const counts = Session.getCompletionCount(ex.id);
  const allDone = counts.total > 0 && counts.done === counts.total;
  const [minR, maxR] = ex.repRange;
  const repStr = minR === maxR ? `${minR}` : `${minR}–${maxR}`;

  return `
    <div class="exercise-card${allDone ? ' all-done' : ''}" data-exercise-id="${ex.id}" style="--accent:${accent}">
      <div class="ex-card-left">
        <div class="ex-name">${ex.name}</div>
        <div class="ex-meta">${ex.sets} × ${repStr} reps</div>
      </div>
      <div class="ex-card-right">
        <div class="ex-progress${allDone ? ' done' : ''}">${counts.done}/${counts.total}</div>
        <div class="ex-chevron">›</div>
      </div>
    </div>`;
}

async function loadAndRenderExerciseDetail(exerciseId, day) {
  const container = document.getElementById('exercise-detail-container');
  if (!container) return;

  const ex = day.exercises.find(e => e.id === exerciseId);
  if (!ex) return;

  const accent = day.accent;
  const sets = await Session.getSetsForExercise(ex, Session.currentDate);
  const recWeight = await Session.getRecommendedWeight(ex);
  const [minR, maxR] = ex.repRange;
  const repStr = minR === maxR ? `${minR}` : `${minR}–${maxR}`;

  let html = `
    <div class="ex-detail" style="--accent:${accent}">
      <button class="back-btn" id="back-to-list">‹ BACK</button>
      <div class="ex-detail-header">
        <h2 class="ex-detail-name">${ex.name}</h2>
        <div class="ex-detail-meta">${ex.sets} sets · ${repStr} reps</div>
      </div>
      <div class="rec-weight-banner">
        <span class="rec-label">RECOMMENDED</span>
        <span class="rec-value">${recWeight} lb</span>
      </div>
      <div class="sets-container">`;

  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const rpeLabel = (set.reps != null) ? Session.getRPELabel(set.reps, ex.repRange) : '';
    const rpeClass = (set.reps != null) ? Session.getRPEClass(set.reps, ex.repRange) : '';
    const w = set.weight != null ? set.weight : recWeight;
    const r = set.reps != null ? set.reps : '';

    html += `
      <div class="set-row${set.done ? ' set-done' : ''}" data-set-index="${i}">
        <div class="set-num">S${i + 1}</div>
        <div class="set-inputs">
          <input type="number" class="set-weight" data-index="${i}"
            value="${w}" placeholder="lb" step="5" min="0" inputmode="decimal"${set.done ? ' disabled' : ''}>
          <span class="set-unit">lb</span>
          <input type="number" class="set-reps" data-index="${i}"
            value="${r}" placeholder="${repStr}" min="0" max="99" inputmode="numeric"${set.done ? ' disabled' : ''}>
          <span class="set-unit">reps</span>
          <span class="rpe-badge ${rpeClass}" data-index="${i}">${rpeLabel}</span>
        </div>
        <button class="set-done-btn${set.done ? ' completed' : ''}"
          data-index="${i}" data-exercise="${exerciseId}" data-type="${ex.type}">✓</button>
      </div>`;
  }

  html += `</div></div>`;
  container.innerHTML = html;

  // Back button
  document.getElementById('back-to-list').addEventListener('click', () => {
    activeExerciseId = null;
    renderApp();
  });

  // Weight change
  container.querySelectorAll('.set-weight').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      await Session.updateSet(exerciseId, idx, 'weight', parseFloat(e.target.value) || 0);
    });
  });

  // Reps input → RPE badge
  container.querySelectorAll('.set-reps').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      const reps = parseInt(e.target.value);
      await Session.updateSet(exerciseId, idx, 'reps', isNaN(reps) ? null : reps);

      const badge = container.querySelector(`.rpe-badge[data-index="${idx}"]`);
      if (badge) {
        const label = isNaN(reps) ? '' : Session.getRPELabel(reps, ex.repRange);
        const cls = isNaN(reps) ? '' : Session.getRPEClass(reps, ex.repRange);
        badge.textContent = label;
        badge.className = `rpe-badge ${cls}`;
      }
    });
  });

  // Set done button
  container.querySelectorAll('.set-done-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      const exType = e.target.dataset.type;
      const setRow = container.querySelector(`.set-row[data-set-index="${idx}"]`);
      const isDone = sets[idx].done;

      if (isDone) {
        await Session.uncompleteSet(exerciseId, idx);
        sets[idx].done = false;
        setRow.classList.remove('set-done');
        btn.classList.remove('completed');
        setRow.querySelector('.set-weight').disabled = false;
        setRow.querySelector('.set-reps').disabled = false;
      } else {
        const weightInput = setRow.querySelector('.set-weight');
        const repsInput = setRow.querySelector('.set-reps');
        const weight = parseFloat(weightInput.value) || 0;
        const reps = parseInt(repsInput.value) || 0;
        await Session.updateSet(exerciseId, idx, 'weight', weight);
        await Session.updateSet(exerciseId, idx, 'reps', reps);
        await Session.completeSet(exerciseId, idx);
        sets[idx].done = true;
        sets[idx].weight = weight;
        sets[idx].reps = reps;
        setRow.classList.add('set-done');
        btn.classList.add('completed');
        weightInput.disabled = true;
        repsInput.disabled = true;

        // Fire rest timer
        const restSecs = PROGRAM.restTime[exType] || 90;
        Timer.start(restSecs);
      }
    });
  });
}

// ── Bodyweight Events ─────────────────────────────────────────────────────────
function attachBWEvents() {
  loadBodyweightHistory();

  const bwSave = document.getElementById('bw-save-btn');
  if (bwSave) {
    bwSave.addEventListener('click', async () => {
      const input = document.getElementById('bw-input');
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) {
        await Store.saveBodyweight(Session.getTodayDateString(), val);
        input.value = '';
        loadBodyweightHistory();
      }
    });
  }

  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      }
    });
  }

  const timerBar = document.getElementById('timer-bar');
  if (timerBar) {
    timerBar.addEventListener('click', () => Timer.dismiss());
  }
}

function attachExerciseCardEvents() {
  document.querySelectorAll('.exercise-card').forEach(card => {
    card.addEventListener('click', () => {
      activeExerciseId = card.dataset.exerciseId;
      renderApp();
    });
  });
}

async function loadBodyweightHistory() {
  const entries = await Store.getBodyweightEntries(30);
  const histContainer = document.getElementById('bw-history');
  if (!histContainer) return;

  if (entries.length === 0) {
    histContainer.innerHTML = '<div class="bw-empty">No entries yet</div>';
    return;
  }

  const first = entries[entries.length - 1];
  const latest = entries[0];
  const delta = latest.weight - first.weight;
  const sign = delta >= 0 ? '+' : '';
  const deltaStr = `${sign}${delta.toFixed(1)}`;

  let html = `<div class="bw-delta">Change: <span class="${delta < 0 ? 'bw-down' : 'bw-up'}">${deltaStr} lb</span> over ${entries.length} entries</div>`;
  html += `<div class="bw-list">`;
  for (const e of entries.slice(0, 10)) {
    html += `<div class="bw-entry"><span class="bw-date">${formatDate(e.date)}</span><span class="bw-val">${e.weight} lb</span></div>`;
  }
  html += `</div>`;
  histContainer.innerHTML = html;
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────────
async function renderHistory(container) {
  const grouped = await Store.getAllSessionsByDate();
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  let html = `<div class="tab-header"><h1 class="tab-title">HISTORY</h1></div>`;

  if (dates.length === 0) {
    html += `<div class="empty-state">No sessions logged yet.<br>Complete your first workout!</div>`;
    container.innerHTML = html;
    return;
  }

  html += `<div class="history-list">`;
  for (const date of dates) {
    const sessions = grouped[date];
    const dow = new Date(date + 'T12:00:00').getDay();
    const day = PROGRAM.days[dow];
    const accent = day ? day.accent : '#888';

    // Check if any done sets exist
    const hasDone = sessions.some(s => s.sets && s.sets.some(set => set.done));
    if (!hasDone) continue;

    html += `<div class="history-day" style="--accent:${accent}">`;
    html += `<div class="history-day-header">`;
    html += `<span class="history-date">${formatDate(date)}</span>`;
    html += `<span class="history-day-name">${day ? day.label || day.name.toUpperCase() : ''}</span>`;
    html += `</div>`;

    for (const session of sessions) {
      const ex = getExerciseById(session.exerciseId);
      if (!ex) continue;
      const doneSets = (session.sets || []).filter(s => s.done);
      if (doneSets.length === 0) continue;

      html += `<div class="history-exercise">`;
      html += `<div class="history-ex-name">${ex.name}</div>`;
      html += `<div class="history-sets">`;
      for (const set of doneSets) {
        html += `<span class="history-set">${set.weight}×${set.reps}</span>`;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
  }
  html += `</div>`;
  container.innerHTML = html;
}

// ── PROGRESS TAB ──────────────────────────────────────────────────────────────
async function renderProgress(container) {
  let html = `<div class="tab-header"><h1 class="tab-title">PROGRESS</h1></div>`;

  html += `<div class="section-label">PERSONAL RECORDS</div>`;
  html += `<div class="pr-grid">`;
  for (const lift of PROGRAM.keyLifts) {
    const best = await Store.getBestWeightForExercise(lift.id);
    html += `<div class="pr-card">
      <div class="pr-name">${lift.name}</div>
      <div class="pr-val">${best > 0 ? best + ' lb' : '—'}</div>
    </div>`;
  }
  html += `</div>`;

  html += `<div class="section-label">BODYWEIGHT TREND</div>`;
  const bwEntries = await Store.getBodyweightEntries(30);

  if (bwEntries.length >= 2) {
    html += renderBWChart(bwEntries);
    const first = bwEntries[bwEntries.length - 1];
    const latest = bwEntries[0];
    const delta = latest.weight - first.weight;
    const sign = delta >= 0 ? '+' : '';
    html += `<div class="bw-summary">
      <span>Start: <strong>${first.weight} lb</strong></span>
      <span>Now: <strong>${latest.weight} lb</strong></span>
      <span class="${delta < 0 ? 'bw-down' : 'bw-up'}">Δ <strong>${sign}${delta.toFixed(1)} lb</strong></span>
    </div>`;
  } else if (bwEntries.length === 1) {
    html += `<div class="empty-state" style="padding:20px 16px">Current: <strong>${bwEntries[0].weight} lb</strong><br><small>Log more entries to see trend</small></div>`;
  } else {
    html += `<div class="empty-state">No bodyweight entries yet.</div>`;
  }

  container.innerHTML = html;
}

function renderBWChart(entries) {
  const reversed = [...entries].reverse();
  const weights = reversed.map(e => e.weight);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;
  const range = maxW - minW || 1;
  const W = 320, H = 120;
  const pad = { l: 36, r: 10, t: 10, b: 20 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;
  const n = reversed.length;

  const pts = reversed.map((e, i) => {
    const x = pad.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
    const y = pad.t + cH - ((e.weight - minW) / range) * cH;
    return { x: x.toFixed(1), y: y.toFixed(1) };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const fillPath = `M${pts[0].x},${pts[0].y} ` +
    pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length-1].x},${(pad.t + cH).toFixed(1)} L${pts[0].x},${(pad.t + cH).toFixed(1)} Z`;

  const circles = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--accent-today,#C8F55A)"/>`).join('');

  return `
    <div class="chart-container">
      <svg viewBox="0 0 ${W} ${H}" class="bw-chart">
        <defs>
          <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent-today,#C8F55A)" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="var(--accent-today,#C8F55A)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${fillPath}" fill="url(#bwGrad)"/>
        <polyline points="${polyline}" fill="none" stroke="var(--accent-today,#C8F55A)" stroke-width="2" stroke-linejoin="round"/>
        ${circles}
        <text x="${pad.l - 4}" y="${(pad.t + 4).toFixed(1)}" text-anchor="end" class="chart-label">${Math.round(maxW)}</text>
        <text x="${pad.l - 4}" y="${(pad.t + cH + 4).toFixed(1)}" text-anchor="end" class="chart-label">${Math.round(minW)}</text>
      </svg>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
