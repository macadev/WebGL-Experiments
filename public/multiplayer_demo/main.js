import { initShaderProgram } from '../engine/shader.js';
import { vertexShaderCode, fragmentShaderCode } from './glsl_shaders.js';
import { ModelLoader } from '../engine/gltf_loader.js';
import { Mesh } from '../engine/mesh.js';
import ClientSidePlayer from './clientSidePlayer.js';
import DIRECTIONS from '../engine/direction.js';

const MS_PER_UPDATE = 16.6; // 60 fps
const SECONDS_PER_UPDATE = MS_PER_UPDATE * 0.001;

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

let skullMeshes = [];

let socket;
let gameState;

function main() {
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

  let initialPlayerState = gameState[socket.id];
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
    )
  );

  const shaderProgram = initShaderProgram(
    gl,
    vertexShaderCode,
    fragmentShaderCode
  );

  // let modelLoader = new ModelLoader('olympus_om-4/scene.gltf', 'olympus_om-4');
  let modelLoader = new ModelLoader('skull/scene.gltf', 'skull');
  modelLoader.getSceneMeshData().then((dataOfMeshes) => {
    dataOfMeshes.forEach((meshData) => {
      skullMeshes.push(
        new Mesh({
          gl,
          shaderProgram,
          ...meshData,
        })
      );
    });
  });

  gl.useProgram(shaderProgram);

  let previousMs = 0;
  let lagMs = 0;
  function gameLoop() {
    let nowMs = window.performance.now();
    let deltaMs = nowMs - previousMs;
    previousMs = nowMs;
    lagMs += deltaMs;

    // Simulation time got huge. Something very bad is happening.
    // Clamp it down to 1 frame.
    if (lagMs >= 1000) {
      console.log('Simulation time over 1 second. Clamping.', lagMs);
      lagMs = MS_PER_UPDATE;
    }

    let clientUpdate;
    while (lagMs >= MS_PER_UPDATE) {
      clientUpdate = player.processInputs(
        SECONDS_PER_UPDATE, // TODO: need to stop using seconds here
        movementDirections,
        mouseX,
        mouseY
      );
      lagMs -= MS_PER_UPDATE;
    }

    if (clientUpdate !== undefined) {
      socket.emit('client-update', clientUpdate);
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let cameraComponents = player.getComponentVectors();
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

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'projection'),
      false,
      projectionMatrix
    );

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'view'),
      false,
      viewMatrix
    );

    // If skull models haven't finished loading then skip rendering anything
    if (skullMeshes.length === 0) {
      requestAnimationFrame(gameLoop);
      return;
    }

    for (const [socketId, playerData] of Object.entries(gameState)) {
      if (socketId === socket.id) continue;

      let playerCameraUp = vec3.fromValues(
        playerData.cameraUp.x,
        playerData.cameraUp.y,
        playerData.cameraUp.z
      );

      let playerCameraFront = vec3.fromValues(
        playerData.cameraFront.x,
        playerData.cameraFront.y,
        playerData.cameraFront.z
      );

      let playerCameraPosition = vec3.fromValues(
        playerData.position.x,
        playerData.position.y,
        playerData.position.z
      );

      vec3.normalize(playerCameraUp, playerCameraUp);
      vec3.normalize(playerCameraFront, playerCameraFront);

      let worldForwardToLocalForward = quat.create();
      quat.rotationTo(
        worldForwardToLocalForward,
        vec3.fromValues(0, 0, -1),
        playerCameraFront
      );

      let rotatedWorldUp = vec3.transformQuat(
        vec3.create(),
        vec3.fromValues(0, 1, 0),
        worldForwardToLocalForward
      );

      let fromRotatedWorldUpToLocalUp = quat.create();
      quat.rotationTo(
        fromRotatedWorldUpToLocalUp,
        rotatedWorldUp,
        playerCameraUp
      );

      let lookRotation = quat.multiply(
        quat.create(),
        fromRotatedWorldUpToLocalUp,
        worldForwardToLocalForward
      );

      quat.normalize(lookRotation, lookRotation);

      let modelMat = mat4.create();

      let translationMat = mat4.create();
      mat4.translate(translationMat, translationMat, playerCameraPosition);

      mat4.fromQuat(modelMat, lookRotation);

      mat4.rotateY(modelMat, modelMat, glMatrix.toRadian(180.0));
      mat4.rotateX(modelMat, modelMat, glMatrix.toRadian(-90.0));
      mat4.multiply(modelMat, translationMat, modelMat);

      gl.uniformMatrix4fv(
        gl.getUniformLocation(shaderProgram, 'model'),
        false,
        modelMat
      );

      skullMeshes.forEach((sceneObject) => sceneObject.render());
    }

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

function createPingTimer(socket) {
  let pingContainer = document.getElementById('ping');

  socket.on('ping', (epochMilliseconds) => {
    let roundTripTimeMs = Date.now() - epochMilliseconds;
    pingContainer.innerText = roundTripTimeMs;
  });

  setInterval(() => {
    socket.emit('ping', Date.now());
  }, 1000);
}

function connectToServer() {
  socket = io.connect();

  socket.on('ack-join', function (serverGameState) {
    console.log('Conectado al servidor', serverGameState);
    gameState = serverGameState;
    main();
  });

  socket.on('server-update', function (updatedGameState) {
    gameState = updatedGameState;
  });

  createPingTimer(socket);
}

window.onload = connectToServer;
