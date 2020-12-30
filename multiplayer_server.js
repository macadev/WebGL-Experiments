const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { vec3 } = require('gl-matrix');

let players = {};

io.on('connection', (socket) => {
  console.log('Nueva conexión!');

  players[socket.id] = {
    position: { x: 0.0, y: 0.0, z: 0.0 },
    cameraFront: { x: 0.0, y: 0.0, z: -1.0 },
    cameraUp: { x: 0.0, y: 1.0, z: 0.0 },
  };

  socket.emit('ack-join', players);

  socket.on('client-update', function (clientInputs) {
    // console.log('New client update', clientInputs);
    // clientInputs.movementKeys.length > 0 && console.log(clientInputs);
  });

  socket.on('disconnect', () => {
    console.log('disconnect taking place', socket.id);
    delete players[socket.id];
  });
});

app.use(express.static(__dirname + '/public'));

server.listen(8080, () => console.log('Listening on port 8080!'));
