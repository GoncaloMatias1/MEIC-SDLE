const AWORSET = require('./AWORSET.js');
//let ids = new Set();
module.exports = class Cart {
    constructor(owner) {
      this.owner = owner;
      this.lists = new Map();
      this.listsChanged = false;
      this.deletedLists = new Set();
      this.ids = new Set();
      this.purchasedLists = new Set();
    }
    makeid(length) {

        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }
    createList(owner){
        this.listsChanged = true;
        let id = this.makeid(10);
        //Needs to be checked if the id already exists
        while(this.ids.has(id)){
            id = this.makeid(10);
        }
        this.ids.add(id);

        this.lists.set(id,new AWORSET(owner || this.owner, this.owner, id));
        return id;
    }
    createListWithId(owner, id){
        this.ids.add(id);
        this.listsChanged = true;
        this.lists.set(id,new AWORSET(owner || this.owner, this.owner, id));
        return id;
    }
    async deleteList(url){
        this.listsChanged = true;
        this.deletedLists.add(url);
        this.lists.delete(url);
    }

    async purchaseList(url){
        this.listsChanged = true;
        this.lists.delete(url);
        this.purchasedLists.add(url);
    }
    /**
     *Add an item to a list
     *Item must be his name
     *Quantity is the current quantity of the item
     */
    async addItemToList(url, item, added, deleted){
        //console.log(this.lists.get(url))
        this.listsChanged = true;
        let aqui = this.lists.get(url);
        let counter = aqui.getCounter(item);
        // May give error
        aqui.add(item,added,deleted)
        this.lists.set(url, aqui);
        
    }
    // Remove an item from a list
    // Item must be his name
    // Quantity is the current quantity of the item
    async removeItemFromList(url, item, quantity){
        this.listsChanged = true;
        let aqui = this.lists.get(url)
        aqui.removeWithoutQuantity(item);
        this.lists.set(url, aqui);
    }

    // Check if item in list
    // Item must be his name
    checkItemInList(url, item){
        let aqui = this.lists.get(url)
        return aqui.inAdapted(item);
    }

    /**
     * Update the quantity of an item in a list
     * Item must be his name
     * Quantity is the new current quantity of the item
     */ 
    updateItemQuantity(url, item, added, deleted){
        this.listsChanged = true
        /*if(this.checkItemInList(url, item)){
            if(quantity === null){
                let items = this.getItems(url);
                for(const item of items){
                    let item_info = item.split("-");
                    if(item_info[0] === item){
                        quantity = item_info[1];
                        break;
                    }
                }
            }
            this.removeItemFromList(url, item, quantity);
           }*/ 
        this.addItemToList(url, item, added,deleted);     
    }
    /**
     * Check if the list exists
     * @param {Url} url of the list
     * @returns 
     */
    checkList(url){
        
        return this.lists.has(url);
    }

    getItems(url){
        return this.lists.get(url).read();
    }

    addId(id){ 
        this.ids.add(id);
    }
    //
    // We will use this function to do everything
    // Cart is a json object with:
    // Id: The id of the list
    // Item: The name of the item 
    // Quantity: The quantity of the item
    // Like this
    /**
    {
        "owner": "owner",
        "id": "id",
        "items": [
        {
            "name": "item",
            "quantity": "quantity"
         },
        {
            "name": "item",
            "quantity": "quantity"
       }
        ]
        deleted: true or false  
    }*/
    //   
    merge(cart){
        this.listsChanged = true;
        let cart_info = JSON.parse(cart);
        let id = cart_info.id;
        let items = cart_info.items;
        let list = this.lists.get(id);
        let owner = cart_info.owner

        

        //If does not exist create it
        if(!list){
            id = this.createListWithId(cart_info.owner,id);
            list = this.lists.get(id);
        }
        // There is the possibility the list is deleted
        if((cart_info.deleted && !this.deletedLists.has(id)) || (!cart_info.deleted && this.deletedLists.has(id))){
            this.deleteList(id);
            this.deletedLists.add(id);
        }

        // There is the possibility the list is purchased
        else if((cart_info.purchased && !this.purchasedLists.has(id)) || (!cart_info.purchased && this.purchasedLists.has(id))){
            this.purchaseList(id);
        }

        //If not deleted, let's merge
        else{
            // Create AWORSET for merge
            const cart_to_merge = new AWORSET(owner || this.owner, this.owner, id);

            

            // Add each item
            for(const item of items){
                
                cart_to_merge.add(item.name,item.added,item.deleted)
            }

            // Join Or Merge
            list.join(cart_to_merge)
            this.lists.set(id,list);
        }
        return id;
        
    }
    /** Function to create a json object from a list
    {
        "owner": "owner",
        "id": "id",
        "items": [
        {
            "name": "item",
            "quantity": "quantity"
         },
        {
            "name": "item",
            "quantity": "quantity"
       }
        ]    
    }*/
    createJsonFromList(url){
        let list = this.lists.get(url);
        if(list === undefined){
            let json = {
                "owner": list.owner || this.owner,
                "id": url,
                "items": [],
                "deleted": true,
                "purchased": false
            }
            return JSON.stringify(json);
        }
        let items = list.read();
        let json = {
            "owner": list.owner || this.owner,
            "id": url,
            "items": [],
            "deleted": false,
            "purchased": this.purchasedLists.has(url) ? true : false
        }
        for(const item of items){
            const item_info = item;
            json.items.push({
                "name": item_info[0],
                "added": item_info[1].added.value,
                "deleted": item_info[1].deleted.value
            })
        }
        //Convert to json
        const jsonString = JSON.stringify(json);
        return jsonString
    }

    /**
     * Check if the lists changed
     * @returns true if the lists changed, false otherwise
     */
    changed(){
        const change = this.listsChanged;
        this.listsChanged = false;
        return change;
    }

    /**
     * Get the Deleted Lists and clear the list
     * @returns the deleted lists
     */
    getDeletedLists(){
        const deletedLists = this.deletedLists;
        //this.deletedLists = new Set();
        return deletedLists;
    }

    /**
     * Get the Purchased Lists and clear the list
     * @returns the purchased lists
     */
    getPurchasedLists(){
        const purchasedLists = this.purchasedLists;
        //this.purchasedLists = new Set();
        return purchasedLists;
    }

    

    /**
     * Get the lists
     * @returns the lists
     */
    getLists(){
        return this.lists;
    }

    getListsWithAOwner(owner){
        let lists = new Map();
        for(let [key, value] of this.lists){
            if(value.id === owner){
                lists.set(key, value);
            }
        }
        return lists;
    }
    // Serialize the Cart object to JSON
    toJSON() {
        return JSON.stringify({
          owner: this.owner,
          lists: Array.from(this.lists.entries()).map(([id, aworset]) => ({
            id,
            aworset: aworset.toJSON(), // Serialize the entire AWORSet
          })),
          listsChanged: this.listsChanged,
          deletedLists: Array.from(this.deletedLists),
          purchasedLists: Array.from(this.purchasedLists),
          ids: Array.from(this.ids),
        });
      }
      

    static fromJSON(json) {
        const data = JSON.parse(json);
        const cart = new Cart(data.owner);
        cart.lists = new Map(data.lists.map(list => [list.id, AWORSET.fromJSON(list.aworset)])); // Deserialize AWORSet
        cart.listsChanged = data.listsChanged;
        cart.deletedLists = new Set(data.deletedLists);
        cart.purchasedLists = new Set(data.purchasedLists);
        cart.ids = new Set(data.ids);
        return cart;
      }

      /**
       * Retrieves a copy of the cart but only with the lists that have the ids in the list
       * @param {Array} ids List of ids to retrieve 
       * @param {String} owner Owner of the lists
       */
      retrieveCartWithLists(ids, owner){
        // Cop
        let cart = new Cart(owner);
        for(let [key, value] of this.lists){
            if(ids.has(key)){
                cart.createListWithId(value.owner, key);
                let items = value.read();
                for(const item of items){
                    let item_info = item;
                    cart.addItemToList(key, item_info[0], item_info[1].added.value, item_info[1].deleted.value);
                }
            }
        }
        // Possibly, need to add parameters
        cart.ids = new Set(ids);
        cart.purchasedLists = this.purchasedLists
        cart.deletedLists = this.deletedLists
        return cart

      }

      /**
       * Retrieves a list with a specified id
       */
        retrieveList(id){
            return this.lists.get(id);
        }

        /**
         * Retrieves the counter for a item of a id
         */
        async retrieveCounterForItem(url,itemName){
            return this.lists.get(url).getCounter(itemName)
        }
        
      
}
