// CLAUDEBOD - Session Logic v2
'use strict';

const Session = (() => {
  let currentDate   = getTodayString();
  let currentDow    = new Date().getDay();  // which program-day is loaded (can differ from calendar)
  let sessionData   = {};  // { [exId]: { sets: [{weight, reps, done, effortValue}] } }
  let mesoState     = null;
  let swapOverrides = {}; // { [exId]: swappedToName }

  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  // ── Mesocycle ──────────────────────────────────────────────────────────────

  async function loadMesoState() {
    mesoState = await Store.getMesocycleState();
    return mesoState;
  }

  async function advanceMesoWeek() {
    if (!mesoState) await loadMesoState();
    const meso = MESOCYCLES[mesoState.mesoIndex % MESOCYCLES.length];
    const totalWeeks = meso.phases.reduce((s, p) => s + p.weeks, 0);
    let nextWeek = mesoState.weekNumber + 1;
    let nextMeso = mesoState.mesoIndex;
    if (nextWeek > totalWeeks) { nextWeek = 1; nextMeso++; }
    mesoState = { mesoIndex: nextMeso, weekNumber: nextWeek, startDate: currentDate };
    await Store.setMesocycleState(mesoState);
    return mesoState;
  }

  function getCurrentPhaseInfo() {
    if (!mesoState) return null;
    return getMesoPhaseInfo(mesoState);
  }

  // ── Prescriptive Weight ────────────────────────────────────────────────────
  // Priority: 1RM-based if available, otherwise last-session + progression

  async function getPrescriptiveWeight(exercise) {
    if (!mesoState) await loadMesoState();
    const phaseInfo = getCurrentPhaseInfo();

    // Try 1RM-based prescription
    const est1RM = await Store.getEstimated1RM(exercise.id);
    if (est1RM > 0 && phaseInfo) {
      const targetIntensity = phaseInfo.intensity;
      const prescribed = roundToNearest(est1RM * targetIntensity);
      // Make sure it's not below seed weight
      return Math.max(prescribed, exercise.seedWeight);
    }

    // Fallback: last session + progression + mesocycle weekly increase
    const lastSession = await Store.getLastSessionForExercise(exercise.id, currentDate);
    if (!lastSession || !lastSession.sets) return exercise.seedWeight;

    const doneSets = lastSession.sets.filter(s => s.done && s.weight != null);
    if (!doneSets.length) return exercise.seedWeight;

    const lastWeight = doneSets[0].weight;
    const [minReps, maxReps] = exercise.repRange;
    const allHitTop = doneSets.every(s => s.reps >= maxReps);
    const failCount  = doneSets.filter(s => s.reps < minReps).length;
    const prog = PROGRAM.progression[exercise.type] || PROGRAM.progression.compound;

    // Get average recent effort to modulate progression
    const avgEffort = await Store.getAvgRecentEffort(exercise.id);

    let recommended = lastWeight;
    if (allHitTop || avgEffort <= 1.5) {
      // Progressive increase — size based on mesocycle phase
      const weeklyInc = phaseInfo ? (phaseInfo.phase.weeklyIncrease[exercise.type] || prog.increase) : prog.increase;
      recommended = lastWeight + weeklyInc;
    } else if (failCount >= 2 || avgEffort >= 4) {
      recommended = Math.round(lastWeight * (1 - prog.decrease));
    }
    // else: hold at last weight

    return roundToNearest(Math.max(recommended, exercise.seedWeight));
  }

  // ── Effort Adjustment (within-session) ────────────────────────────────────
  // Given the current set's weight and an effort rating, compute next set weight

  function getEffortAdjustedWeight(currentWeight, effortValue, exerciseType) {
    const level = EFFORT_LEVELS[effortValue];
    if (!level || level.nextSetAdj === 0) return currentWeight;
    const adjusted = currentWeight * (1 + level.nextSetAdj);
    return roundToNearest(Math.max(adjusted, 5));
  }

  // ── RPE Labels ────────────────────────────────────────────────────────────
  // `targetReps` is the per-set prescribed rep count (from scheme).

  function getRPELabel(reps, targetReps) {
    const r = parseInt(reps);
    const t = parseInt(targetReps);
    if (isNaN(r) || isNaN(t)) return '';
    if (r >= t + 2) return 'EASY';
    if (r >= t)     return 'ON TARGET';
    if (r >= t - 1) return 'CLOSE';
    return 'TOO HEAVY';
  }

  function getRPEClass(reps, targetReps) {
    const l = getRPELabel(reps, targetReps);
    return l === 'EASY' ? 'rpe-easy' : l === 'ON TARGET' || l === 'CLOSE' ? 'rpe-target' : l ? 'rpe-heavy' : '';
  }

  // ── Session Load ──────────────────────────────────────────────────────────

  // Load session. If `dowOverride` is provided, load that program-day's
  // exercises instead of the calendar day-of-week.
  async function loadSessionForDate(date, dowOverride) {
    currentDate = date;
    sessionData = {};
    swapOverrides = {};
    await loadMesoState();

    currentDow = dowOverride != null ? dowOverride : new Date(date + 'T12:00:00').getDay();
    const exercises = getExercisesForDay(currentDow);

    for (const ex of exercises) {
      const log = await Store.getSetLog(ex.id, date);
      if (log && log.sets) sessionData[ex.id] = { sets: log.sets };

      const swap = await Store.getActiveSwap(ex.id);
      if (swap && swap.date === date) swapOverrides[ex.id] = swap.swappedToName;
    }
  }

  // Build per-set { weight, targetReps } using the exercise's scheme.
  // The top working weight comes from prescription; scheme distributes around it.
  function buildSetsFromScheme(exercise, topWeight) {
    const schemeKey = exercise.scheme || 'straight';
    const gen = SET_SCHEMES[schemeKey] || SET_SCHEMES.straight;
    return gen(topWeight, exercise.sets, exercise.repRange);
  }

  async function getSetsForExercise(exercise, date) {
    if (sessionData[exercise.id]) return sessionData[exercise.id].sets;

    const topWeight = await getPrescriptiveWeight(exercise);
    const schemed   = buildSetsFromScheme(exercise, topWeight);
    const sets = schemed.map(({ weight, targetReps }) => ({
      weight, reps: null, targetReps, done: false, effortValue: 2,
    }));
    sessionData[exercise.id] = { sets };
    return sets;
  }

  // ── CRUD on Sets ──────────────────────────────────────────────────────────

  async function _persist(exerciseId) {
    await Store.saveSetLog(exerciseId, currentDow, currentDate, sessionData[exerciseId].sets);
  }

  async function updateSet(exerciseId, setIndex, field, value) {
    if (!sessionData[exerciseId]) return;
    sessionData[exerciseId].sets[setIndex][field] = value;
    await _persist(exerciseId);
  }

  async function completeSet(exerciseId, setIndex) {
    if (!sessionData[exerciseId]) return;
    const set = sessionData[exerciseId].sets[setIndex];
    set.done = true;
    await _persist(exerciseId);

    // Save effort rating
    if (set.effortValue != null) {
      await Store.saveEffortRating(exerciseId, currentDate, setIndex, set.effortValue, set.weight, set.reps);
    }

    // If effort was rated, adjust next incomplete set's weight
    if (set.effortValue !== 2) {
      const ex = getExerciseById(exerciseId);
      if (ex) {
        const sets = sessionData[exerciseId].sets;
        const nextIdx = sets.findIndex((s, i) => i > setIndex && !s.done);
        if (nextIdx !== -1) {
          const adj = getEffortAdjustedWeight(set.weight, set.effortValue, ex.type);
          sets[nextIdx].weight = adj;
          await _persist(exerciseId);
        }
      }
    }
  }

  async function uncompleteSet(exerciseId, setIndex) {
    if (!sessionData[exerciseId]) return;
    sessionData[exerciseId].sets[setIndex].done = false;
    await _persist(exerciseId);
  }

  // ── Swap Management ───────────────────────────────────────────────────────

  async function applySwap(exerciseId, swappedToName) {
    swapOverrides[exerciseId] = swappedToName;
    await Store.setActiveSwap(exerciseId, swappedToName, currentDate);
  }

  async function clearSwap(exerciseId) {
    delete swapOverrides[exerciseId];
    await Store.clearActiveSwap(exerciseId);
  }

  function getSwapName(exerciseId) {
    return swapOverrides[exerciseId] || null;
  }

  // ── Progress Queries ──────────────────────────────────────────────────────

  function getCompletionCount(exerciseId) {
    const data = sessionData[exerciseId];
    if (!data) return { done: 0, total: 0 };
    return { done: data.sets.filter(s => s.done).length, total: data.sets.length };
  }

  // ── Rotation Warning ─────────────────────────────────────────────────────

  async function shouldSuggestRotation(exerciseId, rotationWeeks = 4) {
    const weeks = await Store.getExerciseWeeksCount(exerciseId);
    return weeks >= rotationWeeks;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    getTodayString,
    loadSessionForDate,
    loadMesoState,
    advanceMesoWeek,
    getCurrentPhaseInfo,
    getPrescriptiveWeight,
    getEffortAdjustedWeight,
    getRPELabel,
    getRPEClass,
    getSetsForExercise,
    updateSet,
    completeSet,
    uncompleteSet,
    applySwap,
    clearSwap,
    getSwapName,
    getCompletionCount,
    shouldSuggestRotation,
    get currentDate() { return currentDate; },
    get currentDow()  { return currentDow; },
    get sessionData()  { return sessionData; },
    get mesoState()    { return mesoState; },
  };
})();
