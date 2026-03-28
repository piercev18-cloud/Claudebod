// CLAUDEBOD v3 - Main App (Retro Arcade Edition)
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = 'today';
let activeExerciseId = null;
let activeExerciseTab = 'log'; // 'log' | 'history'
let swapModalOpen = false;
let deferredInstallPrompt = null;
let selectedDow = new Date().getDay();

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  await Store.open();
  await XPEngine.load();
  selectedDow = new Date().getDay();
  await Session.loadSessionForDate(Session.getTodayString(), selectedDow);
  renderApp();
  setupNav();
  setupInstallPrompt();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  // Show onboarding if no profile has been set yet
  const profile = await Store.getSetting('user_profile', null);
  if (!profile) showOnboarding();
});

// ── Onboarding ────────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    key: 'goal',
    title: 'WHAT\'S YOUR GOAL?',
    options: [
      { value: 'mass',  label: 'BUILD MASS',          icon: '🏋️', desc: 'Maximize muscle & strength gains' },
      { value: 'lean',  label: 'STAY LEAN',            icon: '🔥', desc: 'Retain muscle while cutting body fat' },
      { value: 'recomp',label: 'BODY RECOMP',          icon: '⚖️', desc: 'Lose fat and build muscle simultaneously' },
      { value: 'sport', label: 'SPORT PERFORMANCE',    icon: '⚡', desc: 'Athletic output & competition prep' },
    ],
  },
  {
    key: 'experience',
    title: 'TRAINING EXPERIENCE',
    options: [
      { value: 'beginner',     label: 'BEGINNER',     icon: '🌱', desc: 'Under 1 year of consistent training' },
      { value: 'intermediate', label: 'INTERMEDIATE', icon: '💪', desc: '1–3 years, solid technique base' },
      { value: 'advanced',     label: 'ADVANCED',     icon: '🎯', desc: '3–5 years, good movement patterns' },
      { value: 'competitor',   label: 'COMPETITOR',   icon: '🏆', desc: '5+ years, competes or trains to compete' },
    ],
  },
  {
    key: 'equipment',
    title: 'EQUIPMENT ACCESS',
    options: [
      { value: 'full_gym', label: 'FULL GYM',      icon: '🏢', desc: 'Commercial gym with all equipment' },
      { value: 'home',     label: 'HOME GYM',       icon: '🏠', desc: 'Barbell, rack, dumbbells at home' },
      { value: 'minimal',  label: 'MINIMAL',        icon: '🎽', desc: 'Dumbbells, bands, or bodyweight only' },
    ],
  },
  {
    key: 'stats',
    title: 'YOUR STATS',
    isStats: true,
  },
  {
    key: 'maxes',
    title: 'ENTER YOUR MAXES',
    isMaxes: true,
    subtitle: 'Optional — skip if unknown. Used to calculate exact % prescriptions.',
  },
];

let onboardingData = {};
let onboardingStep = 0;

