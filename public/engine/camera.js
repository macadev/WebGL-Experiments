import DIRECTIONS from './direction.js';

function createCamera(
  cameraPos = vec3.fromValues(0.0, 0.0, 3.0),
  cameraFront = vec3.fromValues(0.0, 0.0, -1.0),
  cameraUp = vec3.fromValues(0.0, 1.0, 0.0)
) {
  let mouseX = 400;
  let mouseY = 300;

  let pitch = 0.0;
  let yaw = -90.0;

  let mouseSensitivity = 0.1;

  function getViewMatrix() {
    return mat4.lookAt(
      mat4.create(),
      cameraPos,
      vec3.add(vec3.create(), cameraPos, cameraFront),
      cameraUp
    );
  }

  function getComponentVectors() {
    return {
      cameraPos: vec3.clone(cameraPos),
      cameraFront: vec3.clone(cameraFront),
      cameraUp: vec3.clone(cameraUp),
    };
  }

  function rotateCamera(newMouseX, newMouseY) {
    let offsetX = newMouseX - mouseX;
    let offsetY = mouseY - newMouseY;
    mouseX = newMouseX;
    mouseY = newMouseY;

    offsetX *= mouseSensitivity;
    offsetY *= mouseSensitivity;

    yaw += offsetX;
    pitch += offsetY;

    if (pitch > 89.0) pitch = 89.0;
    if (pitch < -89.0) pitch = -89.0;

    let yawInRadians = glMatrix.toRadian(yaw);
    let pitchInRadians = glMatrix.toRadian(pitch);
    let x = Math.cos(yawInRadians) * Math.cos(pitchInRadians);
    let y = Math.sin(pitchInRadians);
    let z = Math.sin(yawInRadians) * Math.cos(pitchInRadians);

    vec3.set(cameraFront, x, y, z);
    vec3.normalize(cameraFront, cameraFront);

    let right = vec3.cross(
      vec3.create(),
      vec3.fromValues(0, 1, 0),
      cameraFront
    );

    vec3.cross(cameraUp, cameraFront, right);
    vec3.normalize(cameraUp, cameraUp);
  }

  function moveCamera(deltaTime, movementDirections) {
    let cameraSpeed = 2.5 * deltaTime;
    if (movementDirections.has(DIRECTIONS.UP)) {
      vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, cameraSpeed);
    }
    if (movementDirections.has(DIRECTIONS.DOWN)) {
      vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -cameraSpeed);
    }
    if (movementDirections.has(DIRECTIONS.LEFT)) {
      let horizontalMovementVector = vec3.cross(
        vec3.create(),
        cameraFront,
        cameraUp
      );
      vec3.normalize(horizontalMovementVector, horizontalMovementVector);
      vec3.scaleAndAdd(
        cameraPos,
        cameraPos,
        horizontalMovementVector,
        -cameraSpeed
      );
    }
    if (movementDirections.has(DIRECTIONS.RIGHT)) {
      let horizontalMovementVector = vec3.cross(
        vec3.create(),
        cameraFront,
        cameraUp
      );
      vec3.normalize(horizontalMovementVector, horizontalMovementVector);
      vec3.scaleAndAdd(
        cameraPos,
        cameraPos,
        horizontalMovementVector,
        cameraSpeed
      );
    }
  }

  return {
    getViewMatrix,
    rotateCamera,
    moveCamera,
    getComponentVectors,
  };
}

export { createCamera };
