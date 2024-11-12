const AWORSET = require('./AWORSET.js');

module.exports = class Cart {
    constructor(owner) {
      this.owner = owner;
      this.lists = new Map();
      this.listsChanged = false;
      this.deletedLists = new Set();
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
        //TODO: Needs to be checked if the id already exists
        this.lists.set(id,new AWORSET(owner || this.owner));
        return id;
    }
    createListWithId(owner, id){
        this.listsChanged = true;
        this.lists.set(id,new AWORSET(owner || this.owner));
        return id;
    }
    deleteList(url){
        this.listsChanged = true;
        this.deletedLists.add(url);
        this.lists.delete(url);
    }
    // Add an item to a list
    // Item must be his name
    // Quantity is the current quantity of the item
    addItemToList(url, item, quantity){
        //console.log(this.lists.get(url))
        this.listsChanged = true;
        let aqui = this.lists.get(url)
        aqui.add(item + "-" + quantity.toString());
        this.lists.set(url, aqui);
        
    }
    // Remove an item from a list
    // Item must be his name
    // Quantity is the current quantity of the item
    removeItemFromList(url, item, quantity){
        this.listsChanged = true;
        let aqui = this.lists.get(url)
        if(quantity === null){
            aqui.removeWithoutQuantity(item);
        }
        else{
            aqui.remove(item + "-" + quantity.toString());
        }
        this.lists.set(url, aqui);
    }

    // Check if item in list
    // Item must be his name
    checkItemInList(url, item){
        let aqui = this.lists.get(url)
        return aqui.inAdapted(item);
    }

    // Update the quantity of an item in a list
    // Item must be his name
    // Quantity is the new current quantity of the item
    updateItemQuantity(url, item, new_quantity, quantity = null){
        this.listsChanged = true
        if(this.checkItemInList(url, item)){
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
           } 
        this.addItemToList(url, item, new_quantity);     
    }

    getItems(url){
        return this.lists.get(url).read();
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

        

        //If does not exist create it
        if(!list){
            id = this.createListWithId(cart_info.owner,id);
            list = this.lists.get(id);
        }
        // There is the possibility the item
        if((cart_info.deleted && !this.deletedLists.has(id)) || (!cart_info.deleted && this.deletedLists.has(id))){
            this.deleteList(id);
            this.deletedLists.add(id);
        }

        //If not deleted, let's merge
        else{
            for(const item of items){
                // If the item is not in the list, add it, if it is, update the quantity
                console.log(item)
                this.updateItemQuantity(id, item.name, item.quantity);
            }
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
                "owner": list.owner,
                "id": url,
                "items": [],
                "deleted": true
            }
            return JSON.stringify(json);
        }
        let items = list.read();
        let json = {
            "owner": list.owner,
            "id": url,
            "items": [],
            "deleted": false
        }
        for(const item of items){
            let item_info = item.split("-");
            json.items.push({
                "name": item_info[0],
                "quantity": parseInt(item_info[1])
            })
        }
        //Convert to json
        const jsonString = JSON.stringify(json);
        return jsonString
    }

    changed(){
        const change = this.listsChanged;
        this.listsChanged = false;
        return change;
    }


}
