import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from '../config';
import { plateCollisionBuffers } from '../render/plate';

export interface PhysicsWorld {
  rapier: typeof RAPIER;
  world: RAPIER.World;
  events: RAPIER.EventQueue;
  plateCollider: RAPIER.Collider;
}

let ready: Promise<void> | null = null;

/** Rapier ships as WASM; initialise once, reuse for every run. */
export function initRapier(): Promise<void> {
  ready ??= RAPIER.init();
  return ready;
}

export function createPhysicsWorld(): PhysicsWorld {
  const world = new RAPIER.World({ x: 0, y: CONFIG.physics.gravity, z: 0 });
  world.timestep = CONFIG.physics.fixedStep;
  // Higher iteration counts keep tall fruit stacks from jittering apart.
  world.integrationParameters.numSolverIterations = CONFIG.physics.solverIterations;

  const plateBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const { vertices, indices } = plateCollisionBuffers();
  const plateCollider = world.createCollider(
    RAPIER.ColliderDesc.trimesh(vertices, indices)
      .setFriction(0.8)
      .setRestitution(0.02),
    plateBody,
  );

  // The table only exists so fruit that rolls off has somewhere to land.
  const tableBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, CONFIG.plate.tableY - 0.1, 0),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cylinder(0.1, 5.2).setFriction(0.9).setRestitution(0.05),
    tableBody,
  );

  return { rapier: RAPIER, world, events: new RAPIER.EventQueue(true), plateCollider };
}
