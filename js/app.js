// CLAUDEBOD - Main App v2
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = 'today';
let activeExerciseId = null;
let swapModalOpen = false;
let deferredInstallPrompt = null;

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await Store.open();
  await Session.loadSessionForDate(Session.getTodayString());
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
  if      (currentTab === 'today')    renderToday(main);
  else if (currentTab === 'history')  renderHistory(main);
  else if (currentTab === 'progress') renderProgress(main);
}

// ── TODAY TAB ─────────────────────────────────────────────────────────────────
function renderToday(container) {
  const { day } = getTodayDay();
  const accent   = day.accent;
  const phaseInfo = Session.getCurrentPhaseInfo();

  let html = buildTodayHeader(day, accent, phaseInfo);

  if (day.type === 'rest') {
    html += buildRestDay();
    container.innerHTML = html;
    attachBWEvents();
    return;
  }

  html += renderNutritionCard();
  html += renderBodyweightCard();

  if (activeExerciseId) {
    html += `<div id="exercise-detail-container"></div>`;
    container.innerHTML = html;
    attachBWEvents();
    loadAndRenderExerciseDetail(activeExerciseId, day);
  } else {
    html += buildWarmupSection(day);
    html += `<div class="section-divider">EXERCISES</div>`;
    html += `<div class="exercise-list">`;
    for (const ex of day.exercises) {
      html += renderExerciseCard(ex, accent);
    }
    html += `</div>`;
    html += buildCoreSection(day);
    html += buildCooldownSection(day);
    container.innerHTML = html;
    attachBWEvents();
    attachExerciseCardEvents();
    attachAccordionEvents();
  }
}

function buildTodayHeader(day, accent, phaseInfo) {
  let mesoHtml = '';
  if (phaseInfo) {
    const { meso, phase, weekInPhase, phaseWeeks, weekNumber } = phaseInfo;
    mesoHtml = `
      <div class="meso-banner" id="meso-banner">
        <div class="meso-info">
          <span class="meso-label">${meso.name.toUpperCase()}</span>
          <span class="meso-dot">·</span>
          <span class="meso-phase">${phase.name.toUpperCase()}</span>
          <span class="meso-dot">·</span>
          <span class="meso-week">WK ${weekNumber} (${weekInPhase}/${phaseWeeks})</span>
        </div>
        <div class="meso-rpe">${phase.rpeTarget}</div>
        <button class="meso-adv-btn" id="meso-adv-btn" title="Advance to next week">+WK</button>
      </div>`;
  }

  let html = `<div class="today-header" style="--accent:${accent}">`;
  html += `<div class="today-day">${day.name.toUpperCase()}</div>`;
  if (day.type !== 'rest') html += `<div class="today-label">${day.label}</div>`;
  else html += `<div class="today-label rest-label">REST DAY</div>`;
  html += `</div>`;
  if (mesoHtml) html += mesoHtml;
  return html;
}

function buildRestDay() {
  return `
    <div class="rest-day-content">
      <div class="rest-icon">💤</div>
      <p class="rest-msg">Recovery is part of the program.</p>
      ${renderNutritionCard()}
      ${renderBodyweightCard()}
    </div>`;
}

function buildWarmupSection(day) {
  const dow = new Date().getDay();
  const wu  = PROGRAM.warmup[dow];
  if (!wu) return '';
  return `
    <details class="accordion" data-section="warmup">
      <summary class="accordion-header">
        <span class="accordion-icon">🔥</span>
        <span class="accordion-title">WARM-UP</span>
        <span class="accordion-meta">${wu.duration} · ${wu.focus}</span>
        <span class="accordion-chevron">›</span>
      </summary>
      <div class="accordion-body">
        ${wu.exercises.map(e => `
          <div class="protocol-row">
            <div class="protocol-name">${e.name}</div>
            <div class="protocol-dose">${e.dose}</div>
            <div class="protocol-note">${e.note}</div>
          </div>`).join('')}
      </div>
    </details>`;
}

function buildCoreSection(day) {
  const dow  = new Date().getDay();
  const core = PROGRAM.coreWork[dow];
  if (!core) return '';
  return `
    <details class="accordion" data-section="core">
      <summary class="accordion-header">
        <span class="accordion-icon">🧱</span>
        <span class="accordion-title">CORE WORK</span>
        <span class="accordion-meta">${core.focus}</span>
        <span class="accordion-chevron">›</span>
      </summary>
      <div class="accordion-body">
        ${core.exercises.map(e => `
          <div class="protocol-row">
            <div class="protocol-name">${e.name}</div>
            <div class="protocol-dose">${e.dose}</div>
            <div class="protocol-note">${e.note}</div>
          </div>`).join('')}
      </div>
    </details>`;
}

function buildCooldownSection(day) {
  const dow = new Date().getDay();
  const cd  = PROGRAM.cooldown[dow];
  if (!cd) return '';
  return `
    <details class="accordion" data-section="cooldown">
      <summary class="accordion-header">
        <span class="accordion-icon">❄️</span>
        <span class="accordion-title">COOL-DOWN</span>
        <span class="accordion-meta">${cd.duration} · ${cd.focus}</span>
        <span class="accordion-chevron">›</span>
      </summary>
      <div class="accordion-body">
        ${cd.exercises.map(e => `
          <div class="protocol-row">
            <div class="protocol-name">${e.name}</div>
            <div class="protocol-dose">${e.dose}</div>
            <div class="protocol-note">${e.note}</div>
          </div>`).join('')}
      </div>
    </details>`;
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
  const counts  = Session.getCompletionCount(ex.id);
  const allDone = counts.total > 0 && counts.done === counts.total;
  const [minR, maxR] = ex.repRange;
  const repStr  = minR === maxR ? `${minR}` : `${minR}–${maxR}`;
  const swapName = Session.getSwapName(ex.id);
  const displayName = swapName ? `${swapName} <span class="swap-badge">SWAP</span>` : ex.name;

  return `
    <div class="exercise-card${allDone ? ' all-done' : ''}" data-exercise-id="${ex.id}" style="--accent:${accent}">
      <div class="ex-card-left">
        <div class="ex-name">${displayName}</div>
        <div class="ex-meta">${ex.sets} × ${repStr} reps · <span class="ex-type-tag">${ex.type.toUpperCase()}</span></div>
      </div>
      <div class="ex-card-right">
        <div class="ex-progress${allDone ? ' done' : ''}">${counts.done}/${counts.total}</div>
        <div class="ex-chevron">›</div>
      </div>
    </div>`;
}

// ── Exercise Detail ────────────────────────────────────────────────────────────
async function loadAndRenderExerciseDetail(exerciseId, day) {
  const container = document.getElementById('exercise-detail-container');
  if (!container) return;

  const ex = day.exercises.find(e => e.id === exerciseId);
  if (!ex) return;

  const accent      = day.accent;
  const sets        = await Session.getSetsForExercise(ex, Session.currentDate);
  const recWeight   = await Session.getPrescriptiveWeight(ex);
  const swapName    = Session.getSwapName(ex.id);
  const displayName = swapName || ex.name;
  const [minR, maxR] = ex.repRange;
  const repStr      = minR === maxR ? `${minR}` : `${minR}–${maxR}`;
  const phaseInfo   = Session.getCurrentPhaseInfo();

  // Check rotation suggestion
  const suggestRotation = await Session.shouldSuggestRotation(ex.id);

  let html = `
    <div class="ex-detail" style="--accent:${accent}">
      <div class="ex-detail-topbar">
        <button class="back-btn" id="back-to-list">‹ BACK</button>
        <button class="swap-btn" id="open-swap-btn" data-exercise="${exerciseId}">⇄ SWAP</button>
      </div>
      <div class="ex-detail-header">
        <h2 class="ex-detail-name">${displayName}${swapName ? ' <span class="swap-active-badge">SWAPPED</span>' : ''}</h2>
        <div class="ex-detail-meta">${ex.sets} sets · ${repStr} reps · ${ex.type}</div>
      </div>`;

  // Rotation suggestion
  if (suggestRotation && ex.rotation && ex.rotation.length > 0) {
    const nextVariant = ex.rotation[0];
    html += `
      <div class="rotation-banner">
        <span class="rotation-icon">🔄</span>
        <div class="rotation-text">
          <div class="rotation-title">4+ WEEKS ON THIS EXERCISE</div>
          <div class="rotation-sub">Consider rotating to <strong>${nextVariant.replace(/_/g,' ')}</strong> for new stimulus</div>
        </div>
        <button class="rotation-dismiss" id="rotation-dismiss">✕</button>
      </div>`;
  }

  // Prescriptive weight banner
  html += `
      <div class="rec-weight-banner">
        <div class="rec-left">
          <span class="rec-label">PRESCRIBED WEIGHT</span>
          ${phaseInfo ? `<span class="rec-phase">${phaseInfo.phase.name.toUpperCase()} · ${phaseInfo.phase.rpeTarget}</span>` : ''}
        </div>
        <span class="rec-value">${recWeight} lb</span>
      </div>`;

  // Sets
  html += `<div class="sets-container">`;
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const rpeLabel = set.reps != null ? Session.getRPELabel(set.reps, ex.repRange) : '';
    const rpeClass = set.reps != null ? Session.getRPEClass(set.reps, ex.repRange) : '';
    const w = set.weight != null ? set.weight : recWeight;
    const r = set.reps != null ? set.reps : '';
    const effort = set.effortValue != null ? set.effortValue : 2;

    html += `
      <div class="set-row${set.done ? ' set-done' : ''}" data-set-index="${i}">
        <div class="set-num">S${i + 1}</div>
        <div class="set-inputs">
          <input type="number" class="set-weight" data-index="${i}"
            value="${w}" placeholder="lb" step="2.5" min="0" inputmode="decimal"${set.done ? ' disabled' : ''}>
          <span class="set-unit">lb</span>
          <input type="number" class="set-reps" data-index="${i}"
            value="${r}" placeholder="${repStr}" min="0" max="99" inputmode="numeric"${set.done ? ' disabled' : ''}>
          <span class="set-unit">reps</span>
          <span class="rpe-badge ${rpeClass}" data-index="${i}">${rpeLabel}</span>
        </div>
        <button class="set-done-btn${set.done ? ' completed' : ''}"
          data-index="${i}" data-exercise="${exerciseId}" data-type="${ex.type}">✓</button>
      </div>
      <div class="effort-row${set.done ? '' : ' hidden'}" data-set-index="${i}">
        <span class="effort-label">EFFORT</span>
        <div class="effort-chips" data-set-index="${i}">
          ${EFFORT_LEVELS.map(lvl => `
            <button class="effort-chip${lvl.value === effort ? ' selected' : ''}"
              data-effort="${lvl.value}" data-set="${i}"
              style="--effort-color:${lvl.color}" title="${lvl.note}">
              ${lvl.short}
            </button>`).join('')}
        </div>
        ${i < sets.length - 1 ? `<span class="effort-next-hint" data-set-index="${i}"></span>` : ''}
      </div>`;
  }
  html += `</div></div>`;

  container.innerHTML = html;
  attachExerciseDetailEvents(exerciseId, ex, sets, recWeight);

  // Swap modal (hidden, outside detail)
  renderSwapModal(ex);
}

