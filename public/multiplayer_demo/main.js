import DIRECTIONS from '../engine/direction.js';
import { MS_PER_UPDATE, SECONDS_PER_UPDATE } from './clientConstants.js';

import ClientSidePlayer from './clientSidePlayer.js';
import reconcilePredictionWithServerState from './prediction.js';
import interpolatePlayerEntities from './interpolation.js';
import ServerUpdateRateMeter from './stats/ServerUpdateRateMeter.js';

import initSkullModel from './models/skull.js';
import initFloorModel from './models/floor.js';

const POV_DROP_DOWN_ID = 'povDropDown';
const FIRST_PERSON_VIEW = 'fpv';
const THIRD_PERSON_VIEW = 'tpv';
let playerPoV = FIRST_PERSON_VIEW; // Game starts in first person view by default

const SIMULATE_LAG_CHECKBOX_ID = 'simulateLag';
let simulateLag = false;

const LAG_MS_INPUT_ID = 'simulatedLagAmount';
let simulatedLagAmount = 0;

const CLIENT_SIDE_PREDICTION_CHECKBOX_ID = 'toggleClientSidePrediction';
let clientSidePredictionEnabled = true;

const ENTITY_INTERPOLATION_CHECKBOX_ID = 'toggleEntityInterpolation';
let entityInterpolationEnabled = true;

const fpsMeter = new FPSMeter({
  decimals: 0,
  graph: true,
  theme: 'dark',
  left: 'auto',
  right: '5px',
  maxFps: 100,
});

let mouseX = 400;
let mouseY = 300;

let movementDirections = new Set();

let player;

let socket;

// Sliding window of gamestate received from the server
// At 30 updates/sec a new one comes in every 33.33 ms.
let gameStateFrames = [];

// Sliding window of the user commands generated by the local player
let userCommandHistory = [];

let serverUpdateRateMeter;

