import { movePlayer } from './movement/movement.js';

function reconcilePredictionWithServerState(
  player,
  localPlayerStateFromServer,
  userCommandHistory
) {
  let lastAckedUserCommandSeqNumber =
    localPlayerStateFromServer.lastAckedSequenceNumber;

  let posBeforeReconciliation = player.getComponentVectors().position;

  player.setCameraFront(localPlayerStateFromServer.cameraFront);
  player.setCameraUp(localPlayerStateFromServer.cameraUp);
  player.setPosition(localPlayerStateFromServer.position);
  player.setVelocity(localPlayerStateFromServer.velocity);

  let discardIndex = -1;
  for (let i = 0; i < userCommandHistory.length; i++) {
    let command = userCommandHistory[i];
    if (command.inputSequenceNumber <= lastAckedUserCommandSeqNumber) {
      discardIndex = i;
      continue;
    }

    // Apply the user command
    player.setCameraFront(command.cameraFront);
    player.setCameraUp(command.cameraUp);
    movePlayer(player, command.velocityBasedOnKeys);
  }

  let posAfterReconciliation = player.getComponentVectors().position;

  if (
    posAfterReconciliation[0] - posBeforeReconciliation[0] > 0 ||
    posAfterReconciliation[1] - posBeforeReconciliation[1] > 0 ||
    posAfterReconciliation[2] - posBeforeReconciliation[2] > 0
  ) {
    console.log({
      diffs: [
        posAfterReconciliation[0] - posBeforeReconciliation[0],
        posAfterReconciliation[1] - posBeforeReconciliation[1],
        posAfterReconciliation[2] - posBeforeReconciliation[2],
      ],
    });
  }

  if (discardIndex > -1) {
    userCommandHistory.splice(0, discardIndex + 1);
  }
}

export default reconcilePredictionWithServerState;
