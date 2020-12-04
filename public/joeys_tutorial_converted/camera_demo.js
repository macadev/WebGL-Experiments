import { initShaderProgram } from './shader.js';
import { loadTexture } from './texture.js';
import { vertexShaderCode, fragmentShaderCode } from './glsl_shaders.js';
import { createCubeVAO } from './cube.js';

let cameraPos = vec3.fromValues(0.0, 0.0, 3.0);
let cameraFront = vec3.fromValues(0.0, 0.0, -1.0);
let cameraUp = vec3.fromValues(0.0, 1.0, 3.0);

let then = 0;

function main() {
  const canvas = document.querySelector('#glCanvas');
  // Initialize the GL context
  const gl = canvas.getContext('webgl2');

  // Only continue if WebGL is available and working
  if (gl === null) {
    throw 'Unable to initialize WebGL. Your browser or machine may not support it.';
  }

  const texture = loadTexture(gl, 'assets/container.jpg');
  const shaderProgram = initShaderProgram(
    gl,
    vertexShaderCode,
    fragmentShaderCode
  );
  const cubeVAO = createCubeVAO(gl, shaderProgram);

  const cubePositions = [
    vec3.fromValues(0.0, 0.0, 0.0),
    vec3.fromValues(2.0, 5.0, -15.0),
    vec3.fromValues(-1.5, -2.2, -2.5),
    vec3.fromValues(-3.8, -2.0, -12.3),
    vec3.fromValues(2.4, -0.4, -3.5),
    vec3.fromValues(-1.7, 3.0, -7.5),
    vec3.fromValues(1.3, -2.0, -2.5),
    vec3.fromValues(1.5, 2.0, -2.5),
    vec3.fromValues(1.5, 0.2, -1.5),
    vec3.fromValues(-1.3, 1.0, -1.5),
  ];

  gl.useProgram(shaderProgram);

  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(gl.getUniformLocation(shaderProgram, 'texture1'), 0);

  let timeElapsed = 0;
  function render(now) {
    now *= 0.001; // convert to seconds
    const deltaTime = now - then;
    then = now;
    timeElapsed += deltaTime;

    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindVertexArray(cubeVAO);

    let viewMatrix = mat4.create();
    mat4.lookAt(
      viewMatrix,
      cameraPos,
      vec3.add(vec3.create(), cameraPos, cameraFront),
      cameraUp
    );

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

    cubePositions.forEach((cubePos, index) => {
      let modelMatrix = mat4.create(); // Identity
      modelMatrix = mat4.translate(modelMatrix, modelMatrix, cubePos);
      modelMatrix = mat4.rotate(
        modelMatrix,
        modelMatrix,
        glMatrix.toRadian(50.0) * timeElapsed + index,
        vec3.fromValues(1.0, 0.3, 0.5)
      );
      gl.uniformMatrix4fv(
        gl.getUniformLocation(shaderProgram, 'model'),
        false,
        modelMatrix
      );

      gl.drawArrays(gl.TRIANGLES, 0, 36);
    });

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

window.onload = main;
