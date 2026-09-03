/**
 * Every gameplay-feel number lives here. Tuning the game should never require
 * hunting through systems code. Mutable (not `as const`) so the in-game dev
 * panel can tweak these live.
 */
export interface GameConfig {
  physics: {
    gravity: number;
    fixedStep: number;
    maxStepsPerFrame: number;
    solverIterations: number;
    friction: number;
    restitution: number;
    linearDamping: number;
    angularDamping: number;
  };
  plate: {
    /** Usable inner radius of the dish. */
    radius: number;
    /** Height of the dish lip above the interior floor. */
    lip: number;
    /** Interior floor sits at y = 0; everything else is relative to it. */
    surfaceY: number;
    tableY: number;
  };
  throw: {
    /** The fruit is held a fixed distance in front of the camera, so it keeps
     *  the same on-screen size when zooming or switching to portrait. */
    cameraGap: number;
    minOriginDistance: number;
    originHeight: number;
    /** Launch pitch in degrees; charge controls distance, not angle. */
    pitchDeg: number;
    /** Charge 0..1 lands the fruit between these offsets from the plate centre
     *  (negative = short of the plate), so the dish always sits mid-range. */
    landNear: number;
    landFar: number;
    /** Extra yaw the player can dial in by dragging sideways, in degrees. */
    yawRangeDeg: number;
    /** Drag length (fraction of the short screen axis) for a full charge. */
    chargeDragFraction: number;
    yawDragFraction: number;
    /** Seconds before the next fruit can be thrown. */
    cooldown: number;
  };
  camera: {
    target: { x: number; y: number; z: number };
    radius: number;
    minRadius: number;
    maxRadius: number;
    height: number;
    fov: number;
    orbitDragFraction: number; // screen widths per full turn
    keyOrbitSpeed: number; // rad/s
    smoothing: number;
  };
  merge: {
    /** Overlap tolerance: fruits merge slightly before visually touching. */
    contactSlack: number;
    maxPerStep: number;
    /** Merges within this window belong to the same chain. */
    chainWindow: number;
    /** Upward kick given to a freshly merged fruit. */
    popImpulse: number;
  };
  fail: {
    /** Below this height a fruit has left the dish. */
    fallY: number;
    /** Grace period so fruit balancing on the lip can still be saved. */
    graceSeconds: number;
    strikes: number;
  };
  scoring: {
    chainBonusPerStep: number;
    doubleWatermelon: number;
  };
  landing: {
    /** Fruit keeps roughly where it is thrown: kill most of the skid on impact. */
    horizontalKeep: number;
    spinKeep: number;
  };
  juice: {
    landSquash: number;
    /** Squash spring: stiffness and damping of the bounce-back. */
    squashStiffness: number;
    squashDamping: number;
    shakeDecay: number;
    hitstopFromTier: number;
    hitstopMs: number;
  };
  run: {
    /** Only the small fruits are throwable. */
    spawnTiers: number[];
    spawnWeights: number[];
  };
  trajectory: {
    color: number;
    opacity: number;
    thicknessPx: number;
  };
  landingRing: {
    innerRadius: number;
    outerRadius: number;
    opacity: number;
    safeColor: number;
    riskyColor: number;
  };
}

export const CONFIG: GameConfig = {
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
    radius: 1.6,
    lip: 0.28,
    surfaceY: 0,
    tableY: -0.75,
  },

  throw: {
    cameraGap: 1.75,
    minOriginDistance: 2.2,
    originHeight: 1.25,
    pitchDeg: 52,
    landNear: -2.0,
    landFar: 2.6,
    yawRangeDeg: 22,
    chargeDragFraction: 0.26,
    yawDragFraction: 0.38,
    cooldown: 0.28,
  },

  camera: {
    target: { x: 0, y: 0.3, z: 0 },
    radius: 5.0,
    minRadius: 4.0,
    maxRadius: 7.0,
    height: 2.7,
    fov: 45,
    orbitDragFraction: 0.9,
    keyOrbitSpeed: 1.6,
    smoothing: 12,
  },

  merge: {
    contactSlack: 1.04,
    maxPerStep: 12,
    chainWindow: 0.9,
    popImpulse: 1.1,
  },

  fail: {
    fallY: -0.35,
    graceSeconds: 0.25,
    strikes: 3,
  },

  scoring: {
    chainBonusPerStep: 0.5,
    doubleWatermelon: 200,
  },

  landing: {
    horizontalKeep: 0.32,
    spinKeep: 0.35,
  },

  juice: {
    landSquash: 0.34,
    squashStiffness: 90,
    squashDamping: 13,
    shakeDecay: 7.5,
    hitstopFromTier: 6,
    hitstopMs: 65,
  },

  run: {
    spawnTiers: [0, 1, 2, 3, 4],
    spawnWeights: [30, 25, 20, 15, 10],
  },

  trajectory: {
    color: 0xfffdf5,
    opacity: 0.7,
    thicknessPx: 5,
  },

  landingRing: {
    innerRadius: 0.28,
    outerRadius: 0.33,
    opacity: 0.7,
    safeColor: 0xffffff,
    riskyColor: 0xff8000,
  },
};

/** Frozen-in-time snapshot of the values above, for the dev panel's reset. */
export const DEFAULT_CONFIG: GameConfig = JSON.parse(JSON.stringify(CONFIG));

export const DEG = Math.PI / 180;
