const { vec3 } = require('gl-matrix');

class Player {
  #position = vec3.fromValues(0.0, 0.0, 0.0);
  #cameraFront = vec3.fromValues(0.0, 0.0, -1.0);
  #cameraUp = vec3.fromValues(0.0, 1.0, 0.0);

  // At some point this number is going to get very very big. It probably makes sense to reset it to 0 eventually.
  #lastAckedSequenceNumber = 0;

  // Queue of inputs received from the client that controls the Player instance.
  #inputs = [];

  constructor() {}

  // Add an input to the end of the queue of inputs maintained for the player object.
  queueInput(input) {
    this.#inputs.push(input);
  }

  move(deltaTime) {
    let lastSeqNumber;

    for (let input of this.#inputs) {
      // Skip inputs that have old sequence numbers
      if (input.inputSequenceNumber <= this.#lastAckedSequenceNumber) continue;

      // Keep track of the last input sequence number that was applied
      lastSeqNumber = input.inputSequenceNumber;

      // Apply the camera vectors contained in each input before moving through space
      this.setCameraFront(
        input.cameraFront.x,
        input.cameraFront.y,
        input.cameraFront.z
      );
      this.setCameraUp(input.cameraUp.x, input.cameraUp.y, input.cameraUp.z);

      let movementDirectionsSet = new Set(input.movementDirections);
      let cameraSpeed = 2.5 * deltaTime;

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
    }

    // Store the sequence number of the last applied input, and clear the queue.
    if (lastSeqNumber) this.#lastAckedSequenceNumber = lastSeqNumber;
    this.#inputs = [];
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

  setCameraFront(x, y, z) {
    this.#cameraFront = vec3.fromValues(x, y, z);
  }

  setCameraUp(x, y, z) {
    this.#cameraUp = vec3.fromValues(x, y, z);
  }
}

module.exports = Player;
