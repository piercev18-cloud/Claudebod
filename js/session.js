// CLAUDEBOD - Session Logic v2
'use strict';

const Session = (() => {
  let currentDate   = getTodayString();
  let currentDow    = new Date().getDay();  // which program-day is loaded (can differ from calendar)
  let sessionData   = {};  // { [exId]: { sets: [{weight, reps, done, effortValue}] } }
  let mesoState     = null;
  let swapOverrides = {}; // { [exId]: swappedToName }
  let prescriptionReasons = {}; // { [exId]: string }

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
  // Priority: 1) user-entered known max  2) logged 1RM estimate  3) last session + progression

  // Compute a continuous performance score from completed sets (0 = total failure, 2 = crushed it).
  // Later sets are weighted more heavily since they reflect true working capacity.
  // effortMods: VERY EASY=+0.20, EASY=+0.10, AVERAGE=0, HARD=-0.10, MAX=-0.20, FAIL=-0.45
  function computePerformanceScore(doneSets, repRange) {
    const [, maxReps] = repRange;
    const effortMods = [0.20, 0.10, 0, -0.10, -0.20, -0.45];
    let weightedSum = 0;
    let weightTotal = 0;
    doneSets.forEach((set, i) => {
      const w = 1 + (i / doneSets.length) * 0.5; // later sets count more
      const repScore = Math.min((set.reps || 0) / maxReps, 1.25);
      const effortMod = set.effortValue != null ? (effortMods[set.effortValue] ?? 0) : 0;
      weightedSum += (repScore + effortMod) * w;
      weightTotal += w;
    });
    return weightTotal > 0 ? weightedSum / weightTotal : 0;
  }

  async function getPrescriptiveWeight(exercise) {
    if (!mesoState) await loadMesoState();
    const phaseInfo = getCurrentPhaseInfo();

    // Priority 1: user-entered known max (most reliable source)
    const knownMax = await Store.getKnownMax(exercise.id);
    if (knownMax > 0 && phaseInfo) {
      const pct = Math.round(phaseInfo.intensity * 100);
      prescriptionReasons[exercise.id] = `Known max · ${pct}% intensity`;
      const prescribed = roundToNearest(knownMax * phaseInfo.intensity);
      return Math.max(prescribed, exercise.seedWeight);
    }

    // Priority 2: Epley 1RM estimated from best logged set
    const est1RM = await Store.getEstimated1RM(exercise.id);
    if (est1RM > 0 && phaseInfo) {
      const pct = Math.round(phaseInfo.intensity * 100);
      prescriptionReasons[exercise.id] = `Est. 1RM ${est1RM} lb · ${pct}% intensity`;
      const prescribed = roundToNearest(est1RM * phaseInfo.intensity);
      return Math.max(prescribed, exercise.seedWeight);
    }

    // Fallback: last session + performance score + mesocycle weekly increase
    const lastSession = await Store.getLastSessionForExercise(exercise.id, currentDate);
    if (!lastSession || !lastSession.sets) {
      prescriptionReasons[exercise.id] = 'Starting weight — no prior data';
      return exercise.seedWeight;
    }

    // Exclude warm-up sets — only working sets drive progression
    const doneSets = lastSession.sets.filter(s => s.done && s.weight != null && !s.isWarmup);
    if (!doneSets.length) {
      prescriptionReasons[exercise.id] = 'Starting weight — no prior data';
      return exercise.seedWeight;
    }

    // Use highest weight lifted (top working weight), not first/lightest set
    const lastWeight = Math.max(...doneSets.map(s => s.weight));
    const prog = PROGRAM.progression[exercise.type] || PROGRAM.progression.compound;
    const weeklyInc = phaseInfo ? (phaseInfo.phase.weeklyIncrease[exercise.type] || prog.increase) : prog.increase;

    const score = computePerformanceScore(doneSets.filter(s => !s.isWarmup), exercise.repRange);

    let recommended = lastWeight;
    let reason;
    if (score >= 1.20) {
      // Crushed it — full weekly increment
      recommended = lastWeight + weeklyInc;
      reason = `Last session: crushed it (+${weeklyInc} lb)`;
    } else if (score >= 0.95) {
      // Solid — half increment, round to nearest 2.5
      const halfInc = roundToNearest(weeklyInc * 0.5);
      recommended = lastWeight + halfInc;
      reason = `Last session: solid (+${halfInc} lb)`;
    } else if (score >= 0.80) {
      // Hit targets — hold
      recommended = lastWeight;
      reason = 'Last session: on target (held)';
    } else {
      // Struggled — reduce
      recommended = Math.round(lastWeight * (1 - prog.decrease));
      reason = `Last session: struggled (−${Math.round(prog.decrease * 100)}%)`;
    }

    prescriptionReasons[exercise.id] = reason;
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

  // Smart next-set weight: factors in both reps completed AND effort.
  // Reps below the minimum always reduce weight, regardless of effort rating.
  // Reps far above target + easy effort signals the weight is clearly too light.
  function getSmartNextSetWeight(completedSet, exercise) {
    const { weight, reps, targetReps, effortValue } = completedSet;
    const [minReps] = exercise.repRange;
    const r = reps || 0;
    // Failed to hit minimum reps → too heavy, drop 10%
    if (r < minReps) {
      return roundToNearest(Math.max(weight * 0.90, 5));
    }
    // Crushed it: 3+ reps over target AND rated very easy or easy → bump 10%
    if (r >= targetReps + 3 && effortValue <= 1) {
      return roundToNearest(weight * 1.10);
    }
    // Default: effort-based adjustment
    return getEffortAdjustedWeight(weight, effortValue, exercise.type);
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
    return gen(topWeight, exercise.sets, exercise.repRange, exercise.warmups || 0);
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

    // Adjust next incomplete set's weight using reps + effort (always runs)
    const ex = getExerciseById(exerciseId);
    if (ex) {
      const sets = sessionData[exerciseId].sets;
      const nextIdx = sets.findIndex((s, i) => i > setIndex && !s.done);
      if (nextIdx !== -1) {
        const adj = getSmartNextSetWeight(set, ex);
        if (adj !== sets[nextIdx].weight) {
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

  function getPrescriptionReason(exerciseId) {
    return prescriptionReasons[exerciseId] || null;
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
    getSmartNextSetWeight,
    getRPELabel,
    getRPEClass,
    getSetsForExercise,
    getPrescriptionReason,
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
