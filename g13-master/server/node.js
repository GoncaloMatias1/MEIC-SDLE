const zmq = require('zeromq');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const Cart = require('../src/cdrt/Cart');
const ConsistentHashRing = require('./consHashing');
const { 
    retrieveItems, 
    createDB, 
    addList, 
    addItemToList, 
    deleteItemFromList, 
    getItemsFromAList, 
    deleteList, 
    updateDB, 
    CartFromDB, 
    printAllRows, 
    purchaseList 
} = require('../dbOperations.js');
const { fromJSON } = require('../src/cdrt/Cart.js');

class DynamoNode {
    constructor(nodeId, ring) {
        this.nodeId = nodeId;
        this.ring = ring; 

        this.nodeInfo = config.nodeList.find(n => n.id === nodeId);
        if (!this.nodeInfo) {
            throw new Error(`Node configuration not found for nodeId: ${nodeId}`);
        }
        
        // Enhanced Gossip Properties
        this.nodeHealth = {}; 
        this.HEARTBEAT_TIMEOUT = 6000; // 15 seconds without heartbeat considered a failure
        this.GOSSIP_INTERVAL = 5000; // 5 seconds between heartbeats
        this.failedNodes = new Set(); // Track failed nodes

        this.cart = new Cart(this.nodeId);
        console.log(`[${this.nodeId}] Node initialized with config:`, this.nodeInfo);

        this.setupSockets();
        this.setupDatabase();
        this.setupProxySocket();
        this.setupGossip();
    }

    async setupProxySocket() {
        this.proxySock = new zmq.Reply();
        await this.proxySock.connect('tcp://localhost:3003');
        console.log(`[${this.nodeId}] Connected to proxy Router at port 3003`);
        this.startProxyListener();
    }

    async startProxyListener() {
        for await (const [request] of this.proxySock) {
            console.log(`[${this.nodeId}] Received request: ${request.toString()}`);
            try {
                const json = JSON.parse(request.toString());
                const response = await this.handleRequest(json);


                // 
                await this.proxySock.send(response);
            } catch (error) {
                console.error(`[${this.nodeId}] Error processing request:`, error);
                await this.proxySock.send(JSON.stringify({ error: error.message }));
            }
        }
    }

    async setupSockets() {
        this.clientSocket = new zmq.Reply();
        await this.clientSocket.bind(`tcp://*:${this.nodeInfo.port}`);
        this.startListening();
    }

    setupDatabase() {
        this.db = new sqlite3.Database('../database/shoppinglist.db', (err) => {
            if (err) {
                console.error('Error connecting to database:', err);
            }
        });
    }

    async shutdown() {
        // Stop gossip and health monitoring intervals
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
            this.healthMonitorInterval = null;
        }
    
        // Close sockets if still open
        try {
            if (this.clientSocket) {
                this.clientSocket.close();
                this.clientSocket = null;
            }
            if (this.heartbeatPub) {
                this.heartbeatPub.close();
                this.heartbeatPub = null;
            }
            if (this.heartbeatSub) {
                this.heartbeatSub.close();
                this.heartbeatSub = null;
            }
            if (this.proxySock) {
                this.proxySock.close();
                this.proxySock = null;
            }
        } catch (error) {
            console.error(`[${this.nodeId}] Error during shutdown:`, error.message);
        }
    
