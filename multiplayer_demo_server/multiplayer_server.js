const express = require('express');
const path = require('path');

const Player = require('./player');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, '/../public')));

// Server running game simulation 60 times per seconds
// 1000 / 60 = 16.666 ms
const SERVER_GAME_SIMULATION_TICK_RATE_MS = 1000 / 60;
const SERVER_GAME_SIMULATION_TICK_RATE_SECONDS =
  SERVER_GAME_SIMULATION_TICK_RATE_MS * 0.001;

// We send updates to clients every 33.333 ms (30 times per second)
const SERVER_UPDATE_TICK_RATE_MS = 1000 / 30;

const players = {};
let userCommands = [];

function createWorldStatePayload(players) {
  // World state is composed of: positions, camera vectors, last acked sequence number
  const worldState = {};
  Object.keys(players).map((socketId) => {
    let player = players[socketId];

    worldState[socketId] = {
      ...player.getCameraComponents(),
      lastAckedSequenceNumber: player.getLastAckedSequenceNumber(),
    };
  });

  return worldState;
}

io.on('connection', (socket) => {
  console.log('Nueva conexión!');

  players[socket.id] = new Player();

  socket.emit('ack-join', createWorldStatePayload(players));

  socket.on('client-update', (userCommand) => {
    userCommand.socketId = socket.id;
    userCommands.push(userCommand);
  });

  socket.on('disconnect', () => {
    console.log('disconnect taking place', socket.id);
    delete players[socket.id];
  });

  // Client sends us an epoch indicating when they started the ping call
  // We respond with the same epoch. The client will compare it
  // with their current time to calculate the round trip time.
  socket.on('ping', (pingCallEpoch) => {
    socket.emit('ping', pingCallEpoch);
  });
});

function simulateGame() {
  for (let userCommand of userCommands) {
    let player = players[userCommand.socketId];
    player.move(userCommand, SERVER_GAME_SIMULATION_TICK_RATE_SECONDS);
  }
  // Flush the queue
  userCommands = [];
}

var tickLengthMs = 1000 / 60;
var previousTick = Date.now();

// Game loop - runs the game simulation.
// This runs very fast - 60 times per second
function gameLoop() {
  var now = Date.now();

  if (previousTick + SERVER_GAME_SIMULATION_TICK_RATE_MS <= now) {
    previousTick = now;
    simulateGame();
  }

  if (Date.now() - previousTick < tickLengthMs - 16) {
    setTimeout(gameLoop);
  } else {
    setImmediate(gameLoop);
  }
}

gameLoop();

// Update loop - send the world state to the clients
// This one runs a bit slower. We send updates 30 times per second.
setInterval(() => {
  io.emit('server-update', createWorldStatePayload(players));
}, SERVER_UPDATE_TICK_RATE_MS);

server.listen(8080, () => console.log('Listening on port 8080!'));
