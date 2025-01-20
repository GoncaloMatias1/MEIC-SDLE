// getDB.js
const { parentPort } = require('worker_threads');
const zmq = require('zeromq');

const sock = new zmq.Request();
sock.connect('tcp://localhost:3002');

parentPort.on('message', async () => {
    try {
        const json = {
            type: "getDB"
        };

        await sock.send(JSON.stringify(json));
        console.log("Sent request to Server!");
        
        let [response] = await Promise.race([
            sock.receive(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Operation timed out')), 3000)
            ),
        ]);
        console.log("Received response:", response.toString());

        // Remove any \ characters from the response
        response = response.toString().replace(/\\/g, '');

        // If there are "" characters, replace them with " characters
        response = response.replace(/""/g, '"');

        const cleanJson = response.startsWith('"') && response.endsWith('"')
        ? response.slice(1, -1)
        : response;

        // Step 2: Parse the JSON
        const parsedData = cleanJson;

        response = parsedData

        // Send the response back to the main thread
        parentPort.postMessage({ success: true, response: response });
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