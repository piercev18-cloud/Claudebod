// CLAUDEBOD - IndexedDB Store v2
'use strict';

const DB_NAME = 'claudebod';
const DB_VERSION = 2;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;

      // ── sessions ──────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains('sessions')) {
        const s = database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        s.createIndex('byDate', 'date');
        s.createIndex('byExercise', 'exerciseId');
        s.createIndex('byDateExercise', ['date', 'exerciseId']);
      }

      // ── bodyweight ─────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains('bodyweight')) {
        const b = database.createObjectStore('bodyweight', { keyPath: 'id', autoIncrement: true });
        b.createIndex('byDate', 'date', { unique: true });
      }

      // ── settings ───────────────────────────────────────────────────────────
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // ── effort_ratings (NEW v2) ────────────────────────────────────────────
      // { id, date, exerciseId, setIndex, effortValue, weight, reps }
      if (!database.objectStoreNames.contains('effort_ratings')) {
        const ef = database.createObjectStore('effort_ratings', { keyPath: 'id', autoIncrement: true });
        ef.createIndex('byExercise', 'exerciseId');
        ef.createIndex('byDate', 'date');
        ef.createIndex('byDateExercise', ['date', 'exerciseId']);
      }

      // ── exercise_swaps (NEW v2) ────────────────────────────────────────────
      // { exerciseId, swappedTo, date } — active swaps for today's session
      if (!database.objectStoreNames.contains('exercise_swaps')) {
        const sw = database.createObjectStore('exercise_swaps', { keyPath: 'exerciseId' });
        sw.createIndex('byDate', 'date');
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror  = (e) => reject(e.target.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function req2p(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

async function saveSetLog(exerciseId, dow, date, sets) {
  await openDB();
  const store = tx('sessions', 'readwrite');
  const existing = await req2p(store.index('byDateExercise').get([date, exerciseId]));
  if (existing) {
    existing.sets = sets;
    return req2p(store.put(existing));
  }
  return req2p(store.add({ date, dow, exerciseId, sets }));
}

async function getSetLog(exerciseId, date) {
  await openDB();
  return req2p(tx('sessions').index('byDateExercise').get([date, exerciseId]));
}

async function getAllLogsForExercise(exerciseId) {
  await openDB();
  const all = await req2p(tx('sessions').index('byExercise').getAll(exerciseId));
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

async function getLastSessionForExercise(exerciseId, beforeDate) {
  const all = await getAllLogsForExercise(exerciseId);
  return all.find(s => s.date < beforeDate && s.sets && s.sets.some(set => set.done)) || null;
}

async function getAllSessionsByDate() {
  await openDB();
  const all = await req2p(tx('sessions').getAll());
  const grouped = {};
  for (const entry of all) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }
  return grouped;
}

// ── 1RM Estimation ────────────────────────────────────────────────────────────

async function getBestLoggedSet(exerciseId) {
  const all = await getAllLogsForExercise(exerciseId);
  let best = null;
  for (const session of all) {
    if (!session.sets) continue;
    for (const set of session.sets) {
      if (!set.done || !set.weight || !set.reps) continue;
      const est1rm = epley1RM(set.weight, set.reps);
      if (!best || est1rm > epley1RM(best.weight, best.reps)) {
        best = { weight: set.weight, reps: set.reps, date: session.date, est1rm };
      }
    }
  }
  return best;
}

async function getBestWeightForExercise(exerciseId) {
  const best = await getBestLoggedSet(exerciseId);
  return best ? best.weight : 0;
}

async function getEstimated1RM(exerciseId) {
  const best = await getBestLoggedSet(exerciseId);
  return best ? best.est1rm : 0;
}

// ── Effort Ratings ────────────────────────────────────────────────────────────

async function saveEffortRating(exerciseId, date, setIndex, effortValue, weight, reps) {
  await openDB();
  const store = tx('effort_ratings', 'readwrite');
  // Upsert: check for existing
  const all = await req2p(store.index('byDateExercise').getAll([date, exerciseId]));
  const existing = all.find(r => r.setIndex === setIndex);
  if (existing) {
    existing.effortValue = effortValue; existing.weight = weight; existing.reps = reps;
    return req2p(store.put(existing));
  }
  return req2p(store.add({ date, exerciseId, setIndex, effortValue, weight, reps }));
}

async function getEffortRatingsForSession(exerciseId, date) {
  await openDB();
  return req2p(tx('effort_ratings').index('byDateExercise').getAll([date, exerciseId]));
}

// Get average effort value for last N sessions of an exercise
async function getAvgRecentEffort(exerciseId, sessions = 3) {
  await openDB();
  const all = await req2p(tx('effort_ratings').index('byExercise').getAll(exerciseId));
  if (!all.length) return 2; // default average
  // Group by date
  const byDate = {};
  for (const r of all) {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r.effortValue);
  }
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, sessions);
  const values = dates.flatMap(d => byDate[d]);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ── Exercise Swaps ────────────────────────────────────────────────────────────

async function getActiveSwap(exerciseId) {
  await openDB();
  const record = await req2p(tx('exercise_swaps').get(exerciseId));
  return record || null;
}

async function setActiveSwap(exerciseId, swappedToName, date) {
  await openDB();
  return req2p(tx('exercise_swaps', 'readwrite').put({ exerciseId, swappedToName, date }));
}

async function clearActiveSwap(exerciseId) {
  await openDB();
  return req2p(tx('exercise_swaps', 'readwrite').delete(exerciseId));
}

// ── Exercise Rotation ─────────────────────────────────────────────────────────

async function getExerciseWeeksCount(exerciseId) {
  // Count distinct weeks we've logged this exercise
  const all = await getAllLogsForExercise(exerciseId);
  const weeks = new Set();
  for (const s of all) {
    if (!s.sets || !s.sets.some(set => set.done)) continue;
    const d = new Date(s.date + 'T12:00:00');
    const week = `${d.getFullYear()}-W${String(Math.floor((d - new Date(d.getFullYear(), 0, 1)) / 604800000) + 1).padStart(2,'0')}`;
    weeks.add(week);
  }
  return weeks.size;
}

// ── Bodyweight ────────────────────────────────────────────────────────────────

async function saveBodyweight(date, weight) {
  await openDB();
  const store = tx('bodyweight', 'readwrite');
  const existing = await req2p(store.index('byDate').get(date));
  if (existing) { existing.weight = weight; return req2p(store.put(existing)); }
  return req2p(store.add({ date, weight }));
}

async function getBodyweightEntries(limit = 30) {
  await openDB();
  const all = await req2p(tx('bodyweight').getAll());
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSetting(key, defaultValue = null) {
  await openDB();
  const result = await req2p(tx('settings').get(key));
  return result ? result.value : defaultValue;
}

async function setSetting(key, value) {
  await openDB();
  return req2p(tx('settings', 'readwrite').put({ key, value }));
}

// ── Mesocycle State ───────────────────────────────────────────────────────────
// Stored in settings as key 'mesocycle_state'
// { mesoIndex: 0, weekNumber: 1, startDate: 'YYYY-MM-DD' }

async function getMesocycleState() {
  const saved = await getSetting('mesocycle_state');
  if (saved) return saved;
  // Default: start of Foundation Block week 1
  return { mesoIndex: 0, weekNumber: 1, startDate: getTodayString() };
}

async function setMesocycleState(state) {
  return setSetting('mesocycle_state', state);
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

// ── Known Maxes ───────────────────────────────────────────────────────────────
// User-entered 1RM for key lifts — used as primary prescription source.

async function setKnownMax(exerciseId, weight) {
  const maxes = (await getSetting('known_maxes', null)) || {};
  if (weight > 0) maxes[exerciseId] = weight;
  else delete maxes[exerciseId];
  return setSetting('known_maxes', maxes);
}

async function getKnownMax(exerciseId) {
  const maxes = (await getSetting('known_maxes', null)) || {};
  return maxes[exerciseId] || 0;
}

async function getAllKnownMaxes() {
  return (await getSetting('known_maxes', null)) || {};
}

// ── RPE-Adjusted 1RM ──────────────────────────────────────────────────────────
// Uses effort rating to estimate reps in reserve, then computes a truer 1RM.
// RIR per effort value: Very Easy=5, Easy=3, Average=2, Hard=1, Max=0, Fail=null
const EFFORT_RIR = [5, 3, 2, 1, 0, null];

async function getBestRPEAdjusted1RM(exerciseId) {
  const all = await getAllLogsForExercise(exerciseId);
  let best = null;
  for (const session of all) {
    if (!session.sets) continue;
    for (const set of session.sets) {
      if (!set.done || !set.weight || !set.reps || set.effortValue == null) continue;
      const rir = EFFORT_RIR[set.effortValue];
      if (rir === null) continue; // failed set
      const effectiveReps = set.reps + rir;
      const adj1RM = epley1RM(set.weight, effectiveReps);
      if (!best || adj1RM > best.adj1RM) {
        best = {
          weight: set.weight, reps: set.reps, effortValue: set.effortValue,
          rir, effectiveReps, adj1RM, date: session.date,
        };
      }
    }
  }
  return best;
}

// ── Export ────────────────────────────────────────────────────────────────────
const Store = {
  open: openDB,
  // Sessions
  saveSetLog, getSetLog, getAllLogsForExercise, getLastSessionForExercise, getAllSessionsByDate,
  // 1RM
  getBestLoggedSet, getBestWeightForExercise, getEstimated1RM,
  // Effort
  saveEffortRating, getEffortRatingsForSession, getAvgRecentEffort,
  // Swaps
  getActiveSwap, setActiveSwap, clearActiveSwap,
  // Rotation
  getExerciseWeeksCount,
  // Bodyweight
  saveBodyweight, getBodyweightEntries,
  // Settings
  getSetting, setSetting,
  // Mesocycle
  getMesocycleState, setMesocycleState,
  // Known maxes
  setKnownMax, getKnownMax, getAllKnownMaxes,
  // RPE-adjusted 1RM
  getBestRPEAdjusted1RM,
};
