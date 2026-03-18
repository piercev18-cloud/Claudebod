// CLAUDEBOD - XP & Achievement Engine
'use strict';

// ── XP Award Table ────────────────────────────────────────────────────────────
// Points are weighted by difficulty, compound > isolation, heavier = more XP
const XP = {
  // Per-set completion
  setComplete:       10,
  // Bonus per rep performed
  perRep:             2,
  // Weight multiplier: XP += floor(weight / 25)
  weightDivisor:     25,
  // Exercise type multipliers
  typeMult: { compound: 1.5, oly: 2.0, isolation: 1.0 },
  // Effort bonuses
  effortBonus: { 0: 0, 1: 2, 2: 5, 3: 10, 4: 15, 5: 5 }, // Hard/Max rewarded most, Fail still gets some
  // Milestones
  allSetsComplete:   25,   // All sets of an exercise done
  workoutComplete:  100,   // Entire day's exercises all done
  prBonus:           50,   // New personal record weight
  // Bodyweight log
  bwLog:             10,
  // Streak (consecutive training days)
  streakPerDay:      15,

  // ── Levels ──────────────────────────────────────────────────────────────────
  // XP needed = baseXP * level^1.5 (escalating curve)
  baseXP: 100,

  xpForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(this.baseXP * Math.pow(level - 1, 1.5));
  },

  // Total XP needed to reach a given level (cumulative)
  totalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i <= level; i++) total += this.xpForLevel(i);
    return total;
  },

  // Get level from total XP
  levelFromXP(totalXP) {
    let level = 1;
    let cumulative = 0;
    while (true) {
      const needed = this.xpForLevel(level + 1);
      if (cumulative + needed > totalXP) break;
      cumulative += needed;
      level++;
    }
    return { level, currentXP: totalXP - cumulative, neededXP: this.xpForLevel(level + 1) };
  },

  // ── Calculate XP for a completed set ────────────────────────────────────────
  calcSetXP(weight, reps, exerciseType, effortValue) {
    let xp = this.setComplete;
    xp += reps * this.perRep;
    xp += Math.floor((weight || 0) / this.weightDivisor);
    xp = Math.floor(xp * (this.typeMult[exerciseType] || 1.0));
    xp += this.effortBonus[effortValue] || 0;
    return xp;
  },
};

// ── Achievements ──────────────────────────────────────────────────────────────
const ACHIEVEMENTS = [
  // Workout milestones
  { id: 'first_set',       name: 'FIRST REP',          desc: 'Complete your first set',               icon: '⚔️',  check: s => s.totalSets >= 1 },
  { id: 'ten_sets',        name: 'WARMED UP',           desc: 'Complete 10 total sets',                icon: '🔥',  check: s => s.totalSets >= 10 },
  { id: 'fifty_sets',      name: 'GRINDER',             desc: 'Complete 50 total sets',                icon: '⚙️',  check: s => s.totalSets >= 50 },
  { id: 'hundred_sets',    name: 'CENTURION',           desc: 'Complete 100 total sets',               icon: '🏛️',  check: s => s.totalSets >= 100 },
  { id: 'five_hundred_sets', name: 'IRON WILL',         desc: 'Complete 500 total sets',               icon: '🗡️',  check: s => s.totalSets >= 500 },
  { id: 'thousand_sets',   name: 'LEGEND',              desc: 'Complete 1,000 total sets',             icon: '👑',  check: s => s.totalSets >= 1000 },

  // Workout completions
  { id: 'first_workout',   name: 'DAY ONE',             desc: 'Complete a full workout',               icon: '🎮',  check: s => s.workoutsComplete >= 1 },
  { id: 'ten_workouts',    name: 'COMMITTED',           desc: 'Complete 10 full workouts',             icon: '📟',  check: s => s.workoutsComplete >= 10 },
  { id: 'fifty_workouts',  name: 'DISCIPLINED',         desc: 'Complete 50 full workouts',             icon: '🕹️',  check: s => s.workoutsComplete >= 50 },

  // Volume
  { id: 'ton_club',        name: 'TON CLUB',            desc: 'Lift 2,000+ lb total in one session',   icon: '🏋️', check: s => s.maxSessionVolume >= 2000 },
  { id: 'five_ton',        name: '5-TON TITAN',         desc: 'Lift 10,000+ lb total in one session',  icon: '💪',  check: s => s.maxSessionVolume >= 10000 },
  { id: 'ten_ton',         name: '10-TON MONSTER',      desc: 'Lift 20,000+ lb total in one session',  icon: '🐉',  check: s => s.maxSessionVolume >= 20000 },

  // Weight PRs
  { id: 'first_pr',        name: 'NEW HIGH SCORE',      desc: 'Set your first PR',                     icon: '⭐',  check: s => s.totalPRs >= 1 },
  { id: 'ten_prs',         name: 'PR MACHINE',          desc: 'Set 10 personal records',               icon: '🌟',  check: s => s.totalPRs >= 10 },

  // Specific weight thresholds
  { id: 'squat_225',       name: '2-PLATE SQUAT',       desc: 'Back Squat 225 lb',                     icon: '🦵',  check: s => (s.liftPRs.back_squat || 0) >= 225 },
  { id: 'squat_315',       name: '3-PLATE SQUAT',       desc: 'Back Squat 315 lb',                     icon: '🔱',  check: s => (s.liftPRs.back_squat || 0) >= 315 },
  { id: 'bench_185',       name: 'BENCH BADGE',         desc: 'Bench Press 185 lb',                    icon: '🎖️',  check: s => (s.liftPRs.barbell_bench_press || 0) >= 185 },
  { id: 'bench_225',       name: '2-PLATE BENCH',       desc: 'Bench Press 225 lb',                    icon: '🏆',  check: s => (s.liftPRs.barbell_bench_press || 0) >= 225 },
  { id: 'clean_135',       name: 'CLEAN MACHINE',       desc: 'Power Clean 135 lb',                    icon: '⚡',  check: s => (s.liftPRs.power_clean || 0) >= 135 },
  { id: 'clean_185',       name: 'CLEAN & MEAN',        desc: 'Power Clean 185 lb',                    icon: '💥',  check: s => (s.liftPRs.power_clean || 0) >= 185 },
  { id: 'snatch_135',      name: 'SNATCH CITY',         desc: 'Hang Power Snatch 135 lb',              icon: '🚀',  check: s => (s.liftPRs.hang_power_snatch || 0) >= 135 },

  // Streaks
  { id: 'streak_3',        name: '3-DAY STREAK',        desc: 'Train 3 days in a row',                 icon: '🔗',  check: s => s.maxStreak >= 3 },
  { id: 'streak_7',        name: 'FULL WEEK',           desc: 'Train 5+ days in one week',             icon: '📅',  check: s => s.maxStreak >= 5 },
  { id: 'streak_14',       name: 'TWO-WEEK WARRIOR',    desc: 'Train 10+ days in two weeks',           icon: '⚔️',  check: s => s.maxStreak >= 10 },

  // XP levels
  { id: 'level_5',         name: 'LEVEL 5',             desc: 'Reach Level 5',                          icon: '🎯',  check: s => s.level >= 5 },
  { id: 'level_10',        name: 'DOUBLE DIGITS',       desc: 'Reach Level 10',                         icon: '🏅',  check: s => s.level >= 10 },
  { id: 'level_25',        name: 'ELITE',               desc: 'Reach Level 25',                         icon: '💎',  check: s => s.level >= 25 },
  { id: 'level_50',        name: 'PRESTIGE',            desc: 'Reach Level 50',                         icon: '🌈',  check: s => s.level >= 50 },

  // Bodyweight
  { id: 'bw_logged',       name: 'SCALE WARRIOR',       desc: 'Log bodyweight 10 times',                icon: '⚖️',  check: s => s.bwEntries >= 10 },
  { id: 'bw_30',           name: 'CONSISTENT',          desc: 'Log bodyweight 30 times',                icon: '📊',  check: s => s.bwEntries >= 30 },

  // Effort
  { id: 'max_effort_10',   name: 'NO PAIN NO GAIN',     desc: 'Log 10 max effort sets',                 icon: '🔥',  check: s => s.maxEffortSets >= 10 },
  { id: 'oly_session',     name: 'OLY LIFTER',          desc: 'Complete all Oly lifts on Saturday',     icon: '🏋️', check: s => s.olySessions >= 1 },
];

