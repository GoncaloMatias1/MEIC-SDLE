// DBWorker.js
const { parentPort } = require('worker_threads');
const zmq = require('zeromq');

const sock = new zmq.Request();
sock.connect('tcp://localhost:3002');

parentPort.on('message', async (cartData) => {
    try {
        const json = {
            type: "mergeDB",
            data: { cart: cartData }
        };

        await sock.send(JSON.stringify(json));
        console.log("Sent request to Server!");

        const [response] = await Promise.race([
            sock.receive(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), 3000)
            ),
        ]);
        console.log("Received response:", response.toString());

        // Send the response back to the main thread
        parentPort.postMessage({ success: true, response: response.toString() });
    } catch (err) {
        console.error(err);
        parentPort.postMessage({ success: false, error: err.message });
    } finally {
        sock.close();
    }
});

parentPort.on('close', () => {
    console.log('Worker is closing. Cleaning up resources.');
    sock.close();
});