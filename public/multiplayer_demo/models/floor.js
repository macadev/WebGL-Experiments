import floorShaders from '../shaders/floor_shaders.js';
import { initShaderProgram } from '../../engine/shader.js';
import { Mesh } from '../../engine/mesh.js';

function initFloorModel(gl) {
  let floorMeshes = [];

  const shaderProgram = initShaderProgram(
    gl,
    floorShaders.vertexShaderCode,
    floorShaders.fragmentShaderCode
  );

  // prettier-ignore
  floorMeshes.push(
    new Mesh({
      gl,
      shaderProgram,
      positions: [
        // Front face
        -4.0, -3.0,  4.0,
         4.0, -3.0,  4.0,
         4.0,  -2.0,  4.0,
        -4.0,  -2.0,  4.0,
        
        // Back face
        -4.0, -3.0, -4.0,
        -4.0,  -2.0, -4.0,
         4.0,  -2.0, -4.0,
         4.0, -3.0, -4.0,
        
        // Top face
        -4.0,  -2.0, -4.0,
        -4.0,  -2.0,  4.0,
         4.0,  -2.0,  4.0,
         4.0,  -2.0, -4.0,
        
        // Bottom face
        -4.0, -3.0, -4.0,
         4.0, -3.0, -4.0,
         4.0, -3.0,  4.0,
        -4.0, -3.0,  4.0,
        
        // Right face
         4.0, -3.0, -4.0,
         4.0,  -2.0, -4.0,
         4.0,  -2.0,  4.0,
         4.0, -3.0,  4.0,
        
        // Left face
        -4.0, -3.0, -4.0,
        -4.0, -3.0,  4.0,
        -4.0,  -2.0,  4.0,
        -4.0,  -2.0, -4.0,
      ],
      indices: [
        0,  1,  2,      0,  2,  3,    // front
        4,  5,  6,      4,  6,  7,    // back
        8,  9,  10,     8,  10, 11,   // top
        12, 13, 14,     12, 14, 15,   // bottom
        16, 17, 18,     16, 18, 19,   // right
        20, 21, 22,     20, 22, 23,   // left
      ],
      normals: [
        // Front
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,
        0.0,  0.0,  1.0,

        // Back
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,
        0.0,  0.0, -1.0,

        // Top
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,
        0.0,  1.0,  0.0,

        // Bottom
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,
        0.0, -1.0,  0.0,

        // Right
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,
        1.0,  0.0,  0.0,

        // Left
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0,
        -1.0,  0.0,  0.0
      ]
    })
  );

  function setViewMatrix(viewMatrix) {
    gl.useProgram(shaderProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'view'),
      false,
      viewMatrix
    );
  }

  function setProjectionMatrix(projectionMatrix) {
    gl.useProgram(shaderProgram);
    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'projection'),
      false,
      projectionMatrix
    );
  }

  function render() {
    gl.useProgram(shaderProgram);

    let modelMat = mat4.create();

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'model'),
      false,
      modelMat
    );

    floorMeshes.forEach((sceneObject) => sceneObject.render());
  }

  return { render, setViewMatrix, setProjectionMatrix };
}

export default initFloorModel;
