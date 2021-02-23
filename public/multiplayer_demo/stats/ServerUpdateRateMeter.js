const SEVER_UPDATES_PER_SECOND_ID = 'serverUpdatesPerSec';
const SMOOTHING = 0.9;
const SMOOTHING_CONVERSE = 1 - SMOOTHING;

class ServerUpdateRateMeter {
  #updatesReceived = 0;
  #startTime;

  #updatesPerSecondContainer = document.getElementById(
    SEVER_UPDATES_PER_SECOND_ID
  );

  #oldMeasurement = 0;

  constructor() {
    this.#startTime = Date.now();
    this.#beginMeasuringLoop();
  }

  incrementUpdatesReceived() {
    this.#updatesReceived++;
  }

  #beginMeasuringLoop() {
    setInterval(() => {
      let endTime = Date.now();
      let timeForMeasurement = endTime - this.#startTime;
      let newMeasurement =
        this.#updatesReceived / (timeForMeasurement / 1000.0);

      this.#updatesPerSecondContainer.innerText = (
        newMeasurement * SMOOTHING +
        this.#oldMeasurement * SMOOTHING_CONVERSE
      ).toFixed(2);

      this.#startTime = endTime;
      this.#oldMeasurement = newMeasurement;
      this.#updatesReceived = 0;
    }, 1000);
  }
}

export default ServerUpdateRateMeter;
