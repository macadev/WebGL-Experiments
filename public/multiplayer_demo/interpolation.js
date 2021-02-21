import utils from './utils.js';

function interpolatePlayerEntities(
  playerSocketId,
  gameStateFrames,
  interpTimestamp
) {
  if (gameStateFrames.length === 1) {
    // Just have one update. Nothing to interpolate with.
    return createPlayerDataForRendering(gameStateFrames[0].players);
  }

  let toFrame, fromFrame;
  let foundUpdatesToInterpBetween = false;
  for (
    let i = gameStateFrames.length - 1, j = gameStateFrames.length - 2;
    j >= 0;
    i--, j--
  ) {
    toFrame = gameStateFrames[i];
    fromFrame = gameStateFrames[j];

    if (
      interpTimestamp >= fromFrame.serverTime &&
      interpTimestamp <= toFrame.serverTime
    ) {
      foundUpdatesToInterpBetween = true;
      break;
    }
  }

  if (!foundUpdatesToInterpBetween) {
    // Didn't find updates to interp between. Return the latest game state.
    return createPlayerDataForRendering(gameStateFrames[0].players);
  }

  let interpolatedPlayerData = {};
  // interp factor is a number between 0 and 1
  let interpolationFactor =
    (interpTimestamp - fromFrame.serverTime) /
    (toFrame.serverTime - fromFrame.serverTime);

  if (interpolationFactor > 1 || interpolationFactor < 0) {
    console.log('weird interp factor calculated', {
      interpolationFactor,
      interpTimestamp,
      fromFrameServerTime: fromFrame.serverTime,
      toFrameServerTime: toFrame.serverTime,
    });
  }

  for (const [socketId, playerData] of Object.entries(fromFrame.players)) {
    if (socketId === playerSocketId) {
      // Don't interpolate the local player
      continue;
    }

    let fromFramePlayerData = fromFrame.players[socketId];
    let toFramePlayerData = toFrame.players[socketId];

    if (toFramePlayerData === undefined) {
      // Player exists in the 'from' update but not the 'to' update.
      // They disconnected or were kicked out. Ignore them.
      continue;
    }

    let interpolatedPos = vec3.lerp(
      vec3.create(),
      vec3.fromValues(
        fromFramePlayerData.position.x,
        fromFramePlayerData.position.y,
        fromFramePlayerData.position.z
      ),
      vec3.fromValues(
        toFramePlayerData.position.x,
        toFramePlayerData.position.y,
        toFramePlayerData.position.z
      ),
      interpolationFactor
    );

    let interpolatedCameraFront = vec3.lerp(
      vec3.create(),
      vec3.fromValues(
        fromFramePlayerData.cameraFront.x,
        fromFramePlayerData.cameraFront.y,
        fromFramePlayerData.cameraFront.z
      ),
      vec3.fromValues(
        toFramePlayerData.cameraFront.x,
        toFramePlayerData.cameraFront.y,
        toFramePlayerData.cameraFront.z
      ),
      interpolationFactor
    );

    let cameraUp = vec3.lerp(
      vec3.create(),
      vec3.fromValues(
        fromFramePlayerData.cameraUp.x,
        fromFramePlayerData.cameraUp.y,
        fromFramePlayerData.cameraUp.z
      ),
      vec3.fromValues(
        toFramePlayerData.cameraUp.x,
        toFramePlayerData.cameraUp.y,
        toFramePlayerData.cameraUp.z
      ),
      interpolationFactor
    );

    interpolatedPlayerData[socketId] = {
      position: interpolatedPos,
      cameraFront: interpolatedCameraFront,
      cameraUp: cameraUp,
      colour: toFramePlayerData.colour,
    };
  }

  return interpolatedPlayerData;
}

function createPlayerDataForRendering(players) {
  let playerDataForRendering = {};
  for (const [socketId, playerData] of Object.entries(players)) {
    playerDataForRendering[socketId] = {
      ...utils.convertToVectors(playerData),
      colour: playerData.colour,
    };
  }

  return playerDataForRendering;
}

export default interpolatePlayerEntities;