function showOnboarding() {
  onboardingData = {};
  onboardingStep = 0;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const existing = document.getElementById('onboarding-overlay');
  if (existing) existing.remove();

  const step = ONBOARDING_STEPS[onboardingStep];
  const total = ONBOARDING_STEPS.length;
  const dots = Array(total).fill(null).map((_, i) =>
    `<span class="ob-dot${i === onboardingStep ? ' active' : ''}"></span>`).join('');

  let bodyHtml = '';
  if (step.isMaxes) {
    const keyLifts = PROGRAM.keyLifts.filter(l =>
      ['back_squat','barbell_bench_press','romanian_deadlift','front_squat',
       'power_clean','hang_power_snatch','push_press','weighted_pull_up','pendlay_row'].includes(l.id));
    bodyHtml = `<div class="ob-stats-form">`;
    bodyHtml += `<p class="ob-stats-note" style="margin-bottom:8px">${step.subtitle}</p>`;
    for (const lift of keyLifts) {
      const savedVal = (onboardingData.maxes || {})[lift.id] || '';
      bodyHtml += `
        <div class="ob-field">
          <label class="ob-label">${lift.name.toUpperCase()} 1RM (lb)</label>
          <input class="ob-input ob-max-input" type="number" inputmode="decimal"
            data-lift-id="${lift.id}" placeholder="e.g. 225" min="0" max="2000" value="${savedVal}">
        </div>`;
    }
    bodyHtml += `</div>`;
  } else if (step.isStats) {
    bodyHtml = `
      <div class="ob-stats-form">
        <div class="ob-field">
          <label class="ob-label">SEX</label>
          <div class="ob-sex-row">
            <button class="ob-sex-btn${onboardingData.sex === 'M' ? ' selected' : ''}" data-sex="M">MALE</button>
            <button class="ob-sex-btn${onboardingData.sex === 'F' ? ' selected' : ''}" data-sex="F">FEMALE</button>
          </div>
        </div>
        <div class="ob-field">
          <label class="ob-label">AGE</label>
          <input class="ob-input" id="ob-age" type="number" inputmode="numeric" placeholder="28" min="13" max="99" value="${onboardingData.age || ''}">
        </div>
        <div class="ob-field">
          <label class="ob-label">HEIGHT (inches)</label>
          <input class="ob-input" id="ob-height" type="number" inputmode="decimal" placeholder='72 (= 6\'0")' min="48" max="96" value="${onboardingData.height || ''}">
        </div>
        <div class="ob-field">
          <label class="ob-label">WEIGHT (lbs)</label>
          <input class="ob-input" id="ob-weight" type="number" inputmode="decimal" placeholder="195" min="50" max="500" value="${onboardingData.weight || ''}">
        </div>
        <p class="ob-stats-note">Used for nutrition targets. All data stays on your device.</p>
      </div>`;
  } else {
    bodyHtml = step.options.map(opt => `
      <button class="ob-option${onboardingData[step.key] === opt.value ? ' selected' : ''}"
        data-key="${step.key}" data-value="${opt.value}">
        <span class="ob-opt-icon">${opt.icon}</span>
        <div class="ob-opt-text">
          <span class="ob-opt-label">${opt.label}</span>
          <span class="ob-opt-desc">${opt.desc}</span>
        </div>
      </button>`).join('');
  }

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="ob-card">
      <div class="ob-header">
        <div class="ob-logo">CLAUDEBOD</div>
        <div class="ob-dots">${dots}</div>
      </div>
      <h2 class="ob-title">${step.title}</h2>
      <div class="ob-body">${bodyHtml}</div>
      <div class="ob-footer">
        ${onboardingStep > 0 ? `<button class="ob-back-btn" id="ob-back">‹ BACK</button>` : '<span></span>'}
        <button class="ob-next-btn" id="ob-next">${onboardingStep < total - 1 ? 'NEXT ›' : 'START TRAINING'}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  // Option buttons
  overlay.querySelectorAll('.ob-option').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.ob-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onboardingData[btn.dataset.key] = btn.dataset.value;
    });
  });

  // Sex buttons (stats step)
  overlay.querySelectorAll('.ob-sex-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.ob-sex-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      onboardingData.sex = btn.dataset.sex;
    });
  });

  // Back
  document.getElementById('ob-back')?.addEventListener('click', () => {
    onboardingStep--;
    renderOnboardingStep();
  });

  // Next / Finish
  document.getElementById('ob-next').addEventListener('click', async () => {
    const step = ONBOARDING_STEPS[onboardingStep];

    if (step.isMaxes) {
      // Save entered maxes to IndexedDB, then finish
      const maxInputs = overlay.querySelectorAll('.ob-max-input');
      const maxes = {};
      maxInputs.forEach(inp => {
        const val = parseFloat(inp.value);
        if (val > 0) maxes[inp.dataset.liftId] = val;
      });
      onboardingData.maxes = maxes;
      await Store.setSetting('user_profile', onboardingData);
      // Persist each max individually so getPrescriptiveWeight picks them up
      for (const [id, w] of Object.entries(maxes)) {
        await Store.setKnownMax(id, w);
      }
      document.getElementById('onboarding-overlay').remove();
      return;
    }

    if (step.isStats) {
      // Collect stats (all optional) — advance to maxes step without requiring selection
      onboardingData.age    = parseInt(document.getElementById('ob-age').value)    || null;
      onboardingData.height = parseFloat(document.getElementById('ob-height').value) || null;
      onboardingData.weight = parseFloat(document.getElementById('ob-weight').value) || null;
      onboardingStep++;
      renderOnboardingStep();
      return;
    }

    // For choice steps: require a selection before advancing
    if (!step.isMaxes && !onboardingData[step.key]) {
      overlay.querySelector('.ob-body').style.animation = 'ob-shake 0.3s ease';
      setTimeout(() => overlay.querySelector('.ob-body').style.animation = '', 300);
      return;
    }

    onboardingStep++;
    renderOnboardingStep();
  });
}

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
  activeExerciseTab = 'log';
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  renderApp();
}

