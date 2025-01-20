const DynamoNode = require('./node');
const ConsistentHashRing = require('./consHashing');
const config = require('./config');

// Get node list from config.js
const nodeList = config.nodeList;

if (nodeList.length < 3) {
    console.error('At least 3 nodes are required in the node list in config.js');
    process.exit(1);
}

console.log('Node list from config:', nodeList);

const hashRing = new ConsistentHashRing();
nodeList.forEach(node => {
    hashRing.addNode({
        id: node.id,
        host: node.host,
        port: node.port
    }, 3); 
});

console.log('Consistent hash ring initialized with all nodes');
nodeList.forEach(node => {
    const currentNode = new DynamoNode(node.id, hashRing);
    console.log(`Node ${node.id} started`);
});

