// CLAUDEBOD - Session Logic
'use strict';

const Session = (() => {
  // In-memory session state: { [exerciseId]: { sets: [{weight, reps, done}] } }
  let currentDate = getTodayDateString();
  let sessionData = {};

  function getTodayDateString() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  // Calculate recommended weight for an exercise based on last session
  async function getRecommendedWeight(exercise) {
    const lastSession = await Store.getLastSessionForExercise(exercise.id, currentDate);

    if (!lastSession || !lastSession.sets || lastSession.sets.length === 0) {
      return exercise.seedWeight;
    }

    const doneSets = lastSession.sets.filter(s => s.done && s.reps != null);
    if (doneSets.length === 0) return exercise.seedWeight;

    const lastWeight = doneSets[0].weight || exercise.seedWeight;
    const [minReps, maxReps] = exercise.repRange;

    // Check if all sets hit top of range
    const allHitTop = doneSets.every(s => s.reps >= maxReps);
    // Check if 2+ sets failed bottom of range
    const failedCount = doneSets.filter(s => s.reps < minReps).length;

    const prog = PROGRAM.progression[exercise.type] || PROGRAM.progression.compound;

    if (allHitTop) {
      return Math.round(lastWeight + prog.increase);
    } else if (failedCount >= 2) {
      return Math.round(lastWeight * (1 - prog.decrease));
    } else {
      return lastWeight;
    }
  }

  // Get RPE label based on reps vs rep range
  function getRPELabel(reps, repRange) {
    const [min, max] = repRange;
    const r = parseInt(reps);
    if (isNaN(r)) return '';
    if (r >= max) return 'EASY';
    if (r >= min) return 'ON TARGET';
    return 'TOO HEAVY';
  }

  function getRPEClass(reps, repRange) {
    const label = getRPELabel(reps, repRange);
    if (label === 'EASY') return 'rpe-easy';
    if (label === 'ON TARGET') return 'rpe-target';
    if (label === 'TOO HEAVY') return 'rpe-heavy';
    return '';
  }

  // Load session data for today from DB
  async function loadSessionForDate(date) {
    currentDate = date;
    sessionData = {};
    const dow = new Date(date + 'T12:00:00').getDay();
    const exercises = getExercisesForDay(dow);

    for (const ex of exercises) {
      const log = await Store.getSetLog(ex.id, date);
      if (log && log.sets) {
        sessionData[ex.id] = { sets: log.sets };
      }
    }
  }

  // Get sets for an exercise (from memory or initialize)
  async function getSetsForExercise(exercise, date) {
    if (sessionData[exercise.id]) {
      return sessionData[exercise.id].sets;
    }

    // Initialize with recommended weight
    const recWeight = await getRecommendedWeight(exercise);
    const sets = Array.from({ length: exercise.sets }, () => ({
      weight: recWeight,
      reps: null,
      done: false
    }));
    sessionData[exercise.id] = { sets };
    return sets;
  }

  // Update a specific set
  async function updateSet(exerciseId, setIndex, field, value) {
    if (!sessionData[exerciseId]) return;
    sessionData[exerciseId].sets[setIndex][field] = value;

    // Persist to DB
    const dow = new Date(currentDate + 'T12:00:00').getDay();
    await Store.saveSetLog(exerciseId, dow, currentDate, sessionData[exerciseId].sets);
  }

  // Mark a set as done
  async function completeSet(exerciseId, setIndex) {
    if (!sessionData[exerciseId]) return;
    const set = sessionData[exerciseId].sets[setIndex];
    set.done = true;

    const dow = new Date(currentDate + 'T12:00:00').getDay();
    await Store.saveSetLog(exerciseId, dow, currentDate, sessionData[exerciseId].sets);
  }

  // Unmark a set as done
  async function uncompleteSet(exerciseId, setIndex) {
    if (!sessionData[exerciseId]) return;
    sessionData[exerciseId].sets[setIndex].done = false;

    const dow = new Date(currentDate + 'T12:00:00').getDay();
    await Store.saveSetLog(exerciseId, dow, currentDate, sessionData[exerciseId].sets);
  }

  // Get completion count for an exercise
  function getCompletionCount(exerciseId) {
    const data = sessionData[exerciseId];
    if (!data) return { done: 0, total: 0 };
    const done = data.sets.filter(s => s.done).length;
    return { done, total: data.sets.length };
  }

  return {
    getTodayDateString,
    getRecommendedWeight,
    getRPELabel,
    getRPEClass,
    loadSessionForDate,
    getSetsForExercise,
    updateSet,
    completeSet,
    uncompleteSet,
    getCompletionCount,
    get currentDate() { return currentDate; },
    get sessionData() { return sessionData; },
  };
})();
