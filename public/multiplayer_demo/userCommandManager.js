class UserCommandManager {
  #socket;
  // We only send inputs 30 times per second. I batch them in this array and send them out
  // when enough have accumulated.
  #userCommandsToSendToServer = [];

  constructor(socket) {
    this.#socket = socket;

    // 30 times per second send the inputs to the server
    setInterval(() => {
      this.#socket.emit('client-update', this.#userCommandsToSendToServer);
      this.#userCommandsToSendToServer = [];
    }, 33.33);
  }

  handleUserCommand(clientCommand) {
    this.#userCommandsToSendToServer.push(clientCommand);

    // if (this.#userCommandsToSendToServer.length >= 2) {
    //   this.#socket.emit('client-update', this.#userCommandsToSendToServer);
    //   this.#userCommandsToSendToServer = [];
    // }
  }
}

export default UserCommandManager;
