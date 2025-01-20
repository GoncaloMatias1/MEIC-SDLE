// Hello World client in Node.js
// Connects REQ socket to tcp://localhost:5559
// Sends "Hello" to server, expects "World" back

var zmq = require('zeromq');

(async () => {
  var sock = new zmq.Request();
  sock.connect('tcp://localhost:3002');

  sock.send("Fetch data");
  console.log("Sent request");
  const [response] = await sock.receive();
  console.log("Received response:", response.toString());
})();

