function createProjectile(projectilePos, projectileFront, projectileUp) {
  // Move the projectile in front of the camera so the viewer isn't inside the box
  vec3.scaleAndAdd(projectilePos, projectilePos, projectileFront, 2.0);

  function move(deltaTime) {
    let projectileSpeed = 3.0 * deltaTime;
    vec3.scaleAndAdd(
      projectilePos,
      projectilePos,
      projectileFront,
      projectileSpeed
    );
  }

  function getPosition() {
    return projectilePos;
  }

  return {
    move,
    getPosition,
  };
}

export { createProjectile };
