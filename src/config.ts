/**
 * Every gameplay-feel number lives here. Tuning the game should never require
 * hunting through systems code.
 */
export const CONFIG = {
  physics: {
    gravity: -16,
    fixedStep: 1 / 60,
    maxStepsPerFrame: 4,
    solverIterations: 8,
    friction: 0.55,
    restitution: 0.04,
    linearDamping: 0.15,
    angularDamping: 0.4,
  },

  plate: {
    /** Usable inner radius of the dish. */
    radius: 1.6,
    /** Height of the dish lip above the interior floor. */
    lip: 0.28,
    /** Interior floor sits at y = 0; everything else is relative to it. */
    surfaceY: 0,
    tableY: -0.75,
  },

  throw: {
    /** The fruit is held a fixed distance in front of the camera, so it keeps
     *  the same on-screen size when zooming or switching to portrait. */
    cameraGap: 1.75,
    minOriginDistance: 2.2,
    originHeight: 1.25,
    /** Launch pitch in degrees; charge controls distance, not angle. */
    pitchDeg: 52,
    /** Charge 0..1 lands the fruit between these offsets from the plate centre
     *  (negative = short of the plate), so the dish always sits mid-range. */
    landNear: -2.0,
    landFar: 2.6,
    /** Extra yaw the player can dial in by dragging sideways, in degrees. */
    yawRangeDeg: 22,
    /** Drag length (fraction of the short screen axis) for a full charge. */
    chargeDragFraction: 0.26,
    yawDragFraction: 0.38,
    /** Seconds before the next fruit can be thrown. */
    cooldown: 0.28,
  },

  camera: {
    target: { x: 0, y: 0.3, z: 0 },
    radius: 5.0,
    minRadius: 4.0,
    maxRadius: 7.0,
    height: 2.7,
    fov: 45,
    orbitDragFraction: 0.9, // screen widths per full turn
    keyOrbitSpeed: 1.6, // rad/s
    smoothing: 12,
  },

  merge: {
    /** Overlap tolerance: fruits merge slightly before visually touching. */
    contactSlack: 1.04,
    maxPerStep: 12,
    /** Merges within this window belong to the same chain. */
    chainWindow: 0.9,
    /** Upward kick given to a freshly merged fruit. */
    popImpulse: 1.1,
  },

  fail: {
    /** Below this height a fruit has left the dish. */
    fallY: -0.35,
    /** Grace period so fruit balancing on the lip can still be saved. */
    graceSeconds: 0.25,
    strikes: 3,
  },

  scoring: {
    chainBonusPerStep: 0.5,
    doubleWatermelon: 200,
  },

  landing: {
    /** Fruit keeps roughly where it is thrown: kill most of the skid on impact. */
    horizontalKeep: 0.32,
    spinKeep: 0.35,
  },

  juice: {
    landSquash: 0.34,
    /** Squash spring: stiffness and damping of the bounce-back. */
    squashStiffness: 90,
    squashDamping: 13,
    shakeDecay: 7.5,
    hitstopFromTier: 6,
    hitstopMs: 65,
  },

  run: {
    /** Only the small fruits are throwable. */
    spawnTiers: [0, 1, 2, 3, 4],
    spawnWeights: [30, 25, 20, 15, 10],
  },
} as const;

export const DEG = Math.PI / 180;
