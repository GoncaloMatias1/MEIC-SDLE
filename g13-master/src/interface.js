const inquirer = require('inquirer');
const { Worker } = require('worker_threads');
const Cart = require('./cdrt/Cart.js');
const {retrieveItems, createDB, getRowsNull, insertRowsNull, addList, addItemToList, deleteItemFromList, getItemsFromAList,deleteList,updateDB, CartFromDB, printAllRows, purchaseList } = require('../dbOperations.js');

let cart_to_test = new Cart();
let username = '';

const syncWithServerDB = (cart_to_test) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./src/worker/DBWorker.js');

        // Listen for messages from the worker
        worker.on('message', (message) => {
            if (message.success) {

                console.log("Sync completed successfully:", message.response);
                resolve(Cart.fromJSON(message.response));
            } else {
                worker.terminate();
                console.error("Sync failed:", message.error);
                reject(new Error(message.error));
            }
        });

        // Listen for errors
        worker.on('error', (error) => {
            console.error("Worker error:", error);
            worker.terminate();
            reject(error);
        });

        // Listen for worker exit
        worker.on('exit', (code) => {
            if (code !== 0) {
                worker.terminate();
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });

        // Send data to the worker
        worker.postMessage(cart_to_test.toJSON());
    });
};

const retrieveServerIDs = (id, owner) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./src/worker/idWorker.js');

        // Listen for messages from the worker
        worker.on('message', (message) => {
            if (message.success) {
                worker.terminate();
                if(message.response === "ID not found!"){
                    reject(new Error("ID not found!"));
                }
                else{
                    console.log("Sync completed successfully:", message.response);
                    resolve(Cart.fromJSON(message.response));
                }
            } else {
                worker.terminate();
                console.error("Sync failed:", message.error);
                reject(new Error(message.error));
            }
        });

        // Listen for errors
        worker.on('error', (error) => {
            console.error("Worker error:", error);
            worker.terminate();
            reject(error);
        });

        // Listen for worker exit
        worker.on('exit', (code) => {
            if (code !== 0) {
                worker.terminate();
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });

        // Send data to the worker
        worker.postMessage({ id, owner });
    });
};

const getInitialDB = () => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./src/worker/getDBWorker.js');

        // Listen for messages from the worker
        worker.on('message', (message) => {
            if (message.success) {

                if(message.response === "ID not found!"){
                    reject(new Error("ID not found!"));
                }
                else{
                    console.log("Sync completed successfully:", message.response);
                    resolve(JSON.parse(message.response));
                }
            } else {
                worker.terminate();
                console.error("Sync failed with", message.error);
                reject(new Error(message.error));
            }
        });

        // Listen for errors
        worker.on('error', (error) => {
            console.error("Worker error:", error);
            worker.terminate();
            reject(error);
        });

        // Listen for worker exit
        worker.on('exit', (code) => {
            if (code !== 0) {
                worker.terminate();
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });

        // Send data to the worker
        worker.postMessage({});
    });
};

const initialSetup = async () => {
    username = await inquirer.prompt([
        {
            type: 'input',
            name: 'username',
            message: 'Enter your username:',
        },
    ]);

    let items = undefined;
    // Connect to Server
    try{
        items = await getInitialDB();
    }
    catch (err){
        if(err.message !== 'Operation timed out'){
            console.error('Error:', err.message);
        }
    }
    try{

        console.log(username)
        // If DB does not exist, create it
        await createDB(username.username, items || undefined);
        // Get the cart from the DB
        cart_to_test = await CartFromDB(username.username);
        
    }
    catch (err){
        console.error('Error accessing new user', err);
        process.exit()
    }
    username = username.username;
    await mainMenu();
};

const mainMenu = async () => {
    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'Create Shopping List',
                'Modify Shopping List',
                'Delete Shopping List',
                'Sync with Server',
                'Get all lists',
                'Exit',
            ],
        },
    ]);
    switch (action) {
        case 'Create Shopping List':
            await createShoppingList();
            break;
        case 'Modify Shopping List':
            await modifyShoppingList();
            break;
        case 'Delete Shopping List':
            await deleteShoppingList();
            break;
        case 'Sync with Server':

            
            // Server Sync
            try{
                cart_to_test = await syncWithServerDB(cart_to_test);
            }
            catch (err){
                if(err.message !== 'Operation timed out'){
                    console.error('Error:', err.message);
                }
                break;
            }
            // Update own DB
            try{
                await updateDB(username, cart_to_test);
                //cart_to_test = await CartFromDB(username);
            }
            catch (err){
                console.error('Error updating DB', err);
                break;
            }

            try{
                let rows = await getRowsNull(undefined)
                await insertRowsNull(username,rows)
            }
            catch (err){
                console.error('Error updating DB', err);
                break;
            }

            break;

        case "Get all lists":


                let lists = cart_to_test.getListsWithAOwner(username);

                //If there are no lists, print a message
                if (lists.size === 0) {
                    console.log('No lists with the owner selected!');
                    break;
                }
                //Print all lists
                lists.forEach((value, key) => {
                    console.log(key + " -> " + value.toString());
                }
                );
                break;
        case 'Exit':
            process.exit();
            
    }

    await mainMenu();
};

const createShoppingList = async () => {

        
        //Maybe just add the list to the cart and then sync with the server and then update the DB
        let id = cart_to_test.createList()
        try {
            await addList(username,id);
        } catch (err) {
            console.error('Error creating DB', err);
            return;
        }
        console.log(`Shopping list of "${username}" created, with id (remember to store it): ${id}`); 
        

        await mainMenu();
    
};

