const express = require('express');
const path = require('path');

const Player = require('./player');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(express.static(path.join(__dirname, '/../public')));

// Server running simulation 60 times per seconds
// 1000 / 60 = 16.666 ms
// Because the server is running at a similar frame rate as the client I don't have to worry about inputs stacking too much.
const SERVER_TICK_RATE_MS = 16.6;
const SERVER_TICK_RATE_SECONDS = 0.0166;

let players = {};

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

  socket.on('client-update', function (clientInput) {
    players[socket.id].queueInput(clientInput);
  });

  socket.on('disconnect', () => {
    console.log('disconnect taking place', socket.id);
    delete players[socket.id];
  });
});

function movePlayers(players) {
  for (let player of Object.values(players)) {
    player.move(SERVER_TICK_RATE_SECONDS);
  }
}

setInterval(function () {
  movePlayers(players);
  inputQueue = [];
  io.emit('server-update', createWorldStatePayload(players));
}, SERVER_TICK_RATE_MS);

server.listen(8080, () => console.log('Listening on port 8080!'));