function attachExerciseDetailEvents(exerciseId, ex, sets, recWeight) {
  const container = document.getElementById('exercise-detail-container');
  if (!container) return;

  // Back
  document.getElementById('back-to-list').addEventListener('click', () => {
    activeExerciseId = null;
    renderApp();
  });

  // Swap button
  const swapBtn = document.getElementById('open-swap-btn');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => showSwapModal(exerciseId));
  }

  // Rotation dismiss
  const rotDismiss = document.getElementById('rotation-dismiss');
  if (rotDismiss) {
    rotDismiss.addEventListener('click', (e) => {
      e.target.closest('.rotation-banner').remove();
    });
  }

  // Meso advance
  const mesoAdv = document.getElementById('meso-adv-btn');
  if (mesoAdv) {
    mesoAdv.addEventListener('click', async () => {
      await Session.advanceMesoWeek();
      renderApp();
    });
  }

  // Weight inputs
  container.querySelectorAll('.set-weight').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      await Session.updateSet(exerciseId, idx, 'weight', parseFloat(e.target.value) || 0);
    });
  });

  // Reps inputs → RPE badge
  container.querySelectorAll('.set-reps').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx  = parseInt(e.target.dataset.index);
      const reps = parseInt(e.target.value);
      await Session.updateSet(exerciseId, idx, 'reps', isNaN(reps) ? null : reps);
      const badge = container.querySelector(`.rpe-badge[data-index="${idx}"]`);
      if (badge) {
        badge.textContent = isNaN(reps) ? '' : Session.getRPELabel(reps, ex.repRange);
        badge.className = `rpe-badge ${isNaN(reps) ? '' : Session.getRPEClass(reps, ex.repRange)}`;
      }
    });
  });

  // Done buttons
  container.querySelectorAll('.set-done-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx    = parseInt(e.target.dataset.index);
      const exType = e.target.dataset.type;
      const setRow = container.querySelector(`.set-row[data-set-index="${idx}"]`);
      const effortRow = container.querySelector(`.effort-row[data-set-index="${idx}"]`);
      const isDone = sets[idx].done;

      if (isDone) {
        await Session.uncompleteSet(exerciseId, idx);
        sets[idx].done = false;
        setRow.classList.remove('set-done');
        btn.classList.remove('completed');
        if (effortRow) effortRow.classList.add('hidden');
        setRow.querySelector('.set-weight').disabled = false;
        setRow.querySelector('.set-reps').disabled   = false;
      } else {
        const weightInput = setRow.querySelector('.set-weight');
        const repsInput   = setRow.querySelector('.set-reps');
        const weight  = parseFloat(weightInput.value) || 0;
        const reps    = parseInt(repsInput.value)    || 0;
        const effort  = sets[idx].effortValue != null ? sets[idx].effortValue : 2;

        await Session.updateSet(exerciseId, idx, 'weight', weight);
        await Session.updateSet(exerciseId, idx, 'reps', reps);
        await Session.updateSet(exerciseId, idx, 'effortValue', effort);
        await Session.completeSet(exerciseId, idx);
        sets[idx].done = true; sets[idx].weight = weight; sets[idx].reps = reps;

        setRow.classList.add('set-done');
        btn.classList.add('completed');
        weightInput.disabled = true;
        repsInput.disabled   = true;
        if (effortRow) effortRow.classList.remove('hidden');

        // Show next-set weight hint
        updateNextSetHint(container, idx, sets, effort, ex.type, exerciseId);

        // Start rest timer
        Timer.start(PROGRAM.restTime[exType] || 90);
      }
    });
  });

  // Effort chips
  container.addEventListener('click', async (e) => {
    const chip = e.target.closest('.effort-chip');
    if (!chip) return;
    const setIdx  = parseInt(chip.dataset.set);
    const effortVal = parseInt(chip.dataset.effort);

    // Update selection UI
    chip.closest('.effort-chips').querySelectorAll('.effort-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');

    // Update state
    sets[setIdx].effortValue = effortVal;
    await Session.updateSet(exerciseId, setIdx, 'effortValue', effortVal);
    if (sets[setIdx].done) {
      await Store.saveEffortRating(exerciseId, Session.currentDate, setIdx, effortVal, sets[setIdx].weight, sets[setIdx].reps);
    }

    // Recalculate next set weight hint
    updateNextSetHint(container, setIdx, sets, effortVal, ex.type, exerciseId);
  });
}

