/*
const ConsistentHashRing = require('./consHashing');


const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.removeNode('node1');
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });
ring.addNode({ id: 'node4', host: 'localhost', port: 5004 });
ring.removeNode('node2');
ring.addNode({ id: 'node5', host: 'localhost', port: 5005 });




console.log(ring.printRing()); // Validate node addition
console.log(ring.getReplicasForKey('anotherKey', 3));
*/

/*
const ConsistentHashRing = require('./consHashing');

// Step 1: Initialize the ring and add multiple nodes
const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });

// Step 2: Verify the order of sorted hashes
console.log('Initial Hash Ring:');
ring.printRing();  // This will show the sorted hashes and their nodes

// Step 3: Generate keys and check node assignment
const key1 = 'testKey1';
const key2 = 'testKey2';
console.log(`Replicas for key '${key1}':`, ring.getReplicasForKey(key1, 3));
console.log(`Replicas for key '${key2}':`, ring.getReplicasForKey(key2, 3));

// Step 4: Remove a node and verify redistribution of keys
console.log('\nRemoving node1...');
ring.removeNode('node1');
console.log('Updated Hash Ring after node1 removal:');
ring.printRing();

console.log(`Replicas for key '${key1}' after node1 removal:`, ring.getReplicasForKey(key1, 3));
console.log(`Replicas for key '${key2}' after node1 removal:`, ring.getReplicasForKey(key2, 3));
*/

/*
const ConsistentHashRing = require('./consHashing');

// Initialize the ring with two nodes
const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });

console.log("Initial Hash Ring:");
ring.printRing();

// Generate keys before adding a new node
console.log("Replicas for 'keyA' before adding new node:", ring.getReplicasForKey('keyA', 3));
console.log("Replicas for 'keyB' before adding new node:", ring.getReplicasForKey('keyB', 3));

// Add a new node
console.log("\nAdding node3...");
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });

console.log("Updated Hash Ring:");
ring.printRing();

// Check replicas for the same keys after adding the new node
console.log("Replicas for 'keyA' after adding new node:", ring.getReplicasForKey('keyA', 3));
console.log("Replicas for 'keyB' after adding new node:", ring.getReplicasForKey('keyB', 3));
*/

/*
const ConsistentHashRing = require('./consHashing');


const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });
console.log("Initial Hash Ring:");
ring.printRing();
console.log("Replicas for 'keyX':", ring.getReplicasForKey('keyX', 3));
console.log("Replicas for 'keyY':", ring.getReplicasForKey('keyY', 3));
console.log("\nRemoving node2...");
ring.removeNode('node2');
console.log("Updated Hash Ring:");
ring.printRing();
console.log("Replicas for 'keyX' after removing node2:", ring.getReplicasForKey('keyX', 3));
console.log("Replicas for 'keyY' after removing node2:", ring.getReplicasForKey('keyY', 3));
*/


/*
const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();
const numNodes = 10;
const numKeys = 1000;


for (let i = 1; i <= numNodes; i++) {
    ring.addNode({ id: `node${i}`, host: 'localhost', port: 5000 + i }, 10); 
}

console.log("Nodes added to the ring.");
ring.printRing();
const keyCounts = {};
for (let i = 1; i <= numNodes; i++) {
    keyCounts[`node${i}`] = 0;
}

for (let i = 1; i <= numKeys; i++) {
    const key = `key${i}`;
    const replicas = ring.getReplicasForKey(key, 1); 
    keyCounts[replicas[0].id]++;
}

console.log("Key distribution across nodes:");
console.log(keyCounts);

*/

/*
const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });
ring.addNode({ id: 'node4', host: 'localhost', port: 5004 });
ring.addNode({ id: 'node5', host: 'localhost', port: 5005 });

console.log("Initial Hash Ring:");
ring.printRing();

// Generate some keys
const keys = ['key1', 'key2', 'key3', 'key4', 'key5'];
keys.forEach((key) => {
    console.log(`Replicas for '${key}' before failure:`, ring.getReplicasForKey(key, 3));
});

// Remove two nodes
console.log("\nSimulating failure of node2 and node4...");
ring.removeNode('node2');
ring.removeNode('node4');

console.log("\nUpdated Hash Ring:");
ring.printRing();

// Check key replicas again
keys.forEach((key) => {
    console.log(`Replicas for '${key}' after failure:`, ring.getReplicasForKey(key, 3));
});

*/

/*
const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });

console.log("Initial Hash Ring:");
ring.printRing();

const key = 'testKey';
console.log(`Replicas for '${key}' before removing node2:`, ring.getReplicasForKey(key, 3));

// Remove a node
console.log("\nRemoving node2...");
ring.removeNode('node2');

console.log("\nUpdated Hash Ring:");
ring.printRing();
console.log(`Replicas for '${key}' after removing node2:`, ring.getReplicasForKey(key, 3));

// Re-add the same node
console.log("\nRe-adding node2...");
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });

console.log("\nUpdated Hash Ring:");
ring.printRing();
console.log(`Replicas for '${key}' after re-adding node2:`, ring.getReplicasForKey(key, 3));
*/




/*

const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
ring.addNode({ id: 'node2', host: 'localhost', port: 5002 });
ring.addNode({ id: 'node3', host: 'localhost', port: 5003 });
ring.addNode({ id: 'node4', host: 'localhost', port: 5004 });

console.log("Initial Hash Ring:");
ring.printRing();

const key = 'testKey';
[1, 2, 3, 4].forEach((n) => {
    console.log(`Replicas for '${key}' with N=${n}:`, ring.getReplicasForKey(key, n));
});

*/

/*
const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();

// Case 1: Single node
ring.addNode({ id: 'node1', host: 'localhost', port: 5001 });
console.log("Single-node Hash Ring:");
ring.printRing();
console.log("Replicas for 'key':", ring.getReplicasForKey('key', 3));

// Case 2: Many nodes
console.log("\nAdding 100 nodes...");
for (let i = 2; i <= 100; i++) {
    ring.addNode({ id: `node${i}`, host: 'localhost', port: 5000 + i });
}
console.log("Large Hash Ring:");
ring.printRing();
console.log("Replicas for 'key':", ring.getReplicasForKey('key', 3));
*/

/*
const ConsistentHashRing = require('./consHashing');

const ring = new ConsistentHashRing();
const numNodes = 100;
const numKeys = 10000;

console.time("Adding nodes");
for (let i = 1; i <= numNodes; i++) {
    ring.addNode({ id: `node${i}`, host: 'localhost', port: 5000 + i });
}
console.timeEnd("Adding nodes");

console.time("Distributing keys");
for (let i = 1; i <= numKeys; i++) {
    const key = `key${i}`;
    ring.getReplicasForKey(key, 3);
}
console.timeEnd("Distributing keys");
*/