import INPUTS from './input.js';
import { MS_PER_UPDATE, SECONDS_PER_UPDATE } from '../clientConstants.js';

const SIDE_SPEED = 50.0;
const FORWARD_SPEED = 50.0;
const ACCELERATION = 0.02;

function movePlayer(player, { sideMoveDesiredSpeed, forwardMoveDesiredSpeed }) {
  let {
    position,
    cameraFront,
    cameraUp,
    velocity,
  } = player.getComponentVectors();

  vec3.scale(velocity, velocity, 0.9); // 5% friction?

  cameraFront[1] = 0.0; // Zero the vertical component of the view direction
  vec3.normalize(cameraFront, cameraFront);

  let right = vec3.cross(vec3.create(), vec3.fromValues(0, 1, 0), cameraFront);
  vec3.normalize(right, right);
  right[1] = 0.0;

  let transMatrix = mat3.fromValues(
    cameraFront[0],
    cameraFront[1],
    cameraFront[2],
    right[0],
    right[1],
    right[2],
    0,
    0,
    0
  );

  let keysVector = vec3.fromValues(
    forwardMoveDesiredSpeed,
    -sideMoveDesiredSpeed,
    0
  );

  let wishVelocity = vec3.transformMat3(vec3.create(), keysVector, transMatrix);
  wishVelocity[1] = 0.0; // Zero the vertical velocity
  let wishSpeed = vec3.length(wishVelocity);

  if (wishSpeed > 3.0) {
    let ratio = 3.0 / wishSpeed;
    vec3.scale(wishVelocity, wishVelocity, ratio);
  }

  let wishDir = vec3.normalize(vec3.create(), wishVelocity);

  // TODO: add logic to cap wishSpeed

  let currentSpeed = vec3.dot(velocity, wishDir);
  let addSpeed = wishSpeed - currentSpeed;

  let accelSpeed = ACCELERATION * wishSpeed;

  if (accelSpeed > addSpeed) {
    accelSpeed = addSpeed;
  }

  let newVelocity = vec3.scaleAndAdd(
    vec3.create(),
    velocity,
    wishDir,
    accelSpeed
  );

  let newPosition = vec3.create();
  newPosition[0] = position[0] + newVelocity[0] * SECONDS_PER_UPDATE;
  newPosition[1] = position[1];
  newPosition[2] = position[2] + newVelocity[2] * SECONDS_PER_UPDATE;

  player.setPositionV(newPosition);
  player.setVelocityV(newVelocity);
}

function calculateVelocityBasedOnKeysPressed(
  keyStateLastFrame,
  keyStateThisFrame
) {
  let forwardVal = calculateKeyState(
    INPUTS.W,
    keyStateLastFrame,
    keyStateThisFrame
  );

  let backwardVal = calculateKeyState(
    INPUTS.S,
    keyStateLastFrame,
    keyStateThisFrame
  );

  let leftVal = calculateKeyState(
    INPUTS.A,
    keyStateLastFrame,
    keyStateThisFrame
  );

  let rightVal = calculateKeyState(
    INPUTS.D,
    keyStateLastFrame,
    keyStateThisFrame
  );

  let sideMoveDesiredSpeed = rightVal * SIDE_SPEED - leftVal * SIDE_SPEED;
  let forwardMoveDesiredSpeed =
    forwardVal * FORWARD_SPEED - backwardVal * FORWARD_SPEED;

  return {
    sideMoveDesiredSpeed,
    forwardMoveDesiredSpeed,
  };
}

function calculateKeyState(key, keyStateLastFrame, keyStateThisFrame) {
  let keyPressedInLastFrame = keyStateLastFrame.has(key);
  let keyPressedInThisFrame = keyStateThisFrame.has(key);

  if (!keyPressedInLastFrame && keyPressedInThisFrame) {
    // Key was just pressed in this frame
    return 0.5;
  }

  if (keyPressedInLastFrame && keyPressedInThisFrame) {
    // Key is being held down
    return 1.0;
  }

  // Key is not being pressed
  return 0.0;
}

export { movePlayer, calculateVelocityBasedOnKeysPressed };
