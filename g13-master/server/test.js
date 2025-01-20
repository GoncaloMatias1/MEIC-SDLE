const DynamoNode = require('./node');
const ConsistentHashRing = require('./consHashing');
const config = require('./config');
const hashRing = new ConsistentHashRing();
config.nodeList.forEach(node => {
    hashRing.addNode({
        id: node.id,
        host: node.host,
        port: node.port
    }, 3);  
});

console.log('Consistent hash ring created with nodes:', hashRing.printRing());


const nodes = {};
config.nodeList.forEach(nodeConfig => {
    nodes[nodeConfig.id] = new DynamoNode(nodeConfig.id, hashRing);
    console.log(`Node ${nodeConfig.id} initialized.`);
});

setTimeout(() => {
    console.log('\n[TEST] Simulating failure of node2...');

    if (nodes['node2']) {
        nodes['node2'].shutdown();
        nodes['node2'] = null;
        hashRing.removeNode('node2');
    }

    console.log('Nodes in hash ring after removing node2:', hashRing.printRing());
    console.log('Gossip handling should have completed by now.');
    console.log('Failed nodes reported by node1:', nodes['node1'] ? nodes['node1'].failedNodes : 'Node1 does not exist');
    console.log('Failed nodes reported by node3:', nodes['node3'] ? nodes['node3'].failedNodes : 'Node3 does not exist');
    
}, 10000);

setTimeout(() => {
    console.log('\n[TEST] Re-adding node2 after recovery...');
    const node2Config = config.nodeList.find(node => node.id === 'node2');
    if (node2Config) {
        const recoveredNode = new DynamoNode(node2Config.id, hashRing);
        nodes['node2'] = recoveredNode;
        hashRing.addNode({
            id: node2Config.id,
            host: node2Config.host,
            port: node2Config.port
        }, 3); 

        console.log('Nodes in hash ring after re-adding node2:', hashRing.printRing());
        
 

    }
}, 20000);
