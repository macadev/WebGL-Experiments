import { SECONDS_PER_UPDATE } from './clientConstants.js';

function reconcilePredictionWithServerState(
  player,
  localPlayerStateFromServer,
  userCommandHistory
) {
  let lastAckedUserCommandSeqNumber =
    localPlayerStateFromServer.lastAckedSequenceNumber;

  player.setCameraFront(localPlayerStateFromServer.cameraFront);
  player.setCameraUp(localPlayerStateFromServer.cameraUp);
  player.setPosition(localPlayerStateFromServer.position);

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