        console.log(`[${this.nodeId}] Node shut down successfully.`);
    }
    
    

    async startListening() {
        for await (const [msg] of this.clientSocket) {
            const request = JSON.parse(msg.toString());
            console.log(`[${this.nodeId}] Received request:`, request);
            const response = await this.handleRequest(request);
            await this.clientSocket.send(JSON.stringify(response));
        }
    }

    async setupGossip() {
        this.maxPeers = 2; 
        this.heartbeatPub = new zmq.Publisher();
        await this.heartbeatPub.bind(`tcp://${this.nodeInfo.host}:${this.nodeInfo.gossipPort}`);
        console.log(`[${this.nodeId}] Heartbeat Publisher bound to port ${this.nodeInfo.gossipPort}`);
        this.heartbeatSub = new zmq.Subscriber();

        const otherNodes = config.nodeList.filter(node => node.id !== this.nodeId);
        const selectedPeers = otherNodes.sort(() => Math.random() - 0.5).slice(0, this.maxPeers); 

        for (const node of selectedPeers) {
            const gossipAddr = `tcp://${node.host}:${node.gossipPort}`;
            await this.heartbeatSub.connect(gossipAddr);
            console.log(`[${this.nodeId}] Subscribed to gossip on ${gossipAddr}`);
        }

        this.heartbeatSub.subscribe('ALIVE');
        this.startGossipListener();
        this.startHeartbeatEmitter();
        this.startHealthMonitor();
    }

    startHeartbeatEmitter() {
        this.heartbeatInterval = setInterval(() => {
            const message = `ALIVE ${this.nodeId} ${Date.now()}`;
            this.heartbeatPub.send(message);
            console.log(`[${this.nodeId}] Sent heartbeat`);
        }, this.GOSSIP_INTERVAL);
    }

    startHealthMonitor() {
        this.healthMonitorInterval = setInterval(() => {
            const currentTime = Date.now();
            for (const [nodeId, lastHeartbeat] of Object.entries(this.nodeHealth)) {
                if (currentTime - lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
                    if (!this.failedNodes.has(nodeId)) {
                        this.handleNodeFailure(nodeId);
                    }
                }
            }
        }, this.HEARTBEAT_TIMEOUT / 2); 
    }

    handleNodeFailure(nodeId) {
        console.error(`[${this.nodeId}] Node ${nodeId} has been detected as failed`);
        this.failedNodes.add(nodeId);
        delete this.nodeHealth[nodeId];
        this.triggerNodeReplacement(nodeId);
    }

    triggerNodeReplacement(failedNodeId) {
        if (this.failedNodes.has(failedNodeId)) {
            console.log(`[${this.nodeId}] Node ${failedNodeId} failure already handled.`);
            return;
        }
    
        this.failedNodes.add(failedNodeId);
        console.log(`[${this.nodeId}] Attempting to replace failed node ${failedNodeId}`);
        this.ring.removeNode(failedNodeId);
        this.redistributeData(failedNodeId);
    }
    

    redistributeData(failedNodeId) {
        const affectedKeys = this.ring.getKeysForNode(failedNodeId);
    
        console.log(`[${this.nodeId}] Redistributing ${affectedKeys.length} keys from failed node ${failedNodeId}`);
    
        affectedKeys.forEach(key => {
            // Filter replicas to exclude the failed node
            const newReplicas = this.ring.getReplicasForKey(key, 2).filter(replica => replica.id !== failedNodeId);
    
            newReplicas.forEach(replica => {
                if (replica.id !== this.nodeId) {
                    this.sendDataRedistributionRequest(replica, key);
                }
            });
        });
    }
    

    sendDataRedistributionRequest(replica, key) {
        try {
            const sock = new zmq.Request();
            sock.connect(`tcp://${replica.host}:${replica.port}`);
            
            const request = {
                type: 'redistributeData',
                key: key,
                sourceNodeId: this.nodeId
            };
            
            sock.send(JSON.stringify(request));
            
            console.log(`[${this.nodeId}] Sent redistribution request to ${replica.id} for key ${key}`);
        } catch (error) {
            console.error(`[${this.nodeId}] Failed to send redistribution request:`, error);
        }
    }

    async startGossipListener() {
        try {
            for await (const [msg] of this.heartbeatSub) {
                const message = msg.toString();
                const [status, nodeId, timestamp] = message.split(' ');

                if (status === 'ALIVE' && nodeId !== this.nodeId) {
                    const currentTime = parseInt(timestamp, 10);
                    if (this.failedNodes.has(nodeId)) {
                        console.log(`[${this.nodeId}] Node ${nodeId} has recovered`);
                        this.failedNodes.delete(nodeId);
                        this.handleNodeRecovery(nodeId);
                    }
                    this.nodeHealth[nodeId] = currentTime;
                    console.log(`[${this.nodeId}] Received heartbeat from ${nodeId} at ${new Date(currentTime).toISOString()}`);
                }
            }
        } catch (error) {
            console.error(`[${this.nodeId}] Error in gossip listener:`, error);
        }
    }

    handleNodeRecovery(nodeId) {
        console.log(`[${this.nodeId}] Initiating recovery procedures for node ${nodeId}`);
        const recoveredNode = config.nodeList.find(node => node.id === nodeId);
        if (recoveredNode) {
            this.ring.addNode({
                id: recoveredNode.id,
                host: recoveredNode.host,
                port: recoveredNode.port
            }, 3);
            this.synchronizeDataWithRecoveredNode(nodeId);
        }
    }

    synchronizeDataWithRecoveredNode(nodeId) {
        console.log(`[${this.nodeId}] Synchronizing data with recovered node ${nodeId}`);
        

        const recoveredNode = config.nodeList.find(node => node.id === nodeId);
        if (!recoveredNode) return;
        
        const keysToSync = this.ring.getKeysForNode(this.nodeId);
        
        keysToSync.forEach(key => {
            const request = {
                type: 'syncData',
                key: key,
                sourceNodeId: this.nodeId
            };
            
            try {
                const sock = new zmq.Request();
                sock.connect(`tcp://${recoveredNode.host}:${recoveredNode.port}`);
                sock.send(JSON.stringify(request));
                
                console.log(`[${this.nodeId}] Sent sync request for key ${key} to recovered node`);
            } catch (error) {
                console.error(`[${this.nodeId}] Failed to send sync request:`, error);
            }
        });
    }

    async handleRequest(request) {
        switch (request.type) {
            case 'mergeDB':
                return await this.handleMergeDB(request);
            case 'getDB':
                return await this.handleGetDB(request);
            case 'retrieveID':
                return await this.handleRetrieveID(request);
            case 'redistributeData': 
                return await this.handleRedistributeData(request);
            case 'syncData':
                return await this.handleSyncData(request); 
            
            default:
                return { error: 'Unknown request type' };
        }
    }

    async handleSyncData(request) {
        const { key, sourceNodeId } = request;

        console.log(`[${this.nodeId}] Syncing data for key: ${key} from source node ${sourceNodeId}`);

        try {
            // Acknowledge sync completion without actually handling data
            console.log(`[${this.nodeId}] Sync completed for key: ${key} from node ${sourceNodeId}`);
            return { status: 'Sync completed successfully' };
        } catch (error) {
            console.error(`[${this.nodeId}] Error during sync for key ${key}:`, error);
            return { error: `Error during sync: ${error.message}` };
        }
    }
    async fetchWithRetries(replica, request, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await this.fetchFromReplica(replica, request);
            } catch (error) {
                console.warn(`[${this.nodeId}] Attempt ${attempt}/${retries} to fetch from replica ${replica.id} failed.`);
                if (attempt === retries) throw error;
            }
        }
    }

    async fetchFromReplica(replica, request) {
        try {
            const sock = new zmq.Request();
            await sock.connect(`tcp://${replica.host}:${replica.port}`);
            await sock.send(JSON.stringify(request));
            const [response] = await sock.receive();
            return JSON.parse(response.toString());
        } catch (error) {
            throw new Error(`Error fetching data from replica ${replica.id}: ${error.message}`);
        }
    }

    async handleMergeDB(request) {
        try {
            const cart2 = Cart.fromJSON(request.data.cart);
            const cartDB = await CartFromDB(undefined);
            console.log(`[${this.nodeId}] Current Cart from DB:`, cartDB);
            for (let id of cart2.getDeletedLists()) {
                if (cartDB.ids.has(id)) {
                    cartDB.deleteList(id);
                    console.log(`[${this.nodeId}] CartDB after deleting list ${id}:`, cartDB);
                }
            }

            const carts = cart2.getLists();
            for (let [key, value] of carts) {
                if (cart2.deletedLists.has(key)) {
                    cartDB.deleteList(key);
                    console.log(`[${this.nodeId}] CartDB after deleting list ${key}:`, cartDB);
                } 
                let jsonToMerge = cart2.createJsonFromList(key);
                console.log(`[${this.nodeId}] JSON to merge:`, jsonToMerge);
                cartDB.merge(jsonToMerge);

            }
            cartDB.purchasedLists = new Set([...cartDB.purchasedLists, ...cart2.purchasedLists]);

            console.log("Cart for DB:", cartDB);
    
            await updateDB(undefined, cartDB);
    
            console.log(`[${this.nodeId}] Updated CartDB in database:`, cartDB);

            let carts_finale = Array.from([...cart2.ids]);
            carts_finale = carts_finale.filter(x => (!cart2.deletedLists.has(x) && !cart2.purchasedLists.has(x)));

            let cart_to_retrieve = cartDB.retrieveCartWithLists(new Set(carts_finale), cart2.owner);
    
            console.log(`[${this.nodeId}] Cart to retrieve:`, cart_to_retrieve);
    
            return cart_to_retrieve.toJSON()

        } catch (error) {
            console.error(`[${this.nodeId}] Error in handleMergeDB:`, error);
            return { error: error.message };
        }
    }

    async handleRedistributeData(request) {
        try {
            const { key, sourceNodeId } = request;
    
            // Get the replicas for this key to notify them (excluding source node)
            const replicas = this.ring.getReplicasForKey(key, 2).filter(replica => replica.id !== sourceNodeId);
    
            if (replicas.length === 0) {
                console.error(`[${this.nodeId}] No replicas available for key ${key}`);
                return { error: `No replicas found for key ${key}` };
            }
    
            // Notify each replica that the data redistribution has been handled
            for (const replica of replicas) {
                const notification = {
                    type: 'redistributionHandled',
                    key,
                    sourceNodeId: this.nodeId,
                };
    
                await this.sendRedistributionNotification(replica, notification);
            }
    
            return { success: `Redistribution request for key ${key} handled successfully.` };
        } catch (error) {
            console.error(`[${this.nodeId}] Error in handleRedistributeData:`, error);
            return { error: error.message };
        }
    }
    
    async sendRedistributionNotification(replica, notification) {
        try {
            const sock = new zmq.Request();
            await sock.connect(`tcp://${replica.host}:${replica.port}`);
            await sock.send(JSON.stringify(notification));
            console.log(`[${this.nodeId}] Sent notification to ${replica.id}:`, notification);
        } catch (error) {
            console.error(`[${this.nodeId}] Error sending redistribution notification to ${replica.id}:`, error);
        }
    }
    

    
    async handleGetDB(request) {
        try {
            // Retrieve replica nodes for the key (e.g., key can be the name of the list or table)
            const replicas = this.ring.getReplicasForKey(this.nodeId, 3); // 3 replicas, including primary node
            console.log(`[${this.nodeId}] Replicas for the key:`, replicas.map(replica => replica.id));
    
            let data = null;
            let success = false;
    
            // Attempt to get the data from replicas (start with this node)
            for (const replica of replicas) {
                try {
                    if (replica.id === this.nodeId) {
                        // If this is the current node, get data locally
                        data = await retrieveItems();
                    } else {
                        // If the replica is another node, send a request
                        data = await this.fetchWithRetries(replica, request);
                    }
    
                    if (data) {
                        success = true;
                        break;
                    }
                } catch (error) {
                    console.error(`[${this.nodeId}] Error retrieving data from replica ${replica.id}:`, error.message);
                }
            }
    
            if (!success) {
                console.error(`[${this.nodeId}] All replicas failed to respond.`);
                return { error: "Failed to retrieve data from all replicas" };
            }
    
            console.log(`[${this.nodeId}] Successfully retrieved data:`, data);
            return JSON.stringify(data);
    
        } catch (error) {
            console.error(`[${this.nodeId}] Error in handleGetDB:`, error.message);
            return { error: error.message };
        }
    }

    
    
    async handleRetrieveID(request) {
        try {
            const id = request.data.id;
            console.log(`[${this.nodeId}] Retrieving data for ID:`, id);
    
            const cartDB = await CartFromDB(undefined);  
            console.log(`[${this.nodeId}] Retrieved Cart from DB:`, cartDB);
    
            // Get the replicas for the given ID (use consistent hashing)
            const replicas = this.ring.getReplicasForKey(id, 2);  // Retrieve 2 replicas along with the primary node
    
            // Attempt to retrieve data from the node (including replicas)
            const fetchDataFromNode = async (node) => {
                // You could have some kind of logic here to check if a node is available (you might even attempt retry logic)
                console.log(`[${this.nodeId}] Attempting to retrieve data from: ${node.id}`);
                try {
                    // Simulating the data retrieval, it could be an API call or a direct database call
                    if (cartDB.ids.has(id)) {
                        let cartToRetrieve = cartDB.retrieveCartWithLists(new Set([id]), request.data.owner);
                        return cartToRetrieve.toJSON();
                    } else {
                        console.log(`[${this.nodeId}] ID ${id} not found in CartDB at ${node.id}`);
                    }
                } catch (err) {
                    console.log(`[${this.nodeId}] Error retrieving from node ${node.id}:`, err.message);
                }
            };
    
            // First try the primary node (usually, node responsible for the hash)
            let response = await fetchDataFromNode({ id: this.nodeId }); // Current node
            if (response) {
                return response; // Return immediately if data is found in this node
            }
    
            // Then try the replicas
            for (const replica of replicas) {
                response = await fetchDataFromNode(replica);
                if (response) {
                    return response; // Return as soon as data is found
                }
            }
    
            // If we exhausted all replicas and found no data
            console.log(`[${this.nodeId}] ID ${id} not found in the database across replicas.`);
            return { error: `ID ${id} not found across primary and replicas` };
    
        } catch (error) {
            console.error(`[${this.nodeId}] Error in handleRetrieveID:`, error);
            return { error: error.message };
        }
    }
    
    
}

module.exports = DynamoNode;
