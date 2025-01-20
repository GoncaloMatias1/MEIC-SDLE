// Hello World server in Node.js
// Connects REP socket to tcp://*:5560
// Expects "Hello" from client, replies with "World"

/**
 * Each request should be an JSON object with the following structure:
 * type: string -> The type of the request.
 * data: JSON object -> The data to be processed.
 * Example:
 * type: "updateDB"
 * data: { cart: (cart object) }
 */

const { Cart, fromJSON } = require('../cdrt/Cart.js');
const zmq = require("zeromq");
const {retrieveItems, createDB, addList, addItemToList, deleteItemFromList, getItemsFromAList,deleteList,updateDB, CartFromDB, printAllRows, purchaseList } = require('../../dbOperations.js');
const { up } = require("inquirer/lib/utils/readline");

(async () => {
  const sock = new zmq.Reply();
  sock.connect("tcp://localhost:3003"); // Connect to proxy's DEALER

  for await (const [request] of sock) {
    console.log("Processing request:", request.toString());

    let json = JSON.parse(request.toString());
    let option = json.type;
    switch (option) {
        case "updateDB":
            let cart = fromJSON(json.data.cart);
            console.log(cart)
            await updateDB(undefined, cart);
            await sock.send("Data updated!");
            console.log("Data updated!");
            break;
        case "mergeDB":

            // Get the cart from the JSON object
            let cart2 = fromJSON(json.data.cart);

            // Get the cart from the database
            let cartDB = await CartFromDB(undefined);
            console.log(cartDB)

            // Delete lists in CartDB mentioned by cart2
            for(let id of cart2.getDeletedLists()){
                if(cartDB.ids.has(id)) {
                    cartDB.deleteList(id);
                    console.log("CartDB after delete:", cartDB)
                    continue;
                }
            }

            // Get the lists from the cart
            let carts = cart2.getLists();

            // Merge the lists, merge only the lists that are not in the database
            for(let [key, value] of carts){
                // List was deleted, so we simply remove it
                if(cart2.deletedLists.has(key)){
                    cartDB.deleteList(key);
                    console.log("CartDB after delete:", cartDB)
                    continue;
                }

                let json_to_merge = cart2.createJsonFromList(key)
                console.log("Json to merge:", json_to_merge)
                cartDB.merge(json_to_merge)
            }
            // Add purchased lists knowledge to server
            cartDB.purchasedLists = new Set([...cartDB.purchasedLists, ...cart2.purchasedLists]);

            console.log("Cart for DB:", cartDB);

            // Add deleted lists knowledge to server
            // cartDB.deletedLists = new Set([...cartDB.deletedLists, ...cart2.deletedLists]);
            
            // Update the database with the new cart
            await updateDB(undefined, cartDB);

            // Get only the ids that are not deleted
            let carts_finale = Array.from([...cart2.ids]);
            carts_finale = carts_finale.filter(x => (!cart2.deletedLists.has(x) && !cart2.purchasedLists.has(x)));


            // Retrieve the cart with the lists that the user has
            let cart_to_retrieve = cartDB.retrieveCartWithLists(new Set(carts_finale), cart2.owner);

            console.log("Cart to retrieve:", cart_to_retrieve)
            // Retrieve the cart of the ids that the user has
            await sock.send(cart_to_retrieve.toJSON());
            console.log("Data merged!");
            break;
        case "retrieveID":
            // Get the id from the JSON 
            let id = json.data.id;

            // Get the cart from the database
            let cartDB_to_id = await CartFromDB(undefined);

            // Check if the id is in the database
            if(cartDB_to_id.ids.has(id)){
                
                // Retrieve the cart with the id
                let cart_to_retrieve = cartDB_to_id.retrieveCartWithLists(new Set([id]), json.data.owner);
                await sock.send(cart_to_retrieve.toJSON());
            }
            else{
                await sock.send("ID not found!");
            }
            break;
        case "getDB":
            // We want to get the items which do not have an list_url
            let items = await retrieveItems(undefined);
            await sock.send(JSON.stringify(items));
            break;
        default:
            await sock.send("Invalid request");
            break;
        }
    //const response = `Data response for ${request}`;
    //await sock.send(response);
  }
})();