const zmq = require('zeromq');

(async () => {
    const socket = new zmq.Request();
    await socket.connect("tcp://localhost:5001"); 

    const request = {
        type: 'get',
        listId: 'list123',
    };
    console.log("Sending GET request:", request);
    await socket.send(JSON.stringify(request));

    const [response] = await socket.receive();
    console.log("Response:", response.toString());
})();
