// CLAUDEBOD - Program Data v2
'use strict';

// ── Effort Levels ─────────────────────────────────────────────────────────────
const EFFORT_LEVELS = [
  { value: 0, label: 'VERY EASY', short: '💤', nextSetAdj: +0.10, color: '#5AF5C8', note: 'Way too light — significant jump needed' },
  { value: 1, label: 'EASY',      short: '😊', nextSetAdj: +0.05, color: '#C8F55A', note: 'More in the tank — bump it up' },
  { value: 2, label: 'AVERAGE',   short: '😐', nextSetAdj:  0.00, color: '#F5C85A', note: 'Right on target' },
  { value: 3, label: 'HARD',      short: '😤', nextSetAdj:  0.00, color: '#F5A55A', note: 'Challenging but controlled' },
  { value: 4, label: 'MAX',       short: '🔥', nextSetAdj: -0.05, color: '#F55A5A', note: 'Near limit — back off next set' },
  { value: 5, label: 'FAIL',      short: '❌', nextSetAdj: -0.10, color: '#AA2222', note: 'Too heavy — reduce load' },
];

// ── Mesocycles ────────────────────────────────────────────────────────────────
const MESOCYCLES = [
  {
    index: 0,
    name: 'Foundation Block',
    description: 'Build work capacity and lock in technique.',
    phases: [
      { name: 'Accumulation',   weeks: 4, intensity: [0.65, 0.75], rpeTarget: '6–7 RPE', volMult: 1.00, weeklyIncrease: { compound: 5,  isolation: 2.5, oly: 5  } },
      { name: 'Intensification',weeks: 3, intensity: [0.75, 0.85], rpeTarget: '7–8 RPE', volMult: 0.85, weeklyIncrease: { compound: 7.5,isolation: 5,   oly: 7.5} },
      { name: 'Realization',    weeks: 2, intensity: [0.85, 0.92], rpeTarget: '8–9 RPE', volMult: 0.70, weeklyIncrease: { compound: 2.5,isolation: 2.5, oly: 2.5} },
      { name: 'Deload',         weeks: 1, intensity: [0.50, 0.60], rpeTarget: '4–5 RPE', volMult: 0.50, weeklyIncrease: { compound: 0,  isolation: 0,   oly: 0  } },
    ]
  },
  {
    index: 1,
    name: 'Strength Block',
    description: 'Maximize strength expression across all lifts.',
    phases: [
      { name: 'Volume',     weeks: 3, intensity: [0.70, 0.78], rpeTarget: '6–7 RPE', volMult: 1.10, weeklyIncrease: { compound: 10, isolation: 5,   oly: 10 } },
      { name: 'Intensity',  weeks: 3, intensity: [0.80, 0.88], rpeTarget: '7–8 RPE', volMult: 0.80, weeklyIncrease: { compound: 10, isolation: 5,   oly: 10 } },
      { name: 'Peak',       weeks: 1, intensity: [0.88, 0.95], rpeTarget: '9 RPE',   volMult: 0.60, weeklyIncrease: { compound: 5,  isolation: 2.5, oly: 5  } },
      { name: 'Deload',     weeks: 1, intensity: [0.50, 0.60], rpeTarget: '4–5 RPE', volMult: 0.50, weeklyIncrease: { compound: 0,  isolation: 0,   oly: 0  } },
    ]
  },
];

// ── Program ───────────────────────────────────────────────────────────────────
const PROGRAM = {
  days: {
    0: { name: 'Sunday',    type: 'rest', accent: '#444' },
    1: {
      name: 'Monday', label: 'Upper Hypertrophy', accent: '#C8F55A', type: 'training',
      exercises: [
        { id: 'incline_db_press',     name: 'Incline DB Press',          sets: 4, repRange: [10,12], seedWeight: 65,  type: 'compound', pattern: 'h_push',
          rotation: ['incline_bb_press','cable_incline_press','db_flat_press','landmine_press'],
          alternatives: [
            { name: 'Incline Barbell Press',  notes: 'Heavier load, bilateral stability' },
            { name: 'Cable Incline Press',    notes: 'Constant tension, great for hypertrophy' },
            { name: 'Flat DB Press',          notes: 'Less upper chest, more total pec volume' },
            { name: 'Landmine Press',         notes: 'Shoulder-friendly arc, unilateral option' },
          ]},
        { id: 'cable_row_wide',       name: 'Cable Row Wide Grip',       sets: 4, repRange: [10,12], seedWeight: 120, type: 'compound', pattern: 'h_pull',
          rotation: ['chest_supported_row','t_bar_row','machine_row','seal_row'],
          alternatives: [
            { name: 'Chest-Supported Row',    notes: 'Eliminates lower back fatigue' },
            { name: 'T-Bar Row',              notes: 'Heavy loading, strong hip hinge position' },
            { name: 'Machine Row',            notes: 'Great for fatigue/deload phases' },
            { name: 'Seal Row',               notes: 'Strict, eliminates momentum entirely' },
          ]},
        { id: 'overhead_press_db',    name: 'Overhead Press DB',         sets: 3, repRange: [12,15], seedWeight: 50,  type: 'compound', pattern: 'v_push',
          rotation: ['seated_bb_ohp','arnold_press','landmine_ohp','cable_ohp'],
          alternatives: [
            { name: 'Seated Barbell OHP',     notes: 'Higher load potential, bilateral' },
            { name: 'Arnold Press',           notes: 'Extra rotational stimulus, shoulder health' },
            { name: 'Landmine OHP',           notes: 'Shoulder-friendly, unilateral variation' },
            { name: 'Cable Single-Arm OHP',   notes: 'Anti-lateral flexion demand added' },
          ]},
        { id: 'lat_pulldown',         name: 'Lat Pulldown',              sets: 3, repRange: [12,15], seedWeight: 130, type: 'compound', pattern: 'v_pull',
          rotation: ['neutral_pulldown','single_arm_pulldown','straight_arm_pulldown','pull_up'],
          alternatives: [
            { name: 'Neutral Grip Pulldown',  notes: 'Elbows path shifts, slightly more bicep' },
            { name: 'Single-Arm Pulldown',    notes: 'Better lat isolation, address imbalances' },
            { name: 'Straight-Arm Pulldown',  notes: 'Pure lat isolation, no bicep involvement' },
            { name: 'Pull-Up (assisted)',      notes: 'Bodyweight pattern, functional carry-over' },
          ]},
        { id: 'cable_lateral_raises', name: 'Cable Lateral Raises',      sets: 4, repRange: [15,20], seedWeight: 15,  type: 'isolation', pattern: 'shoulder',
          rotation: ['db_lateral_raise','machine_lateral','lu_raise','cable_y_raise'],
          alternatives: [
            { name: 'DB Lateral Raise',       notes: 'Free weight, natural path' },
            { name: 'Machine Lateral Raise',  notes: 'Constant tension, great for drop sets' },
            { name: 'Leaning DB Lateral',     notes: 'Greater stretch at bottom, better recruitment' },
            { name: 'Cable Y-Raise',          notes: 'Lower trap and rear delt emphasis added' },
          ]},
        { id: 'incline_curl',         name: 'Incline Curl',              sets: 3, repRange: [12,15], seedWeight: 30,  type: 'isolation', pattern: 'elbow_flex',
          rotation: ['hammer_curl','spider_curl','cable_curl','preacher_curl'],
          alternatives: [
            { name: 'Hammer Curl',            notes: 'Brachialis dominant, different stimulus' },
            { name: 'Spider Curl',            notes: 'Peak contraction emphasis, strict form' },
            { name: 'Cable Curl',             notes: 'Constant tension through full ROM' },
            { name: 'Preacher Curl',          notes: 'Eliminates cheating, pure isolation' },
          ]},
        { id: 'oh_tricep_ext_cable',  name: 'OH Tricep Ext Cable',       sets: 3, repRange: [12,15], seedWeight: 70,  type: 'isolation', pattern: 'elbow_ext',
          rotation: ['skull_crusher','db_oh_tricep','tricep_kickback','jm_press'],
          alternatives: [
            { name: 'Skull Crusher (EZ Bar)', notes: 'Long head emphasis, heavier loading' },
            { name: 'DB Overhead Tricep Ext', notes: 'Free weight version, unilateral option' },
            { name: 'Tricep Kickback',        notes: 'Peak contraction focus, lighter load' },
            { name: 'JM Press',              notes: 'Hybrid press/extension, great for strength' },
          ]},
      ]
    },
    2: {
      name: 'Tuesday', label: 'Lower Strength + Snatch Skill', accent: '#5AF5C8', type: 'training',
      exercises: [
        { id: 'back_squat',         name: 'Back Squat',           sets: 4, repRange: [4,6],   seedWeight: 225, type: 'compound', pattern: 'squat',
          rotation: ['safety_bar_squat','box_squat','paused_squat','hatfield_squat'],
          alternatives: [
            { name: 'Safety Bar Squat',       notes: 'Upper body mobility relief, same stimulus' },
            { name: 'Box Squat',              notes: 'Posterior chain emphasis, teach positioning' },
            { name: 'Paused Back Squat',      notes: 'Eliminates stretch reflex, raw strength' },
            { name: 'Belt Squat',             notes: 'No spinal load — great for back-off work' },
          ]},
        { id: 'romanian_deadlift',  name: 'Romanian Deadlift',    sets: 3, repRange: [6,8],   seedWeight: 185, type: 'compound', pattern: 'hip_hinge',
          rotation: ['single_leg_rdl','stiff_leg_dl','good_morning','nordic_hamstring'],
          alternatives: [
            { name: 'Single-Leg RDL',         notes: 'Unilateral, corrects imbalances + balance' },
            { name: 'Stiff-Leg Deadlift',     notes: 'More lower back involvement from floor' },
            { name: 'Good Morning',           notes: 'Barbell on back, heavy hip hinge variation' },
            { name: 'Nordic Hamstring Curl',  notes: 'Eccentric overload, injury prevention focus' },
          ]},
        { id: 'leg_press',          name: 'Leg Press',            sets: 3, repRange: [10,12], seedWeight: 360, type: 'compound', pattern: 'squat',
          rotation: ['hack_squat','spanish_squat','goblet_squat_heavy','v_squat'],
          alternatives: [
            { name: 'Hack Squat',             notes: 'More quad dominant, deeper ROM possible' },
            { name: 'Goblet Squat (heavy)',   notes: 'Bodyweight accessible, frontal load' },
            { name: 'V-Squat Machine',        notes: 'Similar to leg press, torso angle varies' },
            { name: 'Spanish Squat',          notes: 'Banded, knee dominant, quad isolation' },
          ]},
        { id: 'snatch_pull',        name: 'Snatch Pull',          sets: 4, repRange: [4,4],   seedWeight: 155, type: 'oly', pattern: 'oly_pull',
          rotation: ['clean_pull','snatch_deadlift','paused_snatch_pull','halting_snatch_dl'],
          alternatives: [
            { name: 'Clean Pull',             notes: 'Narrower grip pull, different timing' },
            { name: 'Snatch Deadlift',        notes: 'Slow pull, build positional strength' },
            { name: 'Paused Snatch Pull',     notes: 'Pause at knee, reinforce position' },
            { name: 'Halting Snatch DL',      notes: 'Pause above knee, extreme position work' },
          ]},
        { id: 'hang_power_snatch',  name: 'Hang Power Snatch',    sets: 4, repRange: [3,3],   seedWeight: 115, type: 'oly', pattern: 'snatch',
          rotation: ['power_snatch','snatch_from_blocks','muscle_snatch','high_pull_snatch'],
          alternatives: [
            { name: 'Power Snatch (floor)',   notes: 'Full range, builds from floor pull' },
            { name: 'Snatch from Blocks',     notes: 'Same hang position, pre-set each rep' },
            { name: 'Muscle Snatch',          notes: 'No feet, shoulder strength + technique' },
            { name: 'Snatch High Pull',       notes: 'No catch, builds pull mechanics and power' },
          ]},
        { id: 'leg_curl',           name: 'Leg Curl',             sets: 3, repRange: [12,15], seedWeight: 80,  type: 'isolation', pattern: 'knee_flex',
          rotation: ['seated_leg_curl','single_leg_curl','nordic_curl','swiss_ball_curl'],
          alternatives: [
            { name: 'Seated Leg Curl',        notes: 'Greater hip extension, more distal emphasis' },
            { name: 'Single-Leg Curl',        notes: 'Unilateral, address imbalances' },
            { name: 'Nordic Hamstring Curl',  notes: 'Eccentric overload for injury prevention' },
            { name: 'Swiss Ball Leg Curl',    notes: 'Stability demand added, functional' },
          ]},
        { id: 'calf_raise',         name: 'Calf Raise',           sets: 4, repRange: [15,20], seedWeight: 180, type: 'isolation', pattern: 'plantar_flex',
          rotation: ['seated_calf_raise_heavy','donkey_calf_raise','single_leg_calf','calf_press_leg_press'],
          alternatives: [
            { name: 'Donkey Calf Raise',      notes: 'Hip hinge removes load from spine' },
            { name: 'Single-Leg Calf Raise',  notes: 'Full bodyweight, harder, no equipment' },
            { name: 'Seated Calf Raise',      notes: 'Soleus emphasis (bent knee), different fiber' },
            { name: 'Calf Press on Leg Press',notes: 'Heavy loading, great for building mass' },
          ]},
      ]
    },
    3: { name: 'Wednesday', type: 'rest', accent: '#555' },
    4: {
      name: 'Thursday', label: 'Upper Strength', accent: '#F5A55A', type: 'training',
      exercises: [
        { id: 'barbell_bench_press',       name: 'Barbell Bench Press',     sets: 4, repRange: [4,6],   seedWeight: 185, type: 'compound', pattern: 'h_push',
          rotation: ['close_grip_bench','paused_bench','floor_press','db_bench_heavy'],
          alternatives: [
            { name: 'Close Grip Bench Press', notes: 'Tricep emphasis, same pattern' },
            { name: 'Paused Bench Press',     notes: 'Eliminate stretch reflex, pure strength' },
            { name: 'Floor Press',            notes: 'Limits ROM, great for tricep lockout' },
            { name: 'DB Bench (heavy)',       notes: 'More ROM, independent arm movement' },
          ]},
        { id: 'pendlay_row',               name: 'Pendlay Row',             sets: 4, repRange: [4,6],   seedWeight: 165, type: 'compound', pattern: 'h_pull',
          rotation: ['yates_row','barbell_row_strict','meadows_row','chest_supported_t_bar'],
          alternatives: [
            { name: 'Yates Row (supinated)',  notes: 'More bicep involvement, shorter ROM' },
            { name: 'Barbell Row (strict)',   notes: 'Slower eccentric, less hip drive' },
            { name: 'Meadows Row',            notes: 'Unilateral, massive lat stretch' },
            { name: 'Chest-Supported T-Bar',  notes: 'Removes lower back, strict upper back' },
          ]},
        { id: 'seated_db_shoulder_press',  name: 'Seated DB Shoulder Press',sets: 3, repRange: [6,8],   seedWeight: 60,  type: 'compound', pattern: 'v_push',
          rotation: ['standing_bb_press','push_press_light','z_press','log_press'],
          alternatives: [
            { name: 'Standing Barbell Press', notes: 'Core demand higher, full body press' },
            { name: 'Z-Press (seated floor)', notes: 'Eliminates leg drive, pure shoulder press' },
            { name: 'Push Press (light)',     notes: 'Speed strength development, leg drive used' },
            { name: 'Single-Arm DB Press',    notes: 'Unilateral, anti-lateral flexion demand' },
          ]},
        { id: 'weighted_pull_up',          name: 'Weighted Pull-Up',        sets: 3, repRange: [5,7],   seedWeight: 25,  type: 'compound', pattern: 'v_pull',
          rotation: ['weighted_chin_up','band_assisted_pullup','ring_row','neutral_grip_pullup'],
          alternatives: [
            { name: 'Weighted Chin-Up',       notes: 'Supinated grip, more bicep, different stimulus' },
            { name: 'Neutral Grip Pull-Up',   notes: 'Elbow-friendly, strong position' },
            { name: 'Ring Row',               notes: 'Regression, foot elevation increases difficulty' },
            { name: 'Band-Assisted Pull-Up',  notes: 'Higher volume possible with band' },
          ]},
        { id: 'face_pulls',                name: 'Face Pulls',              sets: 3, repRange: [15,20], seedWeight: 40,  type: 'isolation', pattern: 'shoulder',
          rotation: ['band_face_pull','cable_external_rotation','prone_y_raise','db_rear_delt_fly'],
          alternatives: [
            { name: 'Band Face Pull',         notes: 'Anywhere, great for travel or warm-up' },
            { name: 'Cable External Rotation',notes: 'Strict rotator cuff isolation' },
            { name: 'Prone Y-Raise (dumbbell)',notes: 'Lower trap + rear delt, floor or bench' },
            { name: 'DB Rear Delt Fly',       notes: 'Classic rear delt, easy to load up' },
          ]},
        { id: 'ez_bar_curl',               name: 'EZ Bar Curl',             sets: 3, repRange: [8,10],  seedWeight: 75,  type: 'isolation', pattern: 'elbow_flex',
          rotation: ['barbell_curl','db_curl_supinated','concentration_curl','machine_curl'],
          alternatives: [
            { name: 'Barbell Curl',           notes: 'Full supination, maximum bicep peak' },
            { name: 'DB Curl (supinated)',     notes: 'Independent arms, natural path' },
            { name: 'Concentration Curl',     notes: 'Strict isolation, maximal squeeze' },
            { name: 'Machine Curl',           notes: 'Consistent resistance, great for volume' },
          ]},
        { id: 'tricep_pushdown',           name: 'Tricep Pushdown',         sets: 3, repRange: [10,12], seedWeight: 55,  type: 'isolation', pattern: 'elbow_ext',
          rotation: ['rope_pushdown','v_bar_pushdown','reverse_pushdown','band_pushdown'],
          alternatives: [
            { name: 'Rope Pushdown',          notes: 'Spreads rope at bottom, full contraction' },
            { name: 'V-Bar Pushdown',         notes: 'Heavier potential, more stable' },
            { name: 'Reverse Grip Pushdown',  notes: 'Long head emphasis, supinated grip' },
            { name: 'Band Pushdown',          notes: 'Constant tension, great finisher' },
          ]},
      ]
    },
    5: {
      name: 'Friday', label: 'Lower Hypertrophy + C&J Power', accent: '#F55A9A', type: 'training',
      exercises: [
        { id: 'front_squat',          name: 'Front Squat',          sets: 4, repRange: [6,8],   seedWeight: 175, type: 'compound', pattern: 'squat',
          rotation: ['goblet_squat_heavy','ssa_front_squat','paused_front_squat','zercher_squat'],
          alternatives: [
            { name: 'SSA Front Squat',        notes: 'Arms crossed grip — wrist-friendly option' },
            { name: 'Paused Front Squat',     notes: 'Pause 2s at bottom, eliminates bounce' },
            { name: 'Zercher Squat',          notes: 'Crook-of-elbow, high core demand' },
            { name: 'Goblet Squat (heavy)',   notes: 'Accessible, great upright torso drill' },
          ]},
        { id: 'power_clean',          name: 'Power Clean',          sets: 5, repRange: [3,3],   seedWeight: 165, type: 'oly', pattern: 'clean',
          rotation: ['hang_power_clean','clean_from_blocks','muscle_clean','clean_deadlift_speed'],
          alternatives: [
            { name: 'Hang Power Clean',       notes: 'Shorter pull, emphasizes second pull' },
            { name: 'Power Clean from Blocks',notes: 'Pre-set position each rep, reduce fatigue' },
            { name: 'Muscle Clean',           notes: 'No re-bend, upper body pull emphasis' },
            { name: 'Clean High Pull',        notes: 'No catch, trains explosive pull mechanics' },
          ]},
        { id: 'push_press',           name: 'Push Press',           sets: 4, repRange: [4,4],   seedWeight: 145, type: 'oly', pattern: 'v_push',
          rotation: ['push_jerk','split_jerk','military_press_heavy','db_push_press'],
          alternatives: [
            { name: 'Push Jerk',              notes: 'Catch in quarter squat, more aggressive dip' },
            { name: 'Split Jerk',             notes: 'Competition movement, maximum overhead load' },
            { name: 'DB Push Press',          notes: 'Independent arms, shoulder health focus' },
            { name: 'Strict Military Press',  notes: 'Remove leg drive, pure overhead strength' },
          ]},
        { id: 'bulgarian_split_squat', name: 'Bulgarian Split Squat', sets: 3, repRange: [10,12], seedWeight: 50,  type: 'compound', pattern: 'squat',
          rotation: ['db_reverse_lunge','db_step_up','single_leg_leg_press','walking_lunge'],
          alternatives: [
            { name: 'DB Reverse Lunge',       notes: 'More balance control, less hip flexor demand' },
            { name: 'DB Step-Up',             notes: 'Drive from front leg only, athletic pattern' },
            { name: 'Single-Leg Leg Press',   notes: 'Machine stability, unilateral loading' },
            { name: 'Walking Lunge',          notes: 'Dynamic, adds hip flexor stretch' },
          ]},
        { id: 'leg_extension',        name: 'Leg Extension',        sets: 3, repRange: [15,20], seedWeight: 90,  type: 'isolation', pattern: 'knee_ext',
          rotation: ['sissy_squat','wall_sit','terminal_knee_ext','peterson_step_up'],
          alternatives: [
            { name: 'Sissy Squat',            notes: 'Bodyweight, extreme knee tracking demand' },
            { name: 'Terminal Knee Extension',notes: 'Band at back of knee, VMO isolation' },
            { name: 'Wall Sit (weighted)',    notes: 'Isometric quad work, easy to scale' },
            { name: 'Peterson Step-Up',       notes: 'VMO emphasis, single leg, quad dominant' },
          ]},
        { id: 'nordic_curl',          name: 'Nordic Curl',          sets: 3, repRange: [8,10],  seedWeight: 0,   type: 'isolation', pattern: 'knee_flex',
          rotation: ['lying_leg_curl','seated_leg_curl_slow','swiss_ball_curl','slider_curl'],
          alternatives: [
            { name: 'Lying Leg Curl',         notes: 'Machine, easy to load and progress' },
            { name: 'Seated Leg Curl (slow)', notes: '4-sec eccentric, eccentric overload' },
            { name: 'Swiss Ball Leg Curl',    notes: 'Stability demand + hamstring emphasis' },
            { name: 'Slider Leg Curl',        notes: 'Eccentric, nordic variation with less load' },
          ]},
        { id: 'seated_calf_raise',    name: 'Seated Calf Raise',    sets: 4, repRange: [15,20], seedWeight: 90,  type: 'isolation', pattern: 'plantar_flex',
          rotation: ['single_leg_seated_calf','banded_seated_calf','donkey_calf_raise','db_seated_calf'],
          alternatives: [
            { name: 'Single-Leg Seated Calf', notes: 'Unilateral — heavier load per leg' },
            { name: 'DB Seated Calf Raise',   notes: 'Easy setup, pause at stretch' },
            { name: 'Donkey Calf Raise',      notes: 'Hip hinge, heavy loading potential' },
            { name: 'Tibialis Raise',         notes: 'Anterior shin work — antagonist balance' },
          ]},
      ]
    },
    6: {
      name: 'Saturday', label: 'Full Olympic', accent: '#A55AF5', type: 'training',
      exercises: [
        { id: 'snatch_or_cj',             name: 'Snatch OR Clean & Jerk',     sets: 6, repRange: [2,3], seedWeight: 145, type: 'oly', pattern: 'snatch',
          rotation: ['full_snatch','full_clean_and_jerk','clean_and_press','snatch_complex'],
          alternatives: [
            { name: 'Full Snatch',            notes: 'Technical, overhead squat receive' },
            { name: 'Full Clean & Jerk',      notes: 'Competition movement — power + technique' },
            { name: 'Snatch Complex',         notes: 'Snatch pull + power snatch + OHS as a set' },
            { name: 'Clean & Press',          notes: 'Strict press instead of jerk — more shoulder' },
          ]},
        { id: 'snatch_balance_jerk_blocks', name: 'Snatch Balance / Jerk Blocks', sets: 3, repRange: [3,3], seedWeight: 125, type: 'oly', pattern: 'snatch',
          rotation: ['drop_snatch','overhead_squat','jerk_recovery','jerk_dip_drive'],
          alternatives: [
            { name: 'Drop Snatch',            notes: 'No leg drive, pure footwork + overhead speed' },
            { name: 'Overhead Squat',         notes: 'Build receive position stability' },
            { name: 'Jerk Recovery',          notes: 'Heavy overhead walk-in, lockout strength' },
            { name: 'Jerk Dip & Drive',       notes: 'Technique drill, no press, just dip+drive' },
          ]},
        { id: 'clean_pull_snatch_pull',    name: 'Clean Pull / Snatch Pull',    sets: 3, repRange: [4,4], seedWeight: 195, type: 'oly', pattern: 'oly_pull',
          rotation: ['snatch_deadlift','clean_deadlift','paused_pull','segment_pull'],
          alternatives: [
            { name: 'Snatch Deadlift',        notes: 'Slow pull to reinforce positions' },
            { name: 'Clean Deadlift',         notes: 'Clean grip, build from the floor' },
            { name: 'Paused Pull (knee)',     notes: 'Pause at knee, hold position 2 sec' },
            { name: 'Segment Deadlift',       notes: 'Multiple pause points, extreme position work' },
          ]},
        { id: 'back_squat_sat',            name: 'Back Squat',                  sets: 3, repRange: [5,5], seedWeight: 195, type: 'compound', pattern: 'squat',
          rotation: ['front_squat_light','overhead_squat','pause_squat','tempo_squat'],
          alternatives: [
            { name: 'Front Squat',            notes: 'Oly-specific carryover, upright torso' },
            { name: 'Overhead Squat',         notes: 'Snatch specific, stability + mobility demand' },
            { name: 'Pause Squat',            notes: '3-sec pause, remove stretch reflex' },
            { name: 'Tempo Squat (3-0-1)',    notes: '3-sec down, time under tension focus' },
          ]},
      ]
    },
  },

  // ── Warm-Ups ──────────────────────────────────────────────────────────────
  warmup: {
    1: { duration: '8–10 min', focus: 'Shoulder health + upper thoracic', exercises: [
      { name: 'Band Pull-Apart',       dose: '3 × 15',    note: 'Overhand grip, squeeze shoulder blades at finish' },
      { name: 'Shoulder CARs',         dose: '5 each arm',note: 'Controlled articular rotations — full, slow circles' },
      { name: 'Wall Slide',            dose: '2 × 10',    note: 'Arms against wall, slide up without losing contact' },
      { name: 'Thoracic Rotation',     dose: '10 each',   note: 'Quadruped or seated — rotate toward ceiling' },
      { name: 'Light Cable Face Pull', dose: '2 × 20',    note: 'Very light, groove the pattern for cable row prep' },
    ]},
    2: { duration: '10–12 min', focus: 'Hip mobility + snatch prep', exercises: [
      { name: 'Hip 90/90 Stretch',     dose: '60s each',  note: 'Anterior + posterior — sit tall, breathe into hip' },
      { name: 'Glute Bridge',          dose: '2 × 15',    note: 'Pause 1s at top, drive hips fully extended' },
      { name: "World's Greatest Stretch", dose: '5 each', note: 'Lunge → elbow to floor → rotate and reach' },
      { name: 'Ankle Circles',         dose: '30s each',  note: 'Full ROM, both directions, weight through heel' },
      { name: 'Goblet Squat (light)',  dose: '2 × 8',     note: 'Pause at bottom, chest up, heels down' },
      { name: 'OHS with PVC',          dose: '2 × 5',     note: 'Snatch grip, controlled descent, reinforce position' },
    ]},
    4: { duration: '8–10 min', focus: 'Pressing + pulling prep', exercises: [
      { name: 'Band Pull-Apart',       dose: '3 × 15',    note: 'Vary grip each set — over, under, neutral' },
      { name: 'Shoulder Dislocate (PVC)', dose: '2 × 10',note: 'Wide grip, slow and controlled, no pain' },
      { name: 'Push-Up',              dose: '2 × 10',    note: 'Full ROM, protract fully at top' },
      { name: 'Dead Hang',            dose: '3 × 20s',   note: 'Active hang — depress and pack shoulders' },
      { name: 'Thoracic Extension (foam roll)', dose: '30s', note: 'Mid to upper T-spine, pause on tight spots' },
    ]},
    5: { duration: '10–12 min', focus: 'Lower body + clean rack position', exercises: [
      { name: 'Hip Flexor Stretch',    dose: '60s each',  note: 'Tall kneeling, posterior pelvic tilt, no arch' },
      { name: 'Lateral Band Walk',     dose: '2 × 15 ea', note: 'Mini band at ankles, stay tall, step controlled' },
      { name: 'Leg Swing',            dose: '15 each leg',note: 'Front-to-back + lateral — hold something stable' },
      { name: 'RDL (very light)',      dose: '2 × 8',     note: 'Hip hinge groove — slight knee bend, feel hamstrings' },
      { name: 'Clean Grip Wrist Stretch', dose: '60s',   note: 'Prepare front rack — fingers up, elbows high' },
      { name: 'Goblet Squat (light)', dose: '2 × 8',     note: 'Upright torso, front squat specific prep' },
    ]},
    6: { duration: '12–15 min', focus: 'Full body Oly activation', exercises: [
      { name: 'PVC Pass-Through',     dose: '2 × 10',    note: 'Start wide — slowly narrow grip over weeks' },
      { name: 'OHS with PVC',         dose: '3 × 5',     note: 'Pause at bottom, snatch grip, reinforce position' },
      { name: 'Hip 90/90',            dose: '60s each',  note: 'Full anterior + posterior hip rotation' },
      { name: 'Ankle Dorsiflexion',   dose: '30s each',  note: 'Knee to wall — heel flat, maximize ROM' },
      { name: 'Snatch Balance (bar)', dose: '3 × 3',     note: 'Pop and punch — fast under, lockout overhead' },
      { name: 'Clean DL (bar only)',  dose: '2 × 3',     note: 'Slow pull from floor — groove the position' },
    ]},
  },

  // ── Cool-Downs ────────────────────────────────────────────────────────────
  cooldown: {
    1: { duration: '5–8 min', focus: 'Upper body tissue release', exercises: [
      { name: 'Cross-Body Shoulder Stretch', dose: '30s each', note: 'Posterior deltoid — hold gently, breathe' },
      { name: 'Doorway Chest Stretch',       dose: '45s',      note: 'Both arms at 90°, slight lean forward' },
      { name: 'Overhead Lat Stretch',        dose: '30s each', note: 'Arm overhead, side lean — cable stack or wall' },
      { name: "Child's Pose",               dose: '60s',       note: 'Arms extended, breathe into upper back, hold' },
    ]},
    2: { duration: '8–10 min', focus: 'Hip + hamstring release', exercises: [
      { name: 'Pigeon Pose',           dose: '90s each', note: 'Deep hip external rotation — sink in, breathe' },
      { name: 'Seated Hamstring Stretch', dose: '45s each', note: 'Straight leg — hinge from hip, don\'t round' },
      { name: 'Standing Quad Stretch', dose: '30s each', note: 'Hold ankle — posterior pelvic tilt to increase stretch' },
      { name: 'Calf + Achilles',       dose: '30s each', note: 'Straight knee (gastroc) + bent knee (soleus)' },
      { name: 'Supine Spinal Twist',   dose: '30s each', note: 'Knee across body, opposite arm out — breathe' },
    ]},
    4: { duration: '5–8 min', focus: 'Shoulder + wrist tissue release', exercises: [
      { name: 'Lat Overhead Stretch',   dose: '30s each', note: 'After heavy pulling — feel the lat lengthen' },
      { name: 'Pec Minor Stretch',      dose: '45s each', note: 'Corner of wall, elbow at 90° — lean slightly' },
      { name: 'Tricep Overhead Stretch',dose: '30s each', note: 'Elbow behind head — gently pull with other hand' },
      { name: 'Wrist Flexor + Extensor',dose: '30s each dir', note: 'After heavy pressing + pulling volume' },
      { name: "Child's Pose",           dose: '60s',      note: 'Full decompression — complete reset' },
    ]},
    5: { duration: '8–10 min', focus: 'Hip flexor + adductor release', exercises: [
      { name: 'Pigeon Pose',             dose: '90s each', note: 'Priority after heavy squat + clean work' },
      { name: 'Adductor Butterfly',      dose: '45s',      note: 'Soles together, lean forward from hips' },
      { name: 'Hip Flexor Lunge Stretch',dose: '60s each', note: 'Reach up + slight side lean for psoas' },
      { name: 'Calf + Achilles',         dose: '30s each', note: 'Wall or stair — both straight and bent knee' },
      { name: 'Lower Back Twist',        dose: '30s each', note: 'Supine — knees to chest → drop to one side' },
    ]},
    6: { duration: '8–10 min', focus: 'Full body Oly recovery', exercises: [
      { name: 'Overhead Shoulder Stretch', dose: '45s each', note: 'Release snatch/jerk shoulder stress' },
      { name: 'Hip 90/90 (hold)',          dose: '60s each', note: 'Both anterior + posterior — complete hold' },
      { name: 'Wrist Extension Stretch',   dose: '30s each', note: 'After heavy front rack — fingers back, gentle' },
      { name: 'Calf + Achilles',           dose: '30s each', note: 'After heavy squat volume — thorough' },
      { name: "Child's Pose → Cobra",      dose: '3 slow reps', note: 'Breathe through each — full spinal mobility' },
    ]},
  },

  // ── Core Work ─────────────────────────────────────────────────────────────
  coreWork: {
    1: { focus: 'Anti-Extension + Anti-Rotation', exercises: [
      { name: 'Dead Bug',        dose: '3 × 8 each', note: 'Press lower back to floor — exhale hard on extend' },
      { name: 'Pallof Press',    dose: '3 × 12 each',note: 'Cable or band at sternum — press out and hold 2s' },
      { name: 'Side Plank',      dose: '3 × 30s each',note: 'Stack feet or stagger — keep hips tall, breathe' },
    ]},
    2: { focus: 'Posterior Chain + McGill Big 3', exercises: [
      { name: 'Bird Dog',           dose: '3 × 10 each', note: 'Opposite arm + leg — 3s hold at end range' },
      { name: 'McGill Curl-Up',     dose: '3 × 10',      note: 'One knee bent, hands under lumbar, minimal ROM' },
      { name: 'Back Extension',     dose: '3 × 12',      note: '45° or GHD — squeeze glutes hard at top' },
    ]},
    4: { focus: 'Total Core + Lateral Stability', exercises: [
      { name: 'Ab Wheel Rollout',    dose: '3 × 8',       note: 'From knees — brace like a plank the entire time' },
      { name: 'Hollow Body Hold',    dose: '3 × 30s',     note: 'Lower back flat — arms + legs extended, breathe' },
      { name: 'Copenhagen Plank',    dose: '3 × 20s each',note: 'Top foot on bench — bottom leg free for harder version' },
    ]},
    5: { focus: 'Flexion + Rotation + Posterior', exercises: [
      { name: 'Hanging Leg Raise',   dose: '3 × 12',      note: 'Control the descent — no swinging or momentum' },
      { name: 'Russian Twist',       dose: '3 × 15 each', note: 'Feet up — slow rotation, touch weight to floor' },
      { name: 'Back Extension or Good Morning', dose: '3 × 12', note: 'Low back volume after heavy squat + clean day' },
    ]},
    6: { focus: 'Stability + Proprioception', exercises: [
      { name: 'Plank Progressions',       dose: '3 × 45s',     note: 'Forearm → RKC → weighted → plank with reach' },
      { name: 'Single-Leg RDL (BW)',      dose: '3 × 8 each',  note: 'Bodyweight — balance + posterior chain activation' },
      { name: 'Pallof Press Overhead',    dose: '3 × 10 each', note: 'Press out → extend overhead → return — stay rigid' },
    ]},
  },

  // ── Key Lifts for Progress ────────────────────────────────────────────────
  keyLifts: [
    { id: 'back_squat',         name: 'Back Squat' },
    { id: 'barbell_bench_press',name: 'Bench Press' },
    { id: 'romanian_deadlift',  name: 'RDL' },
    { id: 'front_squat',        name: 'Front Squat' },
    { id: 'power_clean',        name: 'Power Clean' },
    { id: 'hang_power_snatch',  name: 'Hang Power Snatch' },
    { id: 'push_press',         name: 'Push Press' },
    { id: 'back_squat_sat',     name: 'Back Squat (Sat)' },
    { id: 'weighted_pull_up',   name: 'Weighted Pull-Up' },
    { id: 'pendlay_row',        name: 'Pendlay Row' },
  ],

  // ── Nutrition ─────────────────────────────────────────────────────────────
  nutrition: { calories: 2950, protein: 210, carbs: 290, fatMin: 95, fatMax: 100 },

  // ── Rest Times (seconds) ──────────────────────────────────────────────────
  restTime: { compound: 180, oly: 180, isolation: 90 },

  // ── Progression (fallback when no 1RM data) ───────────────────────────────
  progression: {
    compound:  { increase: 10, decrease: 0.05 },
    oly:       { increase: 10, decrease: 0.05 },
    isolation: { increase: 5,  decrease: 0.05 },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTodayDay() {
  const dow = new Date().getDay();
  return { dow, day: PROGRAM.days[dow] };
}

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

function getExercisesForDay(dow) {
  const day = PROGRAM.days[dow];
  return day && day.exercises ? day.exercises : [];
}

// Epley 1RM estimate from a given weight and reps
function epley1RM(weight, reps) {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

// Round weight to nearest 2.5lb
function roundToNearest(weight, increment = 2.5) {
  return Math.round(weight / increment) * increment;
}

// Get mesocycle phase info from a mesocycle state object
function getMesoPhaseInfo(mesoState) {
  const meso = MESOCYCLES[mesoState.mesoIndex % MESOCYCLES.length];
  let weekCursor = 0;
  for (let p = 0; p < meso.phases.length; p++) {
    const phase = meso.phases[p];
    const phaseEnd = weekCursor + phase.weeks;
    if (mesoState.weekNumber <= phaseEnd) {
      const weekInPhase = mesoState.weekNumber - weekCursor;
      const progress = weekInPhase / phase.weeks;
      const intensity = phase.intensity[0] + (phase.intensity[1] - phase.intensity[0]) * progress;
      return { meso, phase, weekInPhase, phaseWeeks: phase.weeks, intensity, weekNumber: mesoState.weekNumber };
    }
    weekCursor = phaseEnd;
  }
  // Past end → on deload
  const lastPhase = meso.phases[meso.phases.length - 1];
  return { meso, phase: lastPhase, weekInPhase: 1, phaseWeeks: 1, intensity: lastPhase.intensity[0], weekNumber: mesoState.weekNumber };
}