// ── Main Render ───────────────────────────────────────────────────────────────
function renderApp() {
  renderXPBar();
  const main = document.getElementById('main-content');
  if (!main) return;
  if      (currentTab === 'today')    renderToday(main);
  else if (currentTab === 'history')  renderHistory(main);
  else if (currentTab === 'progress') renderProgress(main);
}

// ── XP Bar ────────────────────────────────────────────────────────────────────
function renderXPBar() {
  const container = document.getElementById('xp-bar-container');
  if (!container) return;
  const info = XPEngine.getLevelInfo();
  const pct  = info.neededXP > 0 ? Math.min(100, (info.currentXP / info.neededXP) * 100) : 100;
  container.innerHTML = `
    <div class="xp-header">
      <div class="xp-level-badge">LV ${info.level}</div>
      <div class="xp-bar-wrap">
        <div class="xp-bar-fill" style="width:${pct.toFixed(1)}%"></div>
      </div>
      <div class="xp-text">${info.currentXP}/${info.neededXP} XP</div>
    </div>`;
}

// ── Achievement Toast ─────────────────────────────────────────────────────────
function showAchievementToast(achievement) {
  const existing = document.querySelector('.achievement-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `
    <div class="toast-icon">${achievement.icon}</div>
    <div>
      <div class="toast-text">ACHIEVEMENT UNLOCKED</div>
      <div class="toast-text">${achievement.name}</div>
      <div class="toast-sub">${achievement.desc}</div>
    </div>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Show XP popup on set completion
function showXPPopup(amount, element) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:absolute;font-family:'Press Start 2P',monospace;font-size:10px;
    color:#39ff14;text-shadow:0 0 8px #39ff14;pointer-events:none;
    z-index:999;animation:xpFloat .8s ease-out forwards;white-space:nowrap;
  `;
  popup.textContent = `+${amount} XP`;
  if (element) {
    const rect = element.getBoundingClientRect();
    popup.style.left = rect.right + 'px';
    popup.style.top  = rect.top + 'px';
  } else {
    popup.style.right = '20px';
    popup.style.top   = '60px';
  }
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 900);
}

// Check achievements and show toasts for new ones
async function checkAndShowAchievements() {
  const newAch = await XPEngine.checkAchievements();
  for (let i = 0; i < newAch.length; i++) {
    setTimeout(() => showAchievementToast(newAch[i]), i * 3600);
  }
}

// ── TODAY TAB ─────────────────────────────────────────────────────────────────
function renderToday(container) {
  const day       = PROGRAM.days[selectedDow];
  const accent    = day.accent;
  const phaseInfo = Session.getCurrentPhaseInfo();
  const todayDow  = new Date().getDay();

  let html = buildDayPicker(todayDow, selectedDow);
  html += buildTodayHeader(day, accent, phaseInfo);

  if (day.type === 'rest') {
    html += buildRestDay();
    container.innerHTML = html;
    attachBWEvents();
    attachDayPickerEvents();
    return;
  }

  html += renderNutritionCard();
  html += renderBodyweightCard();

  if (activeExerciseId) {
    html += `<div id="exercise-detail-container"></div>`;
    container.innerHTML = html;
    attachBWEvents();
    attachDayPickerEvents();
    loadAndRenderExerciseDetail(activeExerciseId, day);
  } else {
    html += buildWarmupSection(selectedDow);
    html += `<div class="section-divider">EXERCISES</div>`;
    html += `<div class="exercise-list">`;
    for (const ex of day.exercises) {
      html += renderExerciseCard(ex, accent);
    }
    html += `</div>`;
    html += buildCoreSection(selectedDow);
    html += buildCooldownSection(selectedDow);
    container.innerHTML = html;
    attachBWEvents();
    attachDayPickerEvents();
    attachExerciseCardEvents();
    attachAccordionEvents();
  }
}

// ── Day Picker ────────────────────────────────────────────────────────────────
function buildDayPicker(todayDow, selected) {
  const labels = ['S','M','T','W','T','F','S'];
  const names  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = `<div class="day-picker">`;
  for (let d = 0; d < 7; d++) {
    const dayData  = PROGRAM.days[d];
    const accent   = dayData.accent;
    const isToday  = d === todayDow;
    const isSel    = d === selected;
    const isRest   = dayData.type === 'rest';
    html += `
      <button class="day-pill${isSel ? ' selected' : ''}${isRest ? ' rest' : ''}"
        data-dow="${d}" style="--pill-accent:${accent}">
        <span class="day-pill-label">${labels[d]}</span>
        <span class="day-pill-name">${names[d]}</span>
        ${isToday ? '<span class="day-pill-dot"></span>' : ''}
      </button>`;
  }
  html += `</div>`;
  return html;
}

function attachDayPickerEvents() {
  document.querySelectorAll('.day-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dow = parseInt(btn.dataset.dow);
      if (dow === selectedDow) return;
      selectedDow = dow;
      activeExerciseId = null;
      await Session.loadSessionForDate(Session.getTodayString(), selectedDow);
      renderApp();
    });
  });
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

function buildWarmupSection(dow) {
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

function buildCoreSection(dow) {
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

function buildCooldownSection(dow) {
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

const SCHEME_LABELS = { pyramid: 'PYRAMID', ramped: 'RAMP', oly_build: 'BUILD', descending: 'DESC', straight: '' };

function renderExerciseCard(ex, accent) {
  const counts  = Session.getCompletionCount(ex.id);
  const allDone = counts.total > 0 && counts.done === counts.total;
  const [minR, maxR] = ex.repRange;
  const repStr  = minR === maxR ? `${minR}` : `${minR}–${maxR}`;
  const scheme  = SCHEME_LABELS[ex.scheme] || '';
  const metaScheme = scheme ? `<span class="scheme-tag">${scheme}</span>` : '';
  const swapName = Session.getSwapName(ex.id);
  const chosenVariant = ex.variants ? Session.getVariant(ex.id) : null;
  const chosenVariantObj = chosenVariant && ex.variants ? ex.variants.find(v => v.id === chosenVariant) : null;
  const displayName = swapName
    ? `${swapName} <span class="swap-badge">SWAP</span>`
    : chosenVariantObj
      ? `${chosenVariantObj.name} <span class="variant-badge">CHOSEN</span>`
      : ex.name;

  return `
    <div class="exercise-card${allDone ? ' all-done' : ''}" data-exercise-id="${ex.id}" style="--accent:${accent}">
      <div class="ex-card-left">
        <div class="ex-name">${displayName}</div>
        <div class="ex-meta">${ex.sets} sets · ${repStr} reps ${metaScheme}· <span class="ex-type-tag">${ex.type.toUpperCase()}</span></div>
      </div>
      <div class="ex-card-right">
        <div class="ex-progress${allDone ? ' done' : ''}">${counts.done}/${counts.total}</div>
        <div class="ex-chevron">›</div>
      </div>
    </div>`;
}

// ── Variant Picker ─────────────────────────────────────────────────────────────
function renderVariantPicker(ex, day, container) {
  container.innerHTML = `
    <div class="ex-detail" style="--accent:${day.accent}">
      <div class="ex-detail-topbar">
        <button class="back-btn" id="back-to-list">‹ BACK</button>
      </div>
      <div class="variant-picker">
        <div class="variant-prompt">WHICH MOVEMENT TODAY?</div>
        <div class="variant-choices">
          ${ex.variants.map(v => `
            <button class="variant-choice-btn" data-variant="${v.id}" data-exercise="${ex.id}">
              <div class="variant-choice-name">${v.name}</div>
            </button>`).join('')}
        </div>
      </div>
    </div>`;

  container.querySelector('#back-to-list').addEventListener('click', () => {
    activeExerciseId = null;
    activeExerciseTab = 'log';
    renderApp();
  });

  container.querySelectorAll('.variant-choice-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Session.setVariant(btn.dataset.exercise, btn.dataset.variant);
      loadAndRenderExerciseDetail(btn.dataset.exercise, day);
    });
  });
}

// ── Exercise Detail ────────────────────────────────────────────────────────────
async function loadAndRenderExerciseDetail(exerciseId, day) {
  const container = document.getElementById('exercise-detail-container');
  if (!container) return;

  const ex = day.exercises.find(e => e.id === exerciseId);
  if (!ex) return;

  const accent      = day.accent;
  const swapName    = Session.getSwapName(ex.id);
  const chosenVariant    = ex.variants ? Session.getVariant(ex.id) : null;
  const chosenVariantObj = chosenVariant && ex.variants ? ex.variants.find(v => v.id === chosenVariant) : null;
  const [minR, maxR] = ex.repRange;
  const repStr      = minR === maxR ? `${minR}` : `${minR}–${maxR}`;
  const schemeLabel = SCHEME_LABELS[ex.scheme] || '';
  const phaseInfo   = Session.getCurrentPhaseInfo();
  const suggestRotation = await Session.shouldSuggestRotation(ex.id);

  // Variant exercise with no movement chosen yet — show the picker
  if (ex.variants && !chosenVariant) {
    renderVariantPicker(ex, day, container);
    return;
  }

  const effectiveId = Session.getEffectiveId(ex.id);
  const displayName = swapName
    ? `${swapName} <span class="swap-active-badge">SWAPPED</span>`
    : chosenVariantObj ? chosenVariantObj.name : ex.name;

  // Load log data and history data in parallel
  const [sets, historyHtml] = await Promise.all([
    Session.getSetsForExercise(ex, Session.currentDate),
    buildHistoryPanel(effectiveId, ex),
  ]);
  const topWeight = sets && sets.length ? sets[sets.length - 1].weight : 0;

  const isLog  = activeExerciseTab === 'log';
  const isHist = activeExerciseTab === 'history';

  let html = `
    <div class="ex-detail" style="--accent:${accent}">
      <div class="ex-detail-topbar">
        <button class="back-btn" id="back-to-list">‹ BACK</button>
        <button class="swap-btn" id="open-swap-btn" data-exercise="${exerciseId}">⇄ SWAP</button>
      </div>
      <div class="ex-detail-header">
        <div class="ex-detail-name-row">
          <h2 class="ex-detail-name">${displayName}</h2>
          ${chosenVariantObj ? `<button class="variant-change-btn" id="change-variant-btn" data-exercise="${ex.id}">⇄ CHANGE</button>` : ''}
        </div>
        <div class="ex-detail-meta">${ex.sets} working sets${ex.warmups ? ` + ${ex.warmups} warm-up` : ''} · ${repStr} reps · ${ex.type}${schemeLabel ? ` · ${schemeLabel}` : ''}</div>
        ${Session.getPrescriptionReason(ex.id) ? `<div class="ex-coach-reason">${Session.getPrescriptionReason(ex.id)}</div>` : ''}
      </div>
      <div class="ex-tabs">
        <button class="ex-tab-btn${isLog ? ' active' : ''}" data-extab="log">LOG</button>
        <button class="ex-tab-btn${isHist ? ' active' : ''}" data-extab="history">HISTORY</button>
      </div>`;

  // Rotation suggestion (only on log tab)
  if (isLog && suggestRotation && ex.rotation && ex.rotation.length > 0) {
    html += `
      <div class="rotation-banner">
        <span class="rotation-icon">🔄</span>
        <div class="rotation-text">
          <div class="rotation-title">4+ WEEKS ON THIS EXERCISE</div>
          <div class="rotation-sub">Consider rotating to <strong>${ex.rotation[0].replace(/_/g,' ')}</strong> for new stimulus</div>
        </div>
        <button class="rotation-dismiss" id="rotation-dismiss">✕</button>
      </div>`;
  }

  // ── LOG panel ──
  html += `<div class="ex-tab-panel${isLog ? '' : ' hidden'}" id="ex-panel-log">`;

  html += `
      <div class="rec-weight-banner">
        <div class="rec-left">
          <span class="rec-label">WORKING WEIGHT${schemeLabel ? ` · ${schemeLabel}` : ''}</span>
          ${phaseInfo ? `<span class="rec-phase">${phaseInfo.phase.name.toUpperCase()} · ${phaseInfo.phase.rpeTarget}</span>` : ''}
        </div>
        <span class="rec-value">${topWeight} lb</span>
      </div>`;

  // Track working-set counter separately so labels read S1, S2... skipping warmups
  let workingSetNum = 0;
  html += `<div class="sets-container">`;
  for (let i = 0; i < sets.length; i++) {
    const set      = sets[i];
    const isWarmup = !!set.isWarmup;
    if (!isWarmup) workingSetNum++;
    const tgt    = set.targetReps ?? maxR;
    const rpeLabel = (!isWarmup && set.reps != null) ? Session.getRPELabel(set.reps, tgt) : '';
    const rpeClass = (!isWarmup && set.reps != null) ? Session.getRPEClass(set.reps, tgt) : '';
    const w      = set.weight != null ? set.weight : topWeight;
    const r      = set.reps != null ? set.reps : '';
    const effort = set.effortValue != null ? set.effortValue : 2;
    const setLabel = isWarmup
      ? `<span class="set-num warmup-num">W</span>`
      : `<div class="set-num">S${workingSetNum}</div>`;

    html += `
      <div class="set-row${set.done ? ' set-done' : ''}${isWarmup ? ' warmup-set' : ''}" data-set-index="${i}" data-target-reps="${tgt}">
        ${setLabel}
        <div class="set-inputs">
          <input type="number" class="set-weight" data-index="${i}"
            value="${w}" placeholder="lb" step="2.5" min="0" inputmode="decimal"${set.done ? ' disabled' : ''}>
          <span class="set-unit">lb</span>
          <input type="number" class="set-reps" data-index="${i}"
            value="${r}" placeholder="${tgt}" min="0" max="99" inputmode="numeric"${set.done ? ' disabled' : ''}>
          <span class="set-unit">reps</span>
          ${!isWarmup ? `<span class="rpe-badge ${rpeClass}" data-index="${i}">${rpeLabel}</span>` : ''}
        </div>
        <button class="set-done-btn${set.done ? ' completed' : ''}"
          data-index="${i}" data-exercise="${effectiveId}" data-type="${ex.type}">✓</button>
      </div>
      ${!isWarmup ? `
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
      </div>` : ''}`;
  }
  html += `</div>`; // sets-container
  html += `</div>`; // ex-panel-log

  // ── HISTORY panel ──
  html += `<div class="ex-tab-panel${isHist ? '' : ' hidden'}" id="ex-panel-history">`;
  html += historyHtml;
  html += `</div></div>`; // ex-panel-history + ex-detail

  container.innerHTML = html;
  attachExerciseDetailEvents(exerciseId, ex, sets, maxR);
  renderSwapModal(ex);
}

async function buildHistoryPanel(exerciseId, ex) {
  const [allLogs, knownMax, rpeMaxInfo, simpleMax] = await Promise.all([
    Store.getAllLogsForExercise(exerciseId),
    Store.getKnownMax(exerciseId),
    Store.getBestRPEAdjusted1RM(exerciseId),
    Store.getEstimated1RM(exerciseId),
  ]);

  const perceivedMax = rpeMaxInfo ? rpeMaxInfo.adj1RM : simpleMax;
  let html = `<div class="ex-max-card">`;
  html += `<div class="ex-max-title">STRENGTH ESTIMATES</div>`;

  if (knownMax > 0) {
    html += `<div class="ex-max-row"><span class="ex-max-label">ENTERED MAX</span><span class="ex-max-val">${knownMax} lb</span></div>`;
    if (perceivedMax > 0) {
      const pct = Math.round((perceivedMax / knownMax) * 100);
      const [cls, msg] = pct >= 95 ? ['mstatus-fire', '🔥 You\'re at your max — PR incoming']
        : pct >= 88 ? ['mstatus-good', '✓ Working at high intensity']
        : pct >= 78 ? ['mstatus-warn', '↑ Room to push harder']
        : ['mstatus-low', '⚠ Training well below your known max'];
      html += `<div class="ex-max-row"><span class="ex-max-label">PERCEIVED MAX</span><span class="ex-max-val">${perceivedMax} lb <span class="ex-max-pct">${pct}%</span></span></div>`;
      html += `<div class="ex-max-status ${cls}">${msg}</div>`;
    }
  } else if (perceivedMax > 0) {
    html += `<div class="ex-max-row"><span class="ex-max-label">PERCEIVED MAX</span><span class="ex-max-val">${perceivedMax} lb</span></div>`;
    html += `<div class="ex-max-status mstatus-info">Add a known max in Progress → Maxes to see intensity %</div>`;
  } else {
    html += `<div class="ex-max-empty">Log sets with effort ratings to see estimates</div>`;
  }

  if (rpeMaxInfo) {
    const effortLabels = ['Very Easy','Easy','Average','Hard','Max','Fail'];
    html += `<div class="ex-max-detail">Best: ${rpeMaxInfo.weight} lb × ${rpeMaxInfo.reps} @ ${effortLabels[rpeMaxInfo.effortValue] || '?'} (+${rpeMaxInfo.rir} RIR = ~${rpeMaxInfo.effectiveReps} eff. reps)</div>`;
  }
  html += `</div>`;

  const done = allLogs.filter(s => s.sets && s.sets.some(set => set.done));
  if (!done.length) {
    html += `<div class="ex-hist-empty">No logged sessions yet.</div>`;
    return html;
  }

  html += `<div class="ex-hist-list">`;
  for (const session of done.slice(0, 10)) {
    const doneSets = session.sets.filter(s => s.done && s.weight && s.reps);
    if (!doneSets.length) continue;
    const bestEst = Math.max(...doneSets.map(s => epley1RM(s.weight, s.reps)));
    const setsStr = doneSets.map(s => `${s.weight}×${s.reps}`).join('  ');
    html += `
      <div class="ex-hist-entry">
        <div class="ex-hist-hdr">
          <span class="ex-hist-date">${formatDate(session.date)}</span>
          <span class="ex-hist-1rm">~${bestEst} lb 1RM</span>
        </div>
        <div class="ex-hist-sets">${setsStr}</div>
      </div>`;
  }
  html += `</div>`;
  return html;
}

function attachExerciseDetailEvents(exerciseId, ex, sets, maxR) {
  const container = document.getElementById('exercise-detail-container');
  if (!container) return;

  // Tab switching (LOG / HISTORY)
  container.querySelectorAll('.ex-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeExerciseTab = btn.dataset.extab;
      container.querySelectorAll('.ex-tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.extab === activeExerciseTab));
      container.querySelectorAll('.ex-tab-panel').forEach(p =>
        p.classList.toggle('hidden', p.id !== `ex-panel-${activeExerciseTab}`));
    });
  });

  // Back
  document.getElementById('back-to-list').addEventListener('click', () => {
    activeExerciseId = null;
    activeExerciseTab = 'log';
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

  // Change-variant button (variant exercises only)
  const changeVariantBtn = document.getElementById('change-variant-btn');
  if (changeVariantBtn) {
    changeVariantBtn.addEventListener('click', () => {
      Session.clearVariant(exerciseId);
      loadAndRenderExerciseDetail(exerciseId, day);
    });
  }

  // Weight inputs
  container.querySelectorAll('.set-weight').forEach(input => {
    input.addEventListener('change', async (e) => {
      const idx = parseInt(e.target.dataset.index);
      await Session.updateSet(effectiveId, idx, 'weight', parseFloat(e.target.value) || 0);
    });
  });

  // Reps inputs → RPE badge (uses per-set targetReps from data attribute)
  container.querySelectorAll('.set-reps').forEach(input => {
    input.addEventListener('input', async (e) => {
      const idx  = parseInt(e.target.dataset.index);
      const reps = parseInt(e.target.value);
      await Session.updateSet(effectiveId, idx, 'reps', isNaN(reps) ? null : reps);
      const badge   = container.querySelector(`.rpe-badge[data-index="${idx}"]`);
      const setRow  = container.querySelector(`.set-row[data-set-index="${idx}"]`);
      const tgt     = parseInt(setRow?.dataset.targetReps) || maxR;
      if (badge) {
        badge.textContent = isNaN(reps) ? '' : Session.getRPELabel(reps, tgt);
        badge.className   = `rpe-badge ${isNaN(reps) ? '' : Session.getRPEClass(reps, tgt)}`;
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
        await Session.uncompleteSet(effectiveId, idx);
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

        await Session.updateSet(effectiveId, idx, 'weight', weight);
        await Session.updateSet(effectiveId, idx, 'reps', reps);
        await Session.updateSet(effectiveId, idx, 'effortValue', effort);
        await Session.completeSet(effectiveId, idx);
        sets[idx].done = true; sets[idx].weight = weight; sets[idx].reps = reps;

        setRow.classList.add('set-done');
        btn.classList.add('completed');
        weightInput.disabled = true;
        repsInput.disabled   = true;
        if (effortRow) effortRow.classList.remove('hidden');

        // Show next-set weight hint
        updateNextSetHint(container, idx, sets, effort, ex.type, effectiveId);

        // ── XP Award ──
        const xpGained = await XPEngine.awardSetXP(weight, reps, exType, effort);
        showXPPopup(xpGained, btn);
        renderXPBar();
        // Check for exercise PR
        await XPEngine.recordPR(effectiveId, weight);
        // Check if all sets done (exercise complete bonus)
        const allDone = sets.every(s => s.done);
        if (allDone) {
          await XPEngine.awardBonusXP(XP.allSetsComplete, 'exercise complete');
          renderXPBar();
          // Check if entire workout is complete
          const dayExs = PROGRAM.days[selectedDow].exercises || [];
          const workoutDone = dayExs.every(e => {
            const c = Session.getCompletionCount(e.id);
            return c.total > 0 && c.done === c.total;
          });
          if (workoutDone) {
            await XPEngine.recordWorkoutComplete();
            // Calculate session volume
            let vol = 0;
            for (const e of dayExs) {
              const eid = Session.getEffectiveId(e.id);
              const sd = Session.sessionData[eid] || Session.sessionData[e.id];
              if (sd) for (const s of sd.sets) if (s.done) vol += (s.weight||0)*(s.reps||0);
            }
            await XPEngine.recordSessionVolume(vol);
            if (selectedDow === 6) await XPEngine.recordOlySession();
            renderXPBar();
          }
        }
        await checkAndShowAchievements();

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
        <div class="swap-section-label">CUSTOM EXERCISE</div>
        <div class="swap-custom-row">
          <input type="text" id="swap-custom-input" class="swap-custom-input" placeholder="e.g. Safety Bar Step Up" autocomplete="off" spellcheck="false">
          <button class="swap-custom-btn" id="swap-custom-confirm">USE</button>
        </div>
        ${alts.length ? `<div class="swap-section-label">SAME PATTERN — DIRECT SUBSTITUTIONS</div>` : ''}
        ${alts.map((alt, i) => `
          <button class="swap-option" data-alt-name="${alt.name}" data-exercise="${ex.id}">
            <div class="swap-opt-name">${alt.name}</div>
            <div class="swap-opt-note">${alt.notes}</div>
          </button>`).join('')}
      </div>
    </div>`;

  document.getElementById('app').appendChild(modal);

  document.getElementById('close-swap-modal').addEventListener('click', () => hideSwapModal());

  const customInput  = document.getElementById('swap-custom-input');
  const customConfirm = document.getElementById('swap-custom-confirm');
  async function applyCustomSwap() {
    const name = customInput.value.trim();
    if (!name) { customInput.focus(); return; }
    await Session.applySwap(ex.id, name);
    hideSwapModal();
    renderApp();
  }
  customConfirm.addEventListener('click', applyCustomSwap);
  customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustomSwap(); });

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
      await XPEngine.recordBWLog();
      renderXPBar();
      await checkAndShowAchievements();
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
      activeExerciseTab = 'log';
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

  // Strength dashboard — known maxes + perceived maxes per key lift
  html += `<div class="section-label">KNOWN MAXES <span class="section-sub">tap to edit</span></div>`;
  const knownMaxes = await Store.getAllKnownMaxes();
  html += `<div class="maxes-list">`;
  for (const lift of PROGRAM.keyLifts) {
    const knownMax  = knownMaxes[lift.id] || 0;
    const rpeInfo   = await Store.getBestRPEAdjusted1RM(lift.id);
    const simpleEst = await Store.getEstimated1RM(lift.id);
    const perceived = rpeInfo ? rpeInfo.adj1RM : simpleEst;

    let comparison = '';
    if (knownMax > 0 && perceived > 0) {
      const pct = Math.round((perceived / knownMax) * 100);
      const [cls, label] = pct >= 95 ? ['mstatus-fire', `${pct}% — at max`]
        : pct >= 88 ? ['mstatus-good', `${pct}% — high intensity`]
        : pct >= 78 ? ['mstatus-warn', `${pct}% — push harder`]
        : ['mstatus-low', `${pct}% — below potential`];
      comparison = `<span class="max-pct-badge ${cls}">${label}</span>`;
    }

    html += `
      <div class="max-row" data-lift-id="${lift.id}">
        <div class="max-row-left">
          <span class="max-lift-name">${lift.name}</span>
          ${comparison}
        </div>
        <div class="max-row-right">
          <div class="max-known-wrap">
            <input class="max-input" type="number" inputmode="decimal"
              data-lift-id="${lift.id}" value="${knownMax || ''}" placeholder="— lb"
              min="0" max="2000" step="2.5">
            <span class="max-input-unit">lb</span>
          </div>
          ${perceived > 0 ? `<div class="max-perceived">Perceived ~${perceived} lb</div>` : ''}
        </div>
      </div>`;
  }
  html += `</div>`;

  // Achievements
  html += `<div class="section-label">ACHIEVEMENTS (${XPEngine.getState().unlockedAchievements.length}/${ACHIEVEMENTS.length})</div>`;
  html += `<div class="ach-grid">`;
  for (const ach of ACHIEVEMENTS) {
    const unlocked = XPEngine.isUnlocked(ach.id);
    html += `<div class="ach-card ${unlocked ? 'unlocked' : 'locked'}" title="${ach.desc}">
      <span class="ach-icon">${ach.icon}</span>
      <div class="ach-name">${unlocked ? ach.name : '???'}</div>
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

  // Wire up max input changes
  container.querySelectorAll('.max-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const liftId = e.target.dataset.liftId;
      const val    = parseFloat(e.target.value) || 0;
      await Store.setKnownMax(liftId, val);
    });
  });
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
