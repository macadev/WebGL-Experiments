const express = require('express');
const path = require('path');

const Player = require('./player');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, '/../public')));

// 50 ms updates to clients
const SERVER_TICK_RATE_MS = 50;
const SERVER_TICK_RATE_SECONDS = 0.05;

let players = {};

let inputQueue = [];

function createWorldStatePayload(players) {
  const worldState = {};
  Object.keys(players).map((socketId) => {
    worldState[socketId] = players[socketId].getCameraComponents();
  });

  return worldState;
}

io.on('connection', (socket) => {
  console.log('Nueva conexión!');

  players[socket.id] = new Player();

  socket.emit('ack-join', createWorldStatePayload(players));

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

    playerToMove.setCameraFront(
      input.cameraFront.x,
      input.cameraFront.y,
      input.cameraFront.z
    );
    playerToMove.setCameraUp(
      input.cameraUp.x,
      input.cameraUp.y,
      input.cameraUp.z
    );
    playerToMove.move(SERVER_TICK_RATE_SECONDS, input.movementDirections);

    playersProcessed.add(playerSocketId);
  }
}

setInterval(function () {
  movePlayers(players, inputQueue);
  inputQueue = [];
  io.emit('server-update', createWorldStatePayload(players));
}, SERVER_TICK_RATE_MS);

server.listen(8080, () => console.log('Listening on port 8080!'));
