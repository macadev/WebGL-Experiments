import { SECONDS_PER_UPDATE } from './clientConstants.js';

function reconcilePredictionWithServerState(
  socketId,
  player,
  latestGameStateFromServer,
  userCommandHistory
) {
  let authoritativeStateForLocalPlayer =
    latestGameStateFromServer.players[socketId];

  let lastAckedUserCommandSeqNumber =
    authoritativeStateForLocalPlayer.lastAckedSequenceNumber;

  player.setCameraFront(
    authoritativeStateForLocalPlayer.cameraFront.x,
    authoritativeStateForLocalPlayer.cameraFront.y,
    authoritativeStateForLocalPlayer.cameraFront.z
  );

  player.setCameraUp(
    authoritativeStateForLocalPlayer.cameraUp.x,
    authoritativeStateForLocalPlayer.cameraUp.y,
    authoritativeStateForLocalPlayer.cameraUp.z
  );

  player.setPosition(
    authoritativeStateForLocalPlayer.position.x,
    authoritativeStateForLocalPlayer.position.y,
    authoritativeStateForLocalPlayer.position.z
  );

  let discardIndex = -1;
  for (let i = 0; i < userCommandHistory.length; i++) {
    let command = userCommandHistory[i];
    if (command.inputSequenceNumber <= lastAckedUserCommandSeqNumber) {
      discardIndex = i;
      continue;
    }

    player.applyUserCommand(SECONDS_PER_UPDATE, command);
  }

  if (discardIndex > -1) {
    userCommandHistory.splice(0, discardIndex + 1);
  }
}

export default reconcilePredictionWithServerState;