function updateNextSetHint(container, setIdx, sets, effortValue, exType, exerciseId) {
  const hint = container.querySelector(`.effort-next-hint[data-set-index="${setIdx}"]`);
  if (!hint) return;
  const ex = getExerciseById(exerciseId);
  if (!ex) return;

  const nextIdx = sets.findIndex((s, i) => i > setIdx && !s.done);
  if (nextIdx === -1) { hint.textContent = ''; return; }

  const adj = Session.getEffortAdjustedWeight(sets[setIdx].weight, effortValue, exType);
  if (adj !== sets[setIdx].weight) {
    const dir = adj > sets[setIdx].weight ? '↑' : '↓';
    hint.textContent = `Next set: ${adj} lb ${dir}`;
    hint.className = `effort-next-hint ${adj > sets[setIdx].weight ? 'hint-up' : 'hint-down'}`;
    // Pre-fill next set weight
    const nextRow = container.querySelector(`.set-row[data-set-index="${nextIdx}"]`);
    if (nextRow) {
      const nextWeight = nextRow.querySelector('.set-weight');
      if (nextWeight && !nextWeight.disabled) nextWeight.value = adj;
    }
  } else {
    hint.textContent = 'Maintain weight';
    hint.className = 'effort-next-hint hint-hold';
  }
}

// ── Swap Modal ────────────────────────────────────────────────────────────────
function renderSwapModal(ex) {
  // Remove existing if any
  const existing = document.getElementById('swap-modal');
  if (existing) existing.remove();

  const alts    = ex.alternatives || [];
  const curSwap = Session.getSwapName(ex.id);

  const modal = document.createElement('div');
  modal.id = 'swap-modal';
  modal.className = 'swap-modal-overlay hidden';
  modal.innerHTML = `
    <div class="swap-modal">
      <div class="swap-modal-header">
        <div class="swap-modal-title">SWAP EXERCISE</div>
        <button class="swap-modal-close" id="close-swap-modal">✕</button>
      </div>
      <div class="swap-modal-subtitle">Replace <strong>${ex.name}</strong> for this session</div>
      ${curSwap ? `
        <div class="swap-current">
          <span class="swap-current-label">Current swap: <strong>${curSwap}</strong></span>
          <button class="swap-revert-btn" id="swap-revert-btn">Revert to original</button>
        </div>` : ''}
      <div class="swap-list">
        <div class="swap-section-label">SAME PATTERN — DIRECT SUBSTITUTIONS</div>
        ${alts.map((alt, i) => `
          <button class="swap-option" data-alt-name="${alt.name}" data-exercise="${ex.id}">
            <div class="swap-opt-name">${alt.name}</div>
            <div class="swap-opt-note">${alt.notes}</div>
          </button>`).join('')}
      </div>
    </div>`;

  document.getElementById('app').appendChild(modal);

  document.getElementById('close-swap-modal').addEventListener('click', () => hideSwapModal());

  document.getElementById('swap-revert-btn')?.addEventListener('click', async () => {
    await Session.clearSwap(ex.id);
    hideSwapModal();
    renderApp();
  });

  modal.querySelectorAll('.swap-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      const altName = btn.dataset.altName;
      const exId    = btn.dataset.exercise;
      await Session.applySwap(exId, altName);
      hideSwapModal();
      renderApp();
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideSwapModal();
  });
}

function showSwapModal(exerciseId) {
  const modal = document.getElementById('swap-modal');
  if (modal) {
    modal.classList.remove('hidden');
    swapModalOpen = true;
  }
}

function hideSwapModal() {
  const modal = document.getElementById('swap-modal');
  if (modal) {
    modal.classList.add('hidden');
    swapModalOpen = false;
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
function attachBWEvents() {
  loadBodyweightHistory();

  document.getElementById('bw-save-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('bw-input');
    const val = parseFloat(input.value);
    if (!isNaN(val) && val > 0) {
      await Store.saveBodyweight(Session.getTodayString(), val);
      input.value = '';
      loadBodyweightHistory();
    }
  });

  document.getElementById('install-btn')?.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      document.getElementById('install-btn')?.classList.add('hidden');
    }
  });

  document.getElementById('timer-bar')?.addEventListener('click', () => Timer.dismiss());

  document.getElementById('meso-adv-btn')?.addEventListener('click', async () => {
    await Session.advanceMesoWeek();
    renderApp();
  });
}

