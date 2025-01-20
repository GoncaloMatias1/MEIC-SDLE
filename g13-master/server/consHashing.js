const crypto = require('crypto');

class ConsistentHashRing {
    constructor() {
        this.ring = new Map(); 
        this.sortedHashes = []; // facilitar a K-t-N 
    }
    // VN para load balancing em larga escala 
    addNode(node, virtualNodes = 1) { // if called virtualNodes removeNode must have equal for balance purposes
        for (let i = 0; i < virtualNodes; i++) {
            const virtualId = `${node.id}#${i}`;
            const hash = this.hashNode(virtualId);
            if (!this.ring.has(hash)) {
                this.ring.set(hash, node);
                this.sortedHashes.push(hash);
            }
        }
        this.sortedHashes.sort((a, b) => a - b);
    }
    

    removeNode(nodeId, virtualNodes = 1) {
        for (let i = 0; i < virtualNodes; i++) {
            const virtualId = `${nodeId}#${i}`;
            const nodeHash = this.hashNode(virtualId);

            if (this.ring.has(nodeHash)) {
                this.ring.delete(nodeHash);
                const index = this.sortedHashes.indexOf(nodeHash);
                if (index !== -1) {
                    this.sortedHashes.splice(index, 1);
                }
                this.reassignData(nodeHash);
            }
        }
    }
    
    reassignData(nodeHash) {
        const index = this.sortedHashes.indexOf(nodeHash);
        let nextNode = this.sortedHashes[(index + 1) % this.sortedHashes.length];
        if (nextNode) {
            console.log(`Reassigning data to node with hash: ${nextNode}`);
        }
    }
    
    
    

    hashNode(nodeId) {
        const hash = crypto.createHash('sha1');
        hash.update(nodeId);
        return parseInt(hash.digest('hex').slice(0, 8), 16);
    }
    getReplicasForKey(key, N) {
        const hash = this.hashNode(String(key));
        const replicas = new Set();
        
        let idx = this.sortedHashes.findIndex(h => h >= hash);
        if (idx === -1) idx = 0; 
        
        for (let i = 0; i < this.sortedHashes.length && replicas.size < N; i++) {
            const nodeHash = this.sortedHashes[(idx + i) % this.sortedHashes.length];
            replicas.add(this.ring.get(nodeHash));
        }
    
        return Array.from(replicas).slice(0, N);
    }
    
    
    
    

    getKeysForNode(nodeId) {
        const affectedKeys = [];
        this.sortedHashes.forEach((hash) => {
            if (this.ring.get(hash).id === nodeId) {
                affectedKeys.push(hash);
            }
        });
        return affectedKeys;
    }
    printRing() {
        console.log('Consistent Hash Ring:');
        this.sortedHashes.forEach((hash, index) => {
            const node = this.ring.get(hash);
            console.log(`${index + 1}. Hash: ${hash.toString(16)} -> Node ID: ${node.id} (Host: ${node.host}, Port: ${node.port})`);
        });
        console.log(this.ring);  
    }
    
    
}

module.exports = ConsistentHashRing;