// ── XP State Manager ──────────────────────────────────────────────────────────
const XPEngine = (() => {
  // state: { totalXP, totalSets, workoutsComplete, totalPRs, maxSessionVolume,
  //          maxStreak, currentStreak, lastTrainDate, bwEntries, maxEffortSets,
  //          olySessions, liftPRs: {}, unlockedAchievements: [] }

  let state = null;

  async function load() {
    state = await Store.getSetting('xp_state');
    if (!state) {
      state = {
        totalXP: 0, totalSets: 0, workoutsComplete: 0, totalPRs: 0,
        maxSessionVolume: 0, maxStreak: 0, currentStreak: 0,
        lastTrainDate: null, bwEntries: 0, maxEffortSets: 0,
        olySessions: 0, liftPRs: {}, unlockedAchievements: [],
      };
    }
    return state;
  }

  async function save() {
    await Store.setSetting('xp_state', state);
  }

  function getState() { return state; }

  function getLevelInfo() {
    if (!state) return { level: 1, currentXP: 0, neededXP: 100 };
    return XP.levelFromXP(state.totalXP);
  }

  // Award XP and return the amount awarded
  async function awardSetXP(weight, reps, exerciseType, effortValue) {
    if (!state) await load();
    const xp = XP.calcSetXP(weight, reps, exerciseType, effortValue);
    state.totalXP += xp;
    state.totalSets++;
    if (effortValue === 4) state.maxEffortSets++;
    await save();
    return xp;
  }

  async function awardBonusXP(amount, reason) {
    if (!state) await load();
    state.totalXP += amount;
    await save();
    return amount;
  }

  async function recordWorkoutComplete() {
    if (!state) await load();
    state.workoutsComplete++;
    state.totalXP += XP.workoutComplete;

    // Streak tracking
    const today = new Date().toISOString().split('T')[0];
    if (state.lastTrainDate) {
      const last = new Date(state.lastTrainDate + 'T12:00:00');
      const now  = new Date(today + 'T12:00:00');
      const diff = Math.round((now - last) / 86400000);
      if (diff === 1) {
        state.currentStreak++;
      } else if (diff > 1) {
        state.currentStreak = 1;
      }
    } else {
      state.currentStreak = 1;
    }
    state.maxStreak = Math.max(state.maxStreak, state.currentStreak);
    state.totalXP += state.currentStreak * XP.streakPerDay;
    state.lastTrainDate = today;
    await save();
  }

  async function recordSessionVolume(volume) {
    if (!state) await load();
    state.maxSessionVolume = Math.max(state.maxSessionVolume, volume);
    await save();
  }

  async function recordPR(exerciseId, weight) {
    if (!state) await load();
    const prev = state.liftPRs[exerciseId] || 0;
    if (weight > prev) {
      state.liftPRs[exerciseId] = weight;
      state.totalPRs++;
      state.totalXP += XP.prBonus;
      await save();
      return true; // New PR
    }
    return false;
  }

  async function recordBWLog() {
    if (!state) await load();
    state.bwEntries++;
    state.totalXP += XP.bwLog;
    await save();
  }

  async function recordOlySession() {
    if (!state) await load();
    state.olySessions++;
    await save();
  }

  // Check all achievements and return newly unlocked ones
  async function checkAchievements() {
    if (!state) await load();
    const info = getLevelInfo();
    const checkState = { ...state, level: info.level };
    const newlyUnlocked = [];

    for (const ach of ACHIEVEMENTS) {
      if (state.unlockedAchievements.includes(ach.id)) continue;
      if (ach.check(checkState)) {
        state.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach);
      }
    }

    if (newlyUnlocked.length > 0) await save();
    return newlyUnlocked;
  }

  function isUnlocked(achievementId) {
    return state && state.unlockedAchievements.includes(achievementId);
  }

  return {
    load, save, getState, getLevelInfo,
    awardSetXP, awardBonusXP,
    recordWorkoutComplete, recordSessionVolume, recordPR, recordBWLog, recordOlySession,
    checkAchievements, isUnlocked,
  };
})();