function attachExerciseCardEvents() {
  document.querySelectorAll('.exercise-card').forEach(card => {
    card.addEventListener('click', () => {
      activeExerciseId = card.dataset.exerciseId;
      renderApp();
    });
  });
}

function attachAccordionEvents() {
  // Accordions are <details> — browser handles natively; no JS needed
}

async function loadBodyweightHistory() {
  const entries = await Store.getBodyweightEntries(30);
  const hist = document.getElementById('bw-history');
  if (!hist) return;

  if (!entries.length) { hist.innerHTML = '<div class="bw-empty">No entries yet</div>'; return; }

  const first  = entries[entries.length - 1];
  const latest = entries[0];
  const delta  = latest.weight - first.weight;
  const sign   = delta >= 0 ? '+' : '';

  let html = `<div class="bw-delta">Change: <span class="${delta < 0 ? 'bw-down' : 'bw-up'}">${sign}${delta.toFixed(1)} lb</span> over ${entries.length} entries</div>`;
  html += `<div class="bw-list">`;
  for (const e of entries.slice(0, 10)) {
    html += `<div class="bw-entry"><span class="bw-date">${formatDate(e.date)}</span><span class="bw-val">${e.weight} lb</span></div>`;
  }
  html += `</div>`;
  hist.innerHTML = html;
}

