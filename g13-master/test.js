const assert = require('assert');
const ConsistentHashRing = require('./server/consHashing.js');  // Assuming consHashing is the correct path

describe('ConsistentHashRing', function () {
    let ring;

    beforeEach(() => {
        // Create a new instance of the ring before each test
        ring = new ConsistentHashRing();
    });

    it('should add a node to the ring', function () {
        const node = { id: 'node1', host: 'localhost', port: 5001 };
        ring.addNode(node);
        
        const nodeHashes = Array.from(ring.ring.keys());
        assert(nodeHashes.length > 0);
        assert(ring.ring.has(ring.hashNode(node.id)));
    });

    it('should remove a node from the ring', function () {
        const node = { id: 'node1', host: 'localhost', port: 5001 };
        ring.addNode(node);
        ring.removeNode(node.id);
        
        const nodeHashes = Array.from(ring.ring.keys());
        assert(!nodeHashes.includes(ring.hashNode(node.id)));
    });

    it('should return the correct replicas for a key', function () {
        const node1 = { id: 'node1', host: 'localhost', port: 5001 };
        const node2 = { id: 'node2', host: 'localhost', port: 5002 };
        const node3 = { id: 'node3', host: 'localhost', port: 5003 };
        ring.addNode(node1);
        ring.addNode(node2);
        ring.addNode(node3);

        const replicas = ring.getReplicasForKey('shopping-list-id', 3);
        assert.strictEqual(replicas.length, 3);
    });
});
