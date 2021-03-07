const { vec3, mat3 } = require('gl-matrix');

const SERVER_GAME_SIMULATION_TICK_RATE_MS = 1000 / 60;
const SERVER_GAME_SIMULATION_TICK_RATE_SECONDS =
  SERVER_GAME_SIMULATION_TICK_RATE_MS * 0.001;

const ACCELERATION = 0.02;

function movePlayer(player, { sideMoveDesiredSpeed, forwardMoveDesiredSpeed }) {
  let {
    position,
    cameraFront,
    cameraUp,
    velocity,
  } = player.getComponentVectors();

  vec3.scale(velocity, velocity, 0.9); // 10% friction?

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
  newPosition[0] =
    position[0] + newVelocity[0] * SERVER_GAME_SIMULATION_TICK_RATE_SECONDS;
  newPosition[1] = position[1];
  newPosition[2] =
    position[2] + newVelocity[2] * SERVER_GAME_SIMULATION_TICK_RATE_SECONDS;

  player.setPositionV(newPosition);
  player.setVelocityV(newVelocity);
}

module.exports = { movePlayer };