const modifyShoppingList = async () => {
    const { listId } = await inquirer.prompt([
        {
            type: 'input',
            name: 'listId',
            message: 'Which shopping list ID would you like to modify?'
        },
    ]);

    //TODO: We need to do a request to the server to check whether there is a list on another user's cart
    if (!cart_to_test.checkList(listId)) {
        try {
            // Call the function with a timeout
            const cart_new = await retrieveServerIDs(listId, username);
            
            // Merge the lists
            let json_result = cart_new.createJsonFromList(listId);
            cart_to_test.merge(json_result);
    
            console.log("The list you requested was not yours, but it was retrieved from the server and merged with your cart");
    
            // Update the DB
            try {
                await updateDB(username, cart_to_test);
            } catch (err) {
                console.error('Error updating DB', err);
                return;
            }
        } catch (err) {
            if(err.message !== 'Operation timed out'){
                console.error('ID not found or other error:', err);
            }
            return;
        }
    }

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: `What would you like to do with "${listId}"?`,
            choices: ['Add Items / Change Quantity', 'Delete Items', 'Purchase List', 'Back'],
        },
    ]);

    switch (action) {
        case 'Add Items / Change Quantity':
            await addItems(listId);
            break;
        case 'Delete Items':
            await deleteItems(listId);
            break;
        case 'Purchase List':

            try{
                await purchaseList(username,listId);
            }
            catch (err){
                console.error('Error purchasing the list', err);
                return;
            }

            // Delete the list from the cart
            //cart_to_test.deleteList(listId);
            cart_to_test.purchaseList(listId);


            try {
                cart_to_test = await syncWithServerDB(cart_to_test); // This will run in a separate thread
                
            } catch (err) {
                console.error("Sync process failed:", err.message);
            }


            try{
                await updateDB(username, cart_to_test);
            }
            catch (err){
                console.error('Error updating DB server', err);
                return;
            }
            
            console.log(`Shopping list "${listId}" purchased`);
        case 'Back':
            return;
    }
};

const addItems = async (listName) => {

    let items_to_buy = [];

    try {
        const rows = await retrieveItems();
        items_to_buy = rows.map((row) => row.description); // Extract descriptions from the retrieved items
    } catch (err) {
        console.error('Error fetching items:', err);
        return;
    }

    if (items_to_buy.length === 0) {
        console.log('No items available to add.');
        return;
    }

    
    const { items } = await inquirer.prompt([
        {
            type: 'list',
            name: 'items',
            message: 'Enter items to add / change quantity:',
            choices: items_to_buy,
        },
    ]);
    const { quantity } = await inquirer.prompt([
        {
            type: 'input',
            name: 'quantity',
            message: 'Enter the quantity of the item:',
        },
    ]);
    //console.log(items)
    if (!/^-?\d+$/.test(quantity)) {
        console.log('Please specify a integer number.');
        return;
    }else if (parseInt(quantity) <= 0) {
        console.log('Added too few items.');
        return;
    }else if (parseInt(quantity) > 100) {
        console.log('Added too many items.');
        return;
    }
    // First - Treat own Cart
    try {
        // TODO:
        // Buscar o added e o deleted do item
        // A quantidade atual comparada a do user
        console.log(listName)
        console.log(items)
        let counter = await cart_to_test.retrieveCounterForItem(listName,items)
        console.log(counter)
        if(quantity < (counter.added.value-counter.deleted.value)){
            await cart_to_test.addItemToList(listName, items, counter.added.value, counter.deleted.value+((counter.added.value-counter.deleted.value)-quantity));
        } else {
            await cart_to_test.addItemToList(listName, items, counter.added.value+(quantity-(counter.added.value-counter.deleted.value)), counter.deleted.value);
        }
        //await addItemToList(name, listName, items, quantity);
        
    }
    catch (err) {
        console.error('Error adding items:', err);
        return;
    }

    // Third - Update the DB
    try{
        await updateDB(username, cart_to_test);
    }
    catch (err){
        console.error('Error updating DB server', err);
        return;
    }


    console.log(`Items added to / changed in "${listName}".`);
};

const deleteItems = async (listName) => {

    let items_to_delete = [];

    try {
        const rows = await getItemsFromAList(username, listName);
        items_to_delete = rows.map((row) => row.description); // Extract descriptions from the retrieved items
    } catch (err) {
        console.error('Error fetching items:', err);
        return;
    }

    if (items_to_delete.length === 0) {
        console.log('No items available to remove.');
        return;
    }

    const { itemsToDelete } = await inquirer.prompt([
        {
            type: 'list',
            name: 'itemsToDelete',
            message: 'Select items to delete:',
            choices: items_to_delete,
        },
    ]);
    try {
        //await addItemToList(name, listName, items, quantity);
        await cart_to_test.removeItemFromList(listName, itemsToDelete, null);
    }
    catch (err) {
        console.error('Error adding items:', err);
        return;
    }


    try{
        await updateDB(username, cart_to_test);
    }
    catch (err){
        console.error('Error updating DB', err);
        return;
    }
    
    console.log('Selected items removed.');
};

const deleteShoppingList = async () => {
    const { listName } = await inquirer.prompt([
        {
            type: 'input',
            name: 'listName',
            message: 'Which shopping list would you like to delete? (Insert ID)',
        },
    ]);

    try {
        await cart_to_test.deleteList(listName);
    }
    catch (err) {
        console.error('Error delete list', err);
        return;
    }


    try {
        console.log(cart_to_test)
        cart_to_test = await syncWithServerDB(cart_to_test); // This will run in a separate thread
        
    } catch (err) {
        console.error("Sync process failed:", err.message);
    }


    try{
        await updateDB(username, cart_to_test);
    }
    catch (err){
        console.error('Error updating DB server', err);
        return;
    }
    
};

initialSetup();