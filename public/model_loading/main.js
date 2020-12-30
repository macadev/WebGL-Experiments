import { initShaderProgram } from '../engine/shader.js';
import { vertexShaderCode, fragmentShaderCode } from './glsl_shaders.js';
import { createCamera } from '../engine/camera.js';
import { ModelLoader } from '../engine/gltf_loader.js';
import { Mesh } from '../engine/mesh.js';
import DIRECTIONS from '../engine/direction.js';

let mouseX = 400;
let mouseY = 300;

let then = 0;

let movementDirections = new Set();

const camera = createCamera();

let objectsToRender = [];

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

  const shaderProgram = initShaderProgram(
    gl,
    vertexShaderCode,
    fragmentShaderCode
  );

  // let modelLoader = new ModelLoader('olympus_om-4/scene.gltf', 'olympus_om-4');
  let modelLoader = new ModelLoader('skull/scene.gltf', 'skull');
  modelLoader.getSceneMeshData().then((dataOfMeshes) => {
    dataOfMeshes.forEach((meshData) => {
      objectsToRender.push(
        new Mesh({
          gl,
          shaderProgram,
          ...meshData,
        })
      );
    });
  });

  gl.useProgram(shaderProgram);

  let timeElapsed = 0;
  function render(now) {
    now *= 0.001; // convert to seconds
    const deltaTime = now - then;
    then = now;
    timeElapsed += deltaTime;

    camera.rotateCamera(mouseX, mouseY);
    camera.moveCamera(deltaTime, movementDirections);

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let viewMatrix = camera.getViewMatrix();

    const fieldOfView = (45 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 100.0;
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

    let modelMat = mat4.create();
    mat4.rotateX(modelMat, modelMat, glMatrix.toRadian(-90.0));
    // Camera model is huge. Need to scale it down.
    // mat4.scale(modelMat, modelMat, vec3.fromValues(0.01, 0.01, 0.01));

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'model'),
      false,
      modelMat
    );

    objectsToRender.forEach((sceneObject) => sceneObject.render());

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
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

window.onload = main;