function main() {
  document.getElementById(POV_DROP_DOWN_ID).onchange = function () {
    let pov = document.getElementById(POV_DROP_DOWN_ID).value;
    if (pov === FIRST_PERSON_VIEW) {
      playerPoV = FIRST_PERSON_VIEW;
    } else {
      playerPoV = THIRD_PERSON_VIEW;
    }
  };

  document.getElementById(SIMULATE_LAG_CHECKBOX_ID).onchange = function () {
    simulateLag = this.checked;
  };

  document.getElementById(LAG_MS_INPUT_ID).onchange = function () {
    simulatedLagAmount = parseInt(this.value);
  };

  document.getElementById(
    CLIENT_SIDE_PREDICTION_CHECKBOX_ID
  ).onchange = function () {
    clientSidePredictionEnabled = this.checked;
  };

  document.getElementById(
    ENTITY_INTERPOLATION_CHECKBOX_ID
  ).onchange = function () {
    entityInterpolationEnabled = this.checked;
  };

  const canvas = document.querySelector('#glCanvas');
  // Initialize the GL context
  const gl = canvas.getContext('webgl2');

  // Only continue if WebGL is available and working
  if (gl === null) {
    throw 'Unable to initialize WebGL. Your browser or machine may not support it.';
  }

  canvas.requestPointerLock =
    canvas.requestPointerLock || canvas.mozRequestPointerLock;

  document.exitPointerLock =
    document.exitPointerLock || document.mozExitPointerLock;

  canvas.onclick = function () {
    canvas.requestPointerLock();
  };

  initializeMovementKeyListeners();

  // Hook pointer lock state change events for different browsers
  document.addEventListener(
    'pointerlockchange',
    () => lockChangeAlert(canvas),
    false
  );
  document.addEventListener(
    'mozpointerlockchange',
    () => lockChangeAlert(canvas),
    false
  );

  let skullModel = initSkullModel(gl);
  let floorModel = initFloorModel(gl);

  let previousMs = 0;
  let lagMs = 0;
  function gameLoop() {
    let nowMs = Date.now();
    let deltaMs = nowMs - previousMs;
    previousMs = nowMs;
    lagMs += deltaMs;

    // Simulation time got huge. Something very bad is happening.
    // Clamp it down to 1 frame. If lagMs accumulates but is under this
    // threshold then the client will spam the server with a lot of
    // packets. Not good.
    if (lagMs >= 100) {
      console.log('Simulation time over 1 second. Clamping.', lagMs);
      lagMs = MS_PER_UPDATE;
    }

    let didSimulate = false;
    let userCommand;
    while (lagMs >= MS_PER_UPDATE) {
      userCommand = player.processInputs(
        SECONDS_PER_UPDATE, // TODO: need to stop using seconds here
        movementDirections,
        mouseX,
        mouseY
      );

      userCommandHistory.push(userCommand);

      // We are sending an user command on every simulation frame. That means
      // 60 times a second at our current simulation step.
      if (simulateLag) {
        setTimeout(() => {
          socket.emit('client-update', userCommand);
        }, simulatedLagAmount);
      } else {
        socket.emit('client-update', userCommand);
      }
      lagMs -= MS_PER_UPDATE;
      didSimulate = true;
    }

    let latestGameStateFrame = gameStateFrames[gameStateFrames.length - 1];
    let localPlayerStateFromServer = latestGameStateFrame.players[socket.id];
    if (didSimulate) {
      if (clientSidePredictionEnabled) {
        reconcilePredictionWithServerState(
          player,
          localPlayerStateFromServer,
          userCommandHistory
        );
      } else {
        // If client-side prediction is not enabled then we simply set the player's
        // position and orientation to what the server tells us in the latest game state update.
        player.setPosition(localPlayerStateFromServer.position);
        player.setCameraFront(localPlayerStateFromServer.cameraFront);
        player.setCameraUp(localPlayerStateFromServer.cameraUp);
      }
    }

    let framesForInterpolation;
    if (entityInterpolationEnabled) {
      framesForInterpolation = gameStateFrames;
    } else {
      // A small hack where we only pass the latest frame to the interpolation algorithm.
      // With a single frame it's not possible to interpolate (you need 'from' and 'to' states).
      // We'll simply see the entities as they came in the latest update.
      framesForInterpolation = [gameStateFrames[gameStateFrames.length - 1]];
    }

    let playerDataForRendering = interpolatePlayerEntities(
      socket.id,
      framesForInterpolation,
      nowMs - 200 // Other players are simulated 100 ms in the past. We interpolate between their updates.
    );

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let cameraComponents = player.getComponentVectors();
    if (playerPoV === THIRD_PERSON_VIEW) {
      let right = vec3.cross(
        vec3.create(),
        cameraComponents.cameraUp,
        cameraComponents.cameraFront
      );

      let rotAroundRight = quat.setAxisAngle(
        quat.create(),
        right,
        glMatrix.toRadian(30)
      );

      vec3.transformQuat(
        cameraComponents.cameraFront,
        cameraComponents.cameraFront,
        rotAroundRight
      );

      // Move the camera back a bit
      vec3.scaleAndAdd(
        cameraComponents.position,
        cameraComponents.position,
        cameraComponents.cameraFront,
        -6
      );
    }

    let viewMatrix = mat4.lookAt(
      mat4.create(),
      cameraComponents.position,
      vec3.add(
        vec3.create(),
        cameraComponents.position,
        cameraComponents.cameraFront
      ),
      cameraComponents.cameraUp
    );

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    skullModel.setProjectionMatrix(projectionMatrix);
    skullModel.setViewMatrix(viewMatrix);

    for (const [socketId, playerData] of Object.entries(
      playerDataForRendering
    )) {
      if (socketId === socket.id) continue;
      skullModel.render(playerData);
    }

    if (playerPoV === THIRD_PERSON_VIEW) {
      skullModel.render({
        ...player.getComponentVectors(),
        colour: player.getColour(),
      });
    }

    floorModel.setProjectionMatrix(projectionMatrix);
    floorModel.setViewMatrix(viewMatrix);
    floorModel.render();

    requestAnimationFrame(gameLoop);
    fpsMeter.tick();
  }
  requestAnimationFrame(gameLoop);
}

function lockChangeAlert(canvas) {
  if (
    document.pointerLockElement === canvas ||
    document.mozPointerLockElement === canvas
  ) {
    console.log('The pointer lock status is now locked');
    document.addEventListener('mousemove', updatePosition, false);
  } else {
    console.log('The pointer lock status is now unlocked');
    document.removeEventListener('mousemove', updatePosition, false);
  }
}

function updatePosition(e) {
  mouseX += e.movementX;
  mouseY += e.movementY;
}

function initializeMovementKeyListeners() {
  document.addEventListener('keydown', function (e) {
    if (e.code === 'KeyW') {
      movementDirections.add(DIRECTIONS.UP);
    }
    if (e.code === 'KeyS') {
      movementDirections.add(DIRECTIONS.DOWN);
    }
    if (e.code === 'KeyA') {
      movementDirections.add(DIRECTIONS.LEFT);
    }
    if (e.code === 'KeyD') {
      movementDirections.add(DIRECTIONS.RIGHT);
    }
  });

  document.addEventListener('keyup', function (e) {
    if (e.code === 'KeyW') {
      movementDirections.delete(DIRECTIONS.UP);
    }
    if (e.code === 'KeyS') {
      movementDirections.delete(DIRECTIONS.DOWN);
    }
    if (e.code === 'KeyA') {
      movementDirections.delete(DIRECTIONS.LEFT);
    }
    if (e.code === 'KeyD') {
      movementDirections.delete(DIRECTIONS.RIGHT);
    }
  });
}

function createPingTimer(socket) {
  let pingContainer = document.getElementById('ping');

  socket.on('ping', (epochMilliseconds) => {
    if (simulateLag) {
      setTimeout(() => {
        let roundTripTimeMs = Date.now() - epochMilliseconds;
        pingContainer.innerText = roundTripTimeMs;
      }, simulatedLagAmount);
    } else {
      let roundTripTimeMs = Date.now() - epochMilliseconds;
      pingContainer.innerText = roundTripTimeMs;
    }
  });

  setInterval(() => {
    let pingSentTime = Date.now();
    if (simulateLag) {
      setTimeout(() => {
        socket.emit('ping', pingSentTime);
      }, simulatedLagAmount);
    } else {
      socket.emit('ping', pingSentTime);
    }
  }, 1000);
}

function connectToServer() {
  socket = io.connect();

  socket.on('ack-join', function (initialGameState) {
    console.log('Conectado al servidor', initialGameState);
    gameStateFrames.push(initialGameState);

    // Initialize the local player's state object
    let initialPlayerState = initialGameState.players[socket.id];
    player = new ClientSidePlayer(
      vec3.fromValues(
        initialPlayerState.position.x,
        initialPlayerState.position.y,
        initialPlayerState.position.z
      ),
      vec3.fromValues(
        initialPlayerState.cameraFront.x,
        initialPlayerState.cameraFront.y,
        initialPlayerState.cameraFront.z
      ),
      vec3.fromValues(
        initialPlayerState.cameraUp.x,
        initialPlayerState.cameraUp.y,
        initialPlayerState.cameraUp.z
      ),
      initialPlayerState.colour
    );

    main();
  });

  function processServerUpdate(updatedGameState) {
    gameStateFrames.push(updatedGameState);
    // Arbitrary rule. We only keep the 120 most recent game states.
    // shift() can be O(n), so this might be a little slow.
    if (gameStateFrames.length > 120) {
      gameStateFrames.shift();
    }
  }

  socket.on('server-update', function (updatedGameState) {
    if (simulateLag) {
      setTimeout(() => {
        serverUpdateRateMeter.incrementUpdatesReceived();
        processServerUpdate(updatedGameState);
      }, simulatedLagAmount);
    } else {
      serverUpdateRateMeter.incrementUpdatesReceived();
      processServerUpdate(updatedGameState);
    }
  });

  createPingTimer(socket);
  serverUpdateRateMeter = new ServerUpdateRateMeter();
}

window.onload = connectToServer;
