// Hello World server in Node.js
// Connects REP socket to tcp://*:5560
// Expects "Hello" from client, replies with "World"

const zmq = require("zeromq");

(async () => {
  const sock = new zmq.Reply();
  sock.connect("tcp://localhost:3003"); // Connect to proxy's DEALER

  for await (const [request] of sock) {
    console.log("Processing request:", request.toString());
    const response = `Data response for ${request}`;
    await sock.send(response);
  }
})();