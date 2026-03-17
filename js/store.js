// CLAUDEBOD - IndexedDB Store
'use strict';

const DB_NAME = 'claudebod';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;

      // Sessions store: { id, date, dow, exerciseId, sets: [{weight, reps, done}] }
      if (!database.objectStoreNames.contains('sessions')) {
        const sessStore = database.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
        sessStore.createIndex('byDate', 'date');
        sessStore.createIndex('byExercise', 'exerciseId');
        sessStore.createIndex('byDateExercise', ['date', 'exerciseId']);
      }

      // Bodyweight store: { id, date, weight }
      if (!database.objectStoreNames.contains('bodyweight')) {
        const bwStore = database.createObjectStore('bodyweight', { keyPath: 'id', autoIncrement: true });
        bwStore.createIndex('byDate', 'date', { unique: true });
      }

      // Settings store: { key, value }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

// Generic helpers
function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// Save a set log entry for a given session date + exercise
async function saveSetLog(exerciseId, dow, date, sets) {
  await openDB();
  const store = tx('sessions', 'readwrite');

  // Find existing record for this date+exercise
  const index = store.index('byDateExercise');
  const existing = await promisifyRequest(index.get([date, exerciseId]));

  if (existing) {
    existing.sets = sets;
    return promisifyRequest(store.put(existing));
  } else {
    return promisifyRequest(store.add({ date, dow, exerciseId, sets }));
  }
}

// Get all set logs for a specific exercise on a specific date
async function getSetLog(exerciseId, date) {
  await openDB();
  const store = tx('sessions');
  const index = store.index('byDateExercise');
  return promisifyRequest(index.get([date, exerciseId]));
}

// Get all set logs for a specific exercise (all time), most recent first
async function getAllLogsForExercise(exerciseId) {
  await openDB();
  const store = tx('sessions');
  const index = store.index('byExercise');
  const results = await promisifyRequest(index.getAll(exerciseId));
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

// Get last completed session log for an exercise (before today)
async function getLastSessionForExercise(exerciseId, beforeDate) {
  await openDB();
  const all = await getAllLogsForExercise(exerciseId);
  return all.find(s => s.date < beforeDate && s.sets && s.sets.some(set => set.done)) || null;
}

// Get all sessions grouped by date, for history view
async function getAllSessionsByDate() {
  await openDB();
  const store = tx('sessions');
  const all = await promisifyRequest(store.getAll());

  const grouped = {};
  for (const entry of all) {
    if (!grouped[entry.date]) grouped[entry.date] = [];
    grouped[entry.date].push(entry);
  }
  return grouped;
}

// Get best weight for a given exercise across all sessions
async function getBestWeightForExercise(exerciseId) {
  await openDB();
  const all = await getAllLogsForExercise(exerciseId);
  let best = 0;
  for (const session of all) {
    if (!session.sets) continue;
    for (const set of session.sets) {
      if (set.done && set.weight > best) best = set.weight;
    }
  }
  return best;
}

// ── Bodyweight ────────────────────────────────────────────────────────────────

async function saveBodyweight(date, weight) {
  await openDB();
  const store = tx('bodyweight', 'readwrite');
  const index = store.index('byDate');
  const existing = await promisifyRequest(index.get(date));

  if (existing) {
    existing.weight = weight;
    return promisifyRequest(store.put(existing));
  } else {
    return promisifyRequest(store.add({ date, weight }));
  }
}

async function getBodyweightEntries(limit = 30) {
  await openDB();
  const store = tx('bodyweight');
  const all = await promisifyRequest(store.getAll());
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── Settings ──────────────────────────────────────────────────────────────────

async function getSetting(key, defaultValue = null) {
  await openDB();
  const store = tx('settings');
  const result = await promisifyRequest(store.get(key));
  return result ? result.value : defaultValue;
}

async function setSetting(key, value) {
  await openDB();
  const store = tx('settings', 'readwrite');
  return promisifyRequest(store.put({ key, value }));
}

// Export
const Store = {
  open: openDB,
  saveSetLog,
  getSetLog,
  getAllLogsForExercise,
  getLastSessionForExercise,
  getAllSessionsByDate,
  getBestWeightForExercise,
  saveBodyweight,
  getBodyweightEntries,
  getSetting,
  setSetting,
};
