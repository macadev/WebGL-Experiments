const { vec3 } = require('gl-matrix');

class Player {
  #position = vec3.fromValues(0.0, 0.0, 0.0);
  #cameraFront = vec3.fromValues(0.0, 0.0, -1.0);
  #cameraUp = vec3.fromValues(0.0, 1.0, 0.0);
  #velocity = vec3.fromValues(0.0, 0.0, 0.0);
  #colour;

  // At some point this number is going to get very very big. It probably makes sense to reset it to 0 eventually.
  #lastAckedSequenceNumber = 0;

  constructor(colour) {
    this.#colour = colour;
  }

  getComponentVectors() {
    return {
      position: vec3.clone(this.#position),
      cameraFront: vec3.clone(this.#cameraFront),
      cameraUp: vec3.clone(this.#cameraUp),
      velocity: vec3.clone(this.#velocity),
    };
  }

  getComponentVectorsForTransmission() {
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
      velocity: {
        x: this.#velocity[0],
        y: this.#velocity[1],
        z: this.#velocity[2],
      },
    };
  }

  setLastAckedSequenceNumber(seqNumber) {
    this.#lastAckedSequenceNumber = seqNumber;
  }

  getLastAckedSequenceNumber() {
    return this.#lastAckedSequenceNumber;
  }

  getColour() {
    return this.#colour;
  }

  setCameraUp({ x, y, z }) {
    this.#cameraUp = vec3.fromValues(x, y, z);
  }

  setCameraFront({ x, y, z }) {
    this.#cameraFront = vec3.fromValues(x, y, z);
  }

  setPosition({ x, y, z }) {
    this.#position = vec3.fromValues(x, y, z);
  }

  setVelocity({ x, y, z }) {
    this.#velocity = vec3.fromValues(x, y, z);
  }

  setCameraUpV(vector) {
    this.#cameraUp = vector;
  }

  setCameraFrontV(vector) {
    this.#cameraFront = vector;
  }

  setPositionV(vector) {
    this.#position = vector;
  }

  setVelocityV(vector) {
    this.#velocity = vector;
  }
}

module.exports = Player;
