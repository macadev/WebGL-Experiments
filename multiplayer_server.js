const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { vec3 } = require('gl-matrix');

// 50 ms updates to clients
const SERVER_TICK_RATE_MS = 50;
const SERVER_TICK_RATE_SECONDS = 0.05;

let players = {};

let inputQueue = [];

io.on('connection', (socket) => {
  console.log('Nueva conexión!');

  players[socket.id] = {
    position: { x: 0.0, y: 0.0, z: 0.0 },
    cameraFront: { x: 0.0, y: 0.0, z: -1.0 },
    cameraUp: { x: 0.0, y: 1.0, z: 0.0 },
  };

  socket.emit('ack-join', players);

  socket.on('client-update', function (clientInputs) {
    inputQueue.push({ socketId: socket.id, ...clientInputs });
  });

  socket.on('disconnect', () => {
    console.log('disconnect taking place', socket.id);
    delete players[socket.id];
  });
});

function movePlayers(players, inputQueue) {
  let playersProcessed = new Set();
  for (let input of inputQueue) {
    let playerSocketId = input.socketId;
    if (playersProcessed.has(playerSocketId)) continue;

    let playerToMove = players[playerSocketId];
    move(SERVER_TICK_RATE_SECONDS, input.movementDirections, playerToMove);
    playerToMove.cameraFront = input.cameraFront;
    playerToMove.cameraUp = input.cameraUp;

    playersProcessed.add(playerSocketId);
  }
}

function move(deltaTime, movementDirections, player) {
  let movementDirectionsSet = new Set(movementDirections);
  let cameraSpeed = 2.5 * deltaTime;

  let cameraUp = vec3.fromValues(
    player.cameraUp.x,
    player.cameraUp.y,
    player.cameraUp.z
  );

  let cameraFront = vec3.fromValues(
    player.cameraFront.x,
    player.cameraFront.y,
    player.cameraFront.z
  );

  let cameraPos = vec3.fromValues(
    player.position.x,
    player.position.y,
    player.position.z
  );

  if (movementDirectionsSet.has('U')) {
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, cameraSpeed);
  }
  if (movementDirectionsSet.has('D')) {
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -cameraSpeed);
  }
  if (movementDirectionsSet.has('L')) {
    let horizontalMovementVector = vec3.cross(
      vec3.create(),
      cameraFront,
      cameraUp
    );
    vec3.normalize(horizontalMovementVector, horizontalMovementVector);
    vec3.scaleAndAdd(
      cameraPos,
      cameraPos,
      horizontalMovementVector,
      -cameraSpeed
    );
  }
  if (movementDirectionsSet.has('R')) {
    let horizontalMovementVector = vec3.cross(
      vec3.create(),
      cameraFront,
      cameraUp
    );
    vec3.normalize(horizontalMovementVector, horizontalMovementVector);
    vec3.scaleAndAdd(
      cameraPos,
      cameraPos,
      horizontalMovementVector,
      cameraSpeed
    );
  }

  player.cameraUp.x = cameraUp[0];
  player.cameraUp.y = cameraUp[1];
  player.cameraUp.z = cameraUp[2];
  player.cameraFront.x = cameraFront[0];
  player.cameraFront.y = cameraFront[1];
  player.cameraFront.z = cameraFront[2];
  player.position.x = cameraPos[0];
  player.position.y = cameraPos[1];
  player.position.z = cameraPos[2];
}

setInterval(function () {
  movePlayers(players, inputQueue);
  inputQueue = [];
  io.emit('server-update', players);
}, SERVER_TICK_RATE_MS);

app.use(express.static(__dirname + '/public'));

server.listen(8080, () => console.log('Listening on port 80!'));
