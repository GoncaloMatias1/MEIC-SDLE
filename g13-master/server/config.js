const config = {
    N: 3,  // Number of replicas
    R: 2,  // Number of replicas needed for successful read
    W: 2,  // Number of replicas needed for successful write
    ports: {
        clientRequests: 5555,
        interNodeComm: 5556
    },
    nodeList: [
        { id: 'node1', host: 'localhost', port: 5001, gossipPort: 6001 },
        { id: 'node2', host: 'localhost', port: 5002, gossipPort: 6002 },
        { id: 'node3', host: 'localhost', port: 5003, gossipPort: 6003 }
    ],
    pubSubPorts: {
        base: 7000  
    }
};

module.exports = config;