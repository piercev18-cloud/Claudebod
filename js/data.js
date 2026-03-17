// CLAUDEBOD - Program Data
'use strict';

const PROGRAM = {
  days: {
    0: { name: 'Sunday', type: 'rest', accent: '#444' },
    1: {
      name: 'Monday',
      label: 'Upper Hypertrophy',
      accent: '#C8F55A',
      type: 'training',
      exercises: [
        { id: 'incline_db_press', name: 'Incline DB Press', sets: 4, repRange: [10, 12], seedWeight: 65, type: 'compound' },
        { id: 'cable_row_wide', name: 'Cable Row Wide', sets: 4, repRange: [10, 12], seedWeight: 120, type: 'compound' },
        { id: 'overhead_press_db', name: 'Overhead Press DB', sets: 3, repRange: [12, 15], seedWeight: 50, type: 'compound' },
        { id: 'lat_pulldown', name: 'Lat Pulldown', sets: 3, repRange: [12, 15], seedWeight: 130, type: 'compound' },
        { id: 'cable_lateral_raises', name: 'Cable Lateral Raises', sets: 4, repRange: [15, 20], seedWeight: 15, type: 'isolation' },
        { id: 'incline_curl', name: 'Incline Curl', sets: 3, repRange: [12, 15], seedWeight: 30, type: 'isolation' },
        { id: 'oh_tricep_ext_cable', name: 'OH Tricep Ext Cable', sets: 3, repRange: [12, 15], seedWeight: 70, type: 'isolation' },
      ]
    },
    2: {
      name: 'Tuesday',
      label: 'Lower Strength + Snatch Skill',
      accent: '#5AF5C8',
      type: 'training',
      exercises: [
        { id: 'back_squat', name: 'Back Squat', sets: 4, repRange: [4, 6], seedWeight: 225, type: 'compound' },
        { id: 'romanian_deadlift', name: 'Romanian Deadlift', sets: 3, repRange: [6, 8], seedWeight: 185, type: 'compound' },
        { id: 'leg_press', name: 'Leg Press', sets: 3, repRange: [10, 12], seedWeight: 360, type: 'compound' },
        { id: 'snatch_pull', name: 'Snatch Pull', sets: 4, repRange: [4, 4], seedWeight: 155, type: 'oly' },
        { id: 'hang_power_snatch', name: 'Hang Power Snatch', sets: 4, repRange: [3, 3], seedWeight: 115, type: 'oly' },
        { id: 'leg_curl', name: 'Leg Curl', sets: 3, repRange: [12, 15], seedWeight: 80, type: 'isolation' },
        { id: 'calf_raise', name: 'Calf Raise', sets: 4, repRange: [15, 20], seedWeight: 180, type: 'isolation' },
      ]
    },
    3: { name: 'Wednesday', type: 'rest', accent: '#555' },
    4: {
      name: 'Thursday',
      label: 'Upper Strength',
      accent: '#F5A55A',
      type: 'training',
      exercises: [
        { id: 'barbell_bench_press', name: 'Barbell Bench Press', sets: 4, repRange: [4, 6], seedWeight: 185, type: 'compound' },
        { id: 'pendlay_row', name: 'Pendlay Row', sets: 4, repRange: [4, 6], seedWeight: 165, type: 'compound' },
        { id: 'seated_db_shoulder_press', name: 'Seated DB Shoulder Press', sets: 3, repRange: [6, 8], seedWeight: 60, type: 'compound' },
        { id: 'weighted_pull_up', name: 'Weighted Pull-Up', sets: 3, repRange: [5, 7], seedWeight: 25, type: 'compound' },
        { id: 'face_pulls', name: 'Face Pulls', sets: 3, repRange: [15, 20], seedWeight: 40, type: 'isolation' },
        { id: 'ez_bar_curl', name: 'EZ Bar Curl', sets: 3, repRange: [8, 10], seedWeight: 75, type: 'isolation' },
        { id: 'tricep_pushdown', name: 'Tricep Pushdown', sets: 3, repRange: [10, 12], seedWeight: 55, type: 'isolation' },
      ]
    },
    5: {
      name: 'Friday',
      label: 'Lower Hypertrophy + C&J Power',
      accent: '#F55A9A',
      type: 'training',
      exercises: [
        { id: 'front_squat', name: 'Front Squat', sets: 4, repRange: [6, 8], seedWeight: 175, type: 'compound' },
        { id: 'power_clean', name: 'Power Clean', sets: 5, repRange: [3, 3], seedWeight: 165, type: 'oly' },
        { id: 'push_press', name: 'Push Press', sets: 4, repRange: [4, 4], seedWeight: 145, type: 'oly' },
        { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', sets: 3, repRange: [10, 12], seedWeight: 50, type: 'compound' },
        { id: 'leg_extension', name: 'Leg Extension', sets: 3, repRange: [15, 20], seedWeight: 90, type: 'isolation' },
        { id: 'nordic_curl', name: 'Nordic Curl', sets: 3, repRange: [8, 10], seedWeight: 75, type: 'isolation' },
        { id: 'seated_calf_raise', name: 'Seated Calf Raise', sets: 4, repRange: [15, 20], seedWeight: 90, type: 'isolation' },
      ]
    },
    6: {
      name: 'Saturday',
      label: 'Full Oly',
      accent: '#A55AF5',
      type: 'training',
      exercises: [
        { id: 'snatch_or_cj', name: 'Snatch OR Clean & Jerk', sets: 6, repRange: [2, 3], seedWeight: 145, type: 'oly' },
        { id: 'snatch_balance_jerk_blocks', name: 'Snatch Balance / Jerk Blocks', sets: 3, repRange: [3, 3], seedWeight: 125, type: 'oly' },
        { id: 'clean_pull_snatch_pull', name: 'Clean Pull / Snatch Pull', sets: 3, repRange: [4, 4], seedWeight: 195, type: 'oly' },
        { id: 'back_squat_sat', name: 'Back Squat', sets: 3, repRange: [5, 5], seedWeight: 195, type: 'compound' },
      ]
    },
  },

  // Key lifts for progress tracking
  keyLifts: [
    { id: 'back_squat', name: 'Back Squat' },
    { id: 'barbell_bench_press', name: 'Bench Press' },
    { id: 'romanian_deadlift', name: 'RDL' },
    { id: 'front_squat', name: 'Front Squat' },
    { id: 'power_clean', name: 'Power Clean' },
    { id: 'hang_power_snatch', name: 'Hang Power Snatch' },
    { id: 'push_press', name: 'Push Press' },
  ],

  nutrition: {
    calories: 2950,
    protein: 210,
    carbs: 290,
    fatMin: 95,
    fatMax: 100,
  },

  // Rest timer defaults in seconds
  restTime: {
    compound: 180,
    oly: 180,
    isolation: 90,
  },

  // Weight progression rules
  progression: {
    compound: { increase: 10, decrease: 0.05 },
    oly: { increase: 10, decrease: 0.05 },
    isolation: { increase: 5, decrease: 0.05 },
  }
};

// Get today's day data
function getTodayDay() {
  const dow = new Date().getDay();
  return { dow, day: PROGRAM.days[dow] };
}

// Get exercise by ID (search all days)
function getExerciseById(id) {
  for (const dow in PROGRAM.days) {
    const day = PROGRAM.days[dow];
    if (day.exercises) {
      const ex = day.exercises.find(e => e.id === id);
      if (ex) return ex;
    }
  }
  return null;
}

// Get all exercise IDs for a given day of week
function getExercisesForDay(dow) {
  const day = PROGRAM.days[dow];
  return day && day.exercises ? day.exercises : [];
}
