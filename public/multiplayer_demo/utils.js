function convertToVectors(componentsObject) {
  return {
    position: vec3.fromValues(
      componentsObject.position.x,
      componentsObject.position.y,
      componentsObject.position.z
    ),
    cameraFront: vec3.fromValues(
      componentsObject.cameraFront.x,
      componentsObject.cameraFront.y,
      componentsObject.cameraFront.z
    ),
    cameraUp: vec3.fromValues(
      componentsObject.cameraUp.x,
      componentsObject.cameraUp.y,
      componentsObject.cameraUp.z
    ),
  };
}

export default { convertToVectors };
