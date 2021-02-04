import DIRECTIONS from '../engine/direction.js';

const MOUSE_SENSITIVITY = 0.1;

class ClientSidePlayer {
  #position = vec3.fromValues(0.0, 0.0, 0.0);
  #cameraFront = vec3.fromValues(0.0, 0.0, -1.0);
  #cameraUp = vec3.fromValues(0.0, 1.0, 0.0);

  #mouseX = 400;
  #mouseY = 300;

  #pitch = 0.0;
  #yaw = -90.0;

  #inputSequenceNumber = 0;

  // Local history of inputs made by the player
  #inputHistory = [];

  constructor(position, cameraFront, cameraUp) {
    this.#position = position;
    this.#cameraFront = cameraFront;
    this.#cameraUp = cameraUp;
  }

  getComponentVectors() {
    return {
      position: vec3.clone(this.#position),
      cameraFront: vec3.clone(this.#cameraFront),
      cameraUp: vec3.clone(this.#cameraUp),
    };
  }

  processInputs(deltaTime, movementDirections, mouseX, mouseY) {
    this.#rotateCamera(mouseX, mouseY);
    this.#moveCamera(deltaTime, movementDirections);
    this.#inputSequenceNumber++;

    // This is the 'timeline' of inputs we'll use to enable client-side prediction which is
    // reconciled with the authoritative updates from the server.
    this.#inputHistory.push({
      position: vec3.clone(this.#position),
      cameraFront: vec3.clone(this.#cameraFront),
      cameraUp: vec3.clone(this.#cameraUp),
      movementDirections: new Set(movementDirections), // Clone the set
      inputSequenceNumber: this.#inputSequenceNumber,
    });

    return this.#buildClientUpdateObject(movementDirections);
  }

  // Returns the JS object we'll send to server indicating the keyboard inputs, camera vectors
  // and the input sequence number.
  #buildClientUpdateObject(movementDirections) {
    return {
      cameraFront: {
        x: this.#cameraFront[0],
        y: this.#cameraFront[1],
        z: this.#cameraFront[2],
      },
      cameraUp: {
        x: this.#cameraUp[0],
        y: this.#cameraUp[1],
        z: this.#cameraUp[2],
      },
      movementDirections: Array.from(movementDirections),
      inputSequenceNumber: this.#inputSequenceNumber,
    };
  }

  #rotateCamera(newMouseX, newMouseY) {
    let offsetX = newMouseX - this.#mouseX;
    let offsetY = this.#mouseY - newMouseY;
    this.#mouseX = newMouseX;
    this.#mouseY = newMouseY;

    offsetX *= MOUSE_SENSITIVITY;
    offsetY *= MOUSE_SENSITIVITY;

    this.#yaw += offsetX;
    this.#pitch += offsetY;

    if (this.#pitch > 89.0) this.#pitch = 89.0;
    if (this.#pitch < -89.0) this.#pitch = -89.0;

    let yawInRadians = glMatrix.toRadian(this.#yaw);
    let pitchInRadians = glMatrix.toRadian(this.#pitch);
    let x = Math.cos(yawInRadians) * Math.cos(pitchInRadians);
    let y = Math.sin(pitchInRadians);
    let z = Math.sin(yawInRadians) * Math.cos(pitchInRadians);

    vec3.set(this.#cameraFront, x, y, z);
    vec3.normalize(this.#cameraFront, this.#cameraFront);

    let right = vec3.cross(
      vec3.create(),
      vec3.fromValues(0, 1, 0),
      this.#cameraFront
    );

    vec3.cross(this.#cameraUp, this.#cameraFront, right);
    vec3.normalize(this.#cameraUp, this.#cameraUp);
  }

  #moveCamera(deltaTime, movementDirections) {
    let cameraSpeed = 2.5 * deltaTime;
    if (movementDirections.has(DIRECTIONS.UP)) {
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        this.#cameraFront,
        cameraSpeed
      );
    }
    if (movementDirections.has(DIRECTIONS.DOWN)) {
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        this.#cameraFront,
        -cameraSpeed
      );
    }
    if (movementDirections.has(DIRECTIONS.LEFT)) {
      let horizontalMovementVector = vec3.cross(
        vec3.create(),
        this.#cameraFront,
        this.#cameraUp
      );
      vec3.normalize(horizontalMovementVector, horizontalMovementVector);
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        horizontalMovementVector,
        -cameraSpeed
      );
    }
    if (movementDirections.has(DIRECTIONS.RIGHT)) {
      let horizontalMovementVector = vec3.cross(
        vec3.create(),
        this.#cameraFront,
        this.#cameraUp
      );
      vec3.normalize(horizontalMovementVector, horizontalMovementVector);
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        horizontalMovementVector,
        cameraSpeed
      );
    }
  }
}

export default ClientSidePlayer;
