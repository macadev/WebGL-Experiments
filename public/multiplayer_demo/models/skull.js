import skullShaders from '../shaders/skull_shaders.js';
import { initShaderProgram } from '../../engine/shader.js';
import { ModelLoader } from '../../engine/gltf_loader.js';
import { Mesh } from '../../engine/mesh.js';

function initSkullModel(gl) {
  let skullMeshes = [];

  const shaderProgram = initShaderProgram(
    gl,
    skullShaders.vertexShaderCode,
    skullShaders.fragmentShaderCode
  );

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

  function render(playerData) {
    gl.useProgram(shaderProgram);

    vec3.normalize(playerData.cameraUp, playerData.cameraUp);
    vec3.normalize(playerData.cameraFront, playerData.cameraFront);

    let worldForwardToLocalForward = quat.create();
    quat.rotationTo(
      worldForwardToLocalForward,
      vec3.fromValues(0, 0, -1),
      playerData.cameraFront
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
      playerData.cameraUp
    );

    let lookRotation = quat.multiply(
      quat.create(),
      fromRotatedWorldUpToLocalUp,
      worldForwardToLocalForward
    );

    quat.normalize(lookRotation, lookRotation);

    let modelMat = mat4.create();

    let translationMat = mat4.create();
    mat4.translate(translationMat, translationMat, playerData.position);

    mat4.fromQuat(modelMat, lookRotation);

    mat4.rotateY(modelMat, modelMat, glMatrix.toRadian(180.0));
    mat4.rotateX(modelMat, modelMat, glMatrix.toRadian(-90.0));
    mat4.multiply(modelMat, translationMat, modelMat);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(shaderProgram, 'model'),
      false,
      modelMat
    );

    gl.uniform3fv(
      gl.getUniformLocation(shaderProgram, 'playerColour'),
      playerData.colour
    );

    skullMeshes.forEach((sceneObject) => sceneObject.render());
  }

  return { render, setViewMatrix, setProjectionMatrix };
}

export default initSkullModel;
