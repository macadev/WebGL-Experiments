const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let players = [];

io.on('connection', (socket) => {
  console.log('Nueva conexión!');

  socket.emit('ack-join', { message: 'Bienvenido' });

  socket.on('disconnect', () => {
    console.log('disconnect taking place', socket.id);
  });
});

app.use(express.static(__dirname + '/public'));

server.listen(8080, () => console.log('Listening on port 8080!'));