// ── HISTORY TAB ───────────────────────────────────────────────────────────────
async function renderHistory(container) {
  const grouped = await Store.getAllSessionsByDate();
  const dates   = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  let html = `<div class="tab-header"><h1 class="tab-title">HISTORY</h1></div>`;
  if (!dates.length) {
    html += `<div class="empty-state">No sessions logged yet.<br>Complete your first workout!</div>`;
    container.innerHTML = html;
    return;
  }

  html += `<div class="history-list">`;
  for (const date of dates) {
    const sessions = grouped[date];
    const dow  = new Date(date + 'T12:00:00').getDay();
    const day  = PROGRAM.days[dow];
    const accent = day ? day.accent : '#888';
    const hasDone = sessions.some(s => s.sets && s.sets.some(set => set.done));
    if (!hasDone) continue;

    html += `<div class="history-day" style="--accent:${accent}">`;
    html += `<div class="history-day-header">`;
    html += `<span class="history-date">${formatDate(date)}</span>`;
    html += `<span class="history-day-name">${day ? (day.label || day.name).toUpperCase() : ''}</span>`;
    html += `</div>`;

    for (const session of sessions) {
      const ex       = getExerciseById(session.exerciseId);
      if (!ex) continue;
      const doneSets = (session.sets || []).filter(s => s.done);
      if (!doneSets.length) continue;

      html += `<div class="history-exercise">`;
      html += `<div class="history-ex-name">${ex.name}</div>`;
      html += `<div class="history-sets">`;
      for (const set of doneSets) {
        const eff = set.effortValue != null ? EFFORT_LEVELS[set.effortValue] : null;
        html += `<span class="history-set" ${eff ? `style="border-color:${eff.color}33"` : ''}>
          ${set.weight}×${set.reps}${eff ? ` <span style="color:${eff.color}">${eff.short}</span>` : ''}
        </span>`;
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

  // Mesocycle overview
  const phaseInfo = Session.getCurrentPhaseInfo();
  if (phaseInfo) {
    const totalWeeks = phaseInfo.meso.phases.reduce((s, p) => s + p.weeks, 0);
    const phasePct   = Math.round((phaseInfo.weekNumber / totalWeeks) * 100);
    html += `
      <div class="meso-overview-card">
        <div class="meso-ov-header">
          <span class="meso-ov-name">${phaseInfo.meso.name}</span>
          <span class="meso-ov-week">Week ${phaseInfo.weekNumber} of ${totalWeeks}</span>
        </div>
        <div class="meso-progress-bar"><div class="meso-progress-fill" style="width:${phasePct}%"></div></div>
        <div class="meso-phase-list">
          ${phaseInfo.meso.phases.map(p => `
            <div class="meso-phase-item${p.name === phaseInfo.phase.name ? ' active' : ''}">
              <div class="mpi-name">${p.name}</div>
              <div class="mpi-weeks">${p.weeks}w</div>
              <div class="mpi-intensity">${Math.round(p.intensity[0]*100)}–${Math.round(p.intensity[1]*100)}%</div>
            </div>`).join('')}
        </div>
        <div class="meso-desc">${phaseInfo.phase.notes || phaseInfo.meso.description}</div>
      </div>`;
  }

  // PRs
  html += `<div class="section-label">PERSONAL RECORDS (Est. 1RM)</div>`;
  html += `<div class="pr-grid">`;
  for (const lift of PROGRAM.keyLifts) {
    const best   = await Store.getBestLoggedSet(lift.id);
    const weight = best ? best.weight : 0;
    const est1rm = best ? best.est1rm : 0;
    html += `<div class="pr-card">
      <div class="pr-name">${lift.name}</div>
      <div class="pr-val">${weight > 0 ? weight + ' lb' : '—'}</div>
      ${est1rm > 0 ? `<div class="pr-est1rm">~${est1rm} lb 1RM</div>` : ''}
    </div>`;
  }
  html += `</div>`;

  // Bodyweight chart
  html += `<div class="section-label">BODYWEIGHT TREND</div>`;
  const bwEntries = await Store.getBodyweightEntries(30);
  if (bwEntries.length >= 2) {
    html += renderBWChart(bwEntries);
    const first = bwEntries[bwEntries.length - 1];
    const latest = bwEntries[0];
    const delta = latest.weight - first.weight;
    const sign  = delta >= 0 ? '+' : '';
    html += `<div class="bw-summary">
      <span>Start: <strong>${first.weight} lb</strong></span>
      <span>Now: <strong>${latest.weight} lb</strong></span>
      <span class="${delta < 0 ? 'bw-down' : 'bw-up'}">Δ <strong>${sign}${delta.toFixed(1)} lb</strong></span>
    </div>`;
  } else if (bwEntries.length === 1) {
    html += `<div class="empty-state" style="padding:20px 16px">Current: <strong>${bwEntries[0].weight} lb</strong><br><small>Log more to see trend</small></div>`;
  } else {
    html += `<div class="empty-state">No bodyweight entries yet.</div>`;
  }

  container.innerHTML = html;
}

function renderBWChart(entries) {
  const reversed = [...entries].reverse();
  const weights  = reversed.map(e => e.weight);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;
  const range = maxW - minW || 1;
  const W = 320, H = 120;
  const pad = { l: 36, r: 10, t: 10, b: 20 };
  const cW  = W - pad.l - pad.r;
  const cH  = H - pad.t - pad.b;
  const n   = reversed.length;

  const pts = reversed.map((e, i) => ({
    x: (pad.l + (n > 1 ? (i / (n - 1)) * cW : cW / 2)).toFixed(1),
    y: (pad.t + cH - ((e.weight - minW) / range) * cH).toFixed(1),
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const fillPath = `M${pts[0].x},${pts[0].y} ` +
    pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ') +
    ` L${pts[pts.length-1].x},${pad.t + cH} L${pts[0].x},${pad.t + cH} Z`;
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
        <text x="${pad.l - 4}" y="${pad.t + 4}" text-anchor="end" class="chart-label">${Math.round(maxW)}</text>
        <text x="${pad.l - 4}" y="${pad.t + cH + 4}" text-anchor="end" class="chart-label">${Math.round(minW)}</text>
      </svg>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
