const { vec3 } = require('gl-matrix');

class Player {
  #position = vec3.fromValues(0.0, 0.0, 0.0);
  #cameraFront = vec3.fromValues(0.0, 0.0, -1.0);
  #cameraUp = vec3.fromValues(0.0, 1.0, 0.0);

  // At some point this number is going to get very very big. It probably makes sense to reset it to 0 eventually.
  #lastAckedSequenceNumber = 0;

  constructor() {}

  move(userCommand, deltaTime) {
    // Apply the camera vectors contained in the input before moving through space
    this.setCameraFront(userCommand.cameraFront);
    this.setCameraUp(userCommand.cameraUp);

    let movementDirectionsSet = new Set(userCommand.movementDirections);
    let cameraSpeed = 5.0 * deltaTime;

    if (movementDirectionsSet.has('U')) {
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        this.#cameraFront,
        cameraSpeed
      );
    }
    if (movementDirectionsSet.has('D')) {
      vec3.scaleAndAdd(
        this.#position,
        this.#position,
        this.#cameraFront,
        -cameraSpeed
      );
    }
    if (movementDirectionsSet.has('L')) {
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
    if (movementDirectionsSet.has('R')) {
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

    // Store the sequence number of the last applied input.
    this.#lastAckedSequenceNumber = userCommand.inputSequenceNumber;
  }

  getCameraComponents() {
    return {
      position: {
        x: this.#position[0],
        y: this.#position[1],
        z: this.#position[2],
      },
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
    };
  }

  getLastAckedSequenceNumber() {
    return this.#lastAckedSequenceNumber;
  }

  setCameraFront({ x, y, z }) {
    this.#cameraFront = vec3.fromValues(x, y, z);
  }

  setCameraUp({ x, y, z }) {
    this.#cameraUp = vec3.fromValues(x, y, z);
  }
}

module.exports = Player;
