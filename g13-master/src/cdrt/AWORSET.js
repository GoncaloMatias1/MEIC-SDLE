const GCounter = require('./gcounter');
const PNCounter = require('./pncounter')
class DotContext {
  constructor() {
    this.cc = new Map(); // Compact causal context
    this.dc = new Set(); // Dot cloud
  }


  // Copies class values
  assign() {
    this.cc = new Map(o.cc);
    this.dc = new Set(o.dc);
    return this;
  }

  // Checks if object is equal
  equals(o) {
    if (this.cc.size !== o.cc.size) return false;
    if (this.dc.size !== o.dc.size) return false;
    for (let [key, val] of this.cc) {
      if (o.cc.get(key) !== val) return false;
    }
    for (let dot of this.dc) {
      if (!o.dc.has(dot)) return false;
    }
    return true;
  }

  // Converts object to string
  toString() {
    let output = "Context: CC ( ";
    for (const [key, value] of this.cc.entries()) {
      output += `${key}:${value} `;
    }
    output += ") DC ( ";
    for (const dot of this.dc) {
      output += `${dot[0]}:${dot[1]} `;
    }
    output += ")";
    return output;
  }

  // Checks if d is in the context
  // d must be a pair of key and value
  dotIn(d) {
    const [key, value] = d;
    const itm = this.cc.get(key);
    if (itm !== undefined && value <= itm) return true;
    return this.dc.has(d);
  }

  // Compacts DC to CC if possible
  compact() {
    let flag;
    do {
      flag = false;
      for (let dot of this.dc) {
        const [key, value] = dot;
        const ccValue = this.cc.get(key);
        if (ccValue === undefined) { //No value found
          if (value === 1) { //Can compact
            this.cc.set(key, value);
            this.dc.delete(dot);
            flag = true;
          }
        } else if (value === ccValue + 1) { //Contiguous, can compact
          this.cc.set(key, value);
          this.dc.delete(dot);
          flag = true;
        } else if (value <= ccValue) { // Dominated, so prune
          this.dc.delete(dot);
          // no extra compaction opportunity so flag untouched
        }
      }
    } while (flag);
  }


  // Creates a new dot
  // Returns a pair
  makeDot(id) {
    let val = this.cc.get(id) || 0;
    this.cc.set(id, val + 1);
    return [id, val + 1];
  }

  //Inserts a dot, and compacts if told to
  insertDot(dot, compactNow = true) {
    this.dc.add(dot);
    if (compactNow) this.compact();
  }

  // Joins two contexts
  join(o) {
    if (this === o) return;

    let mit = this.cc.entries();
    let mito = o.cc.entries();

    let mitEntry = mit.next();
    let mitoEntry = mito.next();

    do {
      if (!mitEntry.done && (mitoEntry.done || mitEntry.value[0] < mitoEntry.value[0])) {
        // Entry only at here
        mitEntry = mit.next();
      } else if (!mitoEntry.done && (mitEntry.done || mitoEntry.value[0] < mitEntry.value[0])) {
        // Entry only at other
        this.cc.set(mitoEntry.value[0], mitoEntry.value[1]);
        mitoEntry = mito.next();
      } else if (!mitEntry.done && !mitoEntry.done) {
        // In both
        this.cc.set(mitEntry.value[0], Math.max(mitEntry.value[1], mitoEntry.value[1]));
        mitEntry = mit.next();
        mitoEntry = mito.next();
      }
    } while (!mitEntry.done || !mitoEntry.done);

    for (const dot of o.dc) {
      this.insertDot(dot, false);
    }

    this.compact();
  }
}

class DotKernel {
  constructor(sharedContext = null) {
    this.ds = new Map(); // Map of dots to values
    this.c = sharedContext || new DotContext();
  }
  equals(o) {
    //console.log(o.c,this.c)
    if (!this.c.equals(o.c)) return false;
    if (this.ds.size !== o.ds.size) return false;
    for (let [key, val] of this.ds) {
      //console.log(key, val, o.ds.get(key))
      if (o.ds.get(key) !== val) return false;
    }
    return true;
  }

  assign(adk) {
    if (this === adk) return this;
    if (this.c !== adk.c) this.c = adk.c;
    this.ds = new Map(adk.ds);
    return this;
  }

  toString() {
    let output = "( ";
    for (const [dot, value] of this.ds.entries()) {
      output += `${dot[0]}:${dot[1]}->${value} `;
    }
    output += ")";
    return output;
  }

  join(o) {
    if (this === o) return; // Join is idempotent, but just don't do it.

    let it = this.ds.entries();
    let ito = o.ds.entries();

    let itEntry = it.next();
    let itoEntry = ito.next();

    do {
      //console.log(itEntry, itoEntry)
      if (!itEntry.done && (itoEntry.done || itEntry.value[0] < itoEntry.value[0])) {
        //console.log('aqui')
        // Dot only at this
        if (o.c.dotIn(itEntry.value[0])) {
          // Other knows dot, must delete here
          this.ds.delete(itEntry.value[0]);
          itEntry = it.next();
        } else {
          // Keep it
          itEntry = it.next();
        }
      } else if (!itoEntry.done && (itEntry.done || itoEntry.value[0] < itEntry.value[0])) {
        //console.log('aqui2')
        // Dot only at other
        if (!this.c.dotIn(itoEntry.value[0])) {
          // If I don't know, import
          this.ds.set(itoEntry.value[0], itoEntry.value[1]);
        }
        itoEntry = ito.next();
      } else if (!itEntry.done && !itoEntry.done) {
        // Dot in both
        itEntry = it.next();
        itoEntry = ito.next();
      }
    } while (!itEntry.done || !itoEntry.done);

    // CC
    this.c.join(o.c);
  }


  //TODO: PROBLEMA AQUI
  add(id, val) {
    const newDot = this.c.makeDot(id);
    this.ds.set(newDot, val);
    const res = new DotKernel();
    res.ds.set(newDot, val);
    res.c.insertDot(newDot);
    return res;
  }

  remove(val) {
    const res = new DotKernel();
    for (let [dot, storedVal] of this.ds) {
      //console.log(dot, storedVal);
      if (storedVal === val) {
        res.c.insertDot(dot, false);
        this.ds.delete(dot);
      }
    }
    res.c.compact();
    return res;
  }

  removeWithoutQuantity(val) {
    const res = new DotKernel();
    for (let [dot, storedVal] of this.ds) {
      //console.log(dot, storedVal);
      if (storedVal.split("-")[0] === val) {
        res.c.insertDot(dot, false);
        this.ds.delete(dot);
      }
    }
    res.c.compact();
    return res;
  }


  removeAll() {
    const res = new DotKernel();
    for (const dot of this.ds.keys()) {
      res.c.insertDot(dot, false);
    }
    res.c.compact();
    this.ds.clear();
    return res;
  }
}

class AWORSet_old {

  // A ds should be 

  constructor(id, sharedContext = null) {
    this.dk = new DotKernel(sharedContext);
    this.id = id;
  }
  id() {
    return this.id;
  }

  context() {
    return this.dk.c;
  }

  toString() {
    return `AWORSET: ${this.dk.toString()}`;
  }

  read() {
    const res = new Set();
    for (const [_, value] of this.dk.ds.entries()) {
      res.add(value);
    }
    return res;
  }

  in(val) {
    for (const storedVal of this.dk.ds.values()) {
      if (storedVal === val) return true;
    }
    return false;
  }

  // Checks if val is in the set, adapted to Cart Context
  inAdapted(val) {
    for (const [_, storedVal] of this.dk.ds.entries()) {
      let info = storedVal.split("-");
      if (info[0] === val) return true;
    }
    return false;
  }

  add(val, quantity, total) {
    const res = new AWORSet(this.id);
    res.dk = this.dk.remove(val);
    res.dk.join(this.dk.add(this.id, val,));
    return res;
  }

  remove(val) {
    const res = new AWORSet(this.id);
    res.dk = this.dk.remove(val);
    return res;
  }

  removeWithoutQuantity(val) {
    const res = new AWORSet(this.id);
    res.dk = this.dk.removeWithoutQuantity(val);
    return res;
  }

  reset() {
    const res = new AWORSet(this.id);
    res.dk = this.dk.removeAll();
    return res;
  }

  join(o) {
    this.dk.join(o.dk);
  }

  equals(o) {
    return this.dk.equals(o.dk);
  }

  // Must still exist
  toJSON() {
    return {
      id: this.id, // Include the AWORSet ID
      dk: {
        ds: Array.from(this.dk.ds.entries()),
        c: {
          cc: Array.from(this.dk.c.cc.entries()),
          dc: Array.from(this.dk.c.dc),
        },
      },
    };
  }

  // Must still exist just modify
  static fromJSON(json) {
    const aworset = new AWORSet(json.id); // Use the provided ID
    aworset.dk.ds = new Map(json.dk.ds);
    aworset.dk.c.cc = new Map(json.dk.c.cc);
    aworset.dk.c.dc = new Set(json.dk.c.dc);
    return aworset;
  }

}

module.exports = class AWORSet {
  constructor(owner, id, url) {
    this.owner = owner; // Owner of the cart
    this.id = id; // Id of the cart
    this.url = url;
    this.deleted = false; // Deleted flag
    this.items = new Set(); // Set to store items - [name, counter] previously [name,counter,id] in case we need
  }

  // Add an item to the cart
  // TODO: Maybe this will give error
  add(itemName, added = 0, deleted = 0) {
    if (this.deleted) {
      throw new Error("Cannot add items to a deleted cart.");
    }


    for (let [name, counter] of this.items) {
      if (name === itemName) {
        
        counter.join(new PNCounter(added, deleted));
        
        /*let index = 0;
        for (cas in this.cc) {
          if (cas[0] == this.id) {
            index += 1;
          }
        }
        cc = [this.id, index + 1];
        this.cc.add([this.id, index + 1]);
        return;*/
        return;
      }
    }
    // If the item does not exist, create a new GCounter
    const newCounter = new PNCounter(added, deleted);
    this.items.add([itemName, newCounter]);
    //this.cc.add([this.id, 1]);
  }

  // Gets the counter from an item
  getCounter(itemName){
    if (this.deleted) {
      throw new Error("Cannot add items to a deleted cart.");
    }

    for (let [name, counter] of this.items) {
      if (name === itemName) {
        return counter;
      }
    }
    //if no counter exists create new
    return new PNCounter(0, 0);
  }


  // Remove an item from the cart
  remove(itemName, quantity) {
    if (this.deleted) {
      throw new Error("Cannot remove items from a deleted cart.");
    }

    for (let [name, counter] of this.items) {
      if (name === itemName && counter.read() === quantity) {
        counter.join(new PNCounter(0,counter.added.value))
        return;
      }
    }
  }

  // Remove an item completely without considering quantity
  removeWithoutQuantity(itemName) {
    if (this.deleted) {
      throw new Error("Cannot remove items from a deleted cart.");
    }

    for (let [name, counter] of this.items) {
      if (name === itemName) {
        counter.join(new PNCounter(0,counter.added.value))
        return;
      }
    }
  }

  // Check if an item exists in the set
  inAdapted(itemName) {
    for (let [name, counter] of this.items) {
      if (name === itemName && !counter.noStock()) {
        return true;
      }
    }
    return false;
  }

  // Read all items and their quantities
  read() {
    const result = [];
    for (const [item, counter] of this.items) {
      result.push([item,counter]);
    }
    return result;
  }


  // In Set A checks whether items are in CC of B, aka non-deleted items
  // Both of them are AWORSETS
  /*preserve(a, b) {

    let result = []
    for (let [item, counter, cc] of a.items) {
      const ccIdA = cc[0];
      const ccVersionA = cc[1];
      const elementA = {
        name: item,
        current: counter.current,
        total: counter.total,
        id: ccIdA,
        version: ccVersionA
      }
      let found = false;

      for (let element_cc of b.cc) {
        const ccIdB = element_cc[0];
        const ccVersionB = element_cc[1];


        if (ccIdA === ccIdB && ccVersionA === ccVersionB) {
          found = true;
        }
      }

      if (!found) result.push(elementA);
    }

    // Transform output
    result = result.map((element) => {
      return [element.name, new GCounter(element.current, element.total), [element.id, element.version]];
    })

    return result;
  }*/

  // Merge another cart into this cart
  join(o) {
    /*if (this.id !== otherCart.id) {
      //throw new Error("Cannot join carts with different IDs.");
    }*/

    if (this.deleted || o.deleted) {
      throw new Error("Cannot join items from a deleted cart.");
    }

    let temp = new Set();

    for (let [thisName, thisCounter] of this.items) {
      for (let [nameo, countero] of o.items) {
        if (nameo === thisName && countero.equals(thisCounter)) {
          temp.add([thisName, thisCounter]);
          break;
        } else if (nameo === thisName) {
          temp.add([thisName, thisCounter.join(countero)]);
          break;
        }
      }
    }

    for (let [thisName, thisCounter] of this.items) {
      let found = false;
      for (let [nameTemp, counterTemp] of temp) {
        if (nameTemp === thisName) {
          found = true;
          break;
        }
      }
      if (!found) {
        temp.add([thisName, thisCounter]);
      }
    }


    for (let [nameo, countero] of o.items) {
      let found = false;
      for (let [nameTemp, counterTemp] of temp) {
        if (nameTemp === nameo) {
          found = true;
          break;
        }
      }
      if (!found) {
        temp.add([nameo, countero]);
      }
    }

    this.items = temp

    /*
    const mergeCC = [...new Set([...this.cc, ...o.cc].map(JSON.stringify))].map(JSON.parse);

    this.cc = mergeCC*/
  }

  // Mark the cart as deleted
  deleteCart() {
    this.deleted = true;
  }

  // Display the cart contents
  toString() {
    if (this.deleted) {
      return `Cart (ID: ${this.id}, Owner: ${this.owner}) is deleted.`;
    }

    let str = `Cart (ID: ${this.id}, Owner: ${this.owner}, URL: ${this.url})`;
    if(this.items.size === 0) {
      str += ` with no items.`
    } else {
      str += `\nItems:\n`
      for (let [name, counter] of this.items) {
        str += `  - ${name}: ${counter.read()} (total added: ${counter.added.value}, total deleted: ${counter.deleted.value})\n`;
      }
    }
    return str;
  }
  // Convert the current AWORSet_TEMP instance to a JSON-compatible object
  toJSON() {
    return {
      owner: this.owner, // Include the owner of the cart
      id: this.id, // Include the ID of the cart
      url: this.url, // Include the URL of the cart
      deleted: this.deleted, // Include the deleted status
      items: Array.from(this.items).map(([name, counter]) => ({
        name,
        counter: { added: counter.added.value, deleted: counter.deleted.value }, // Serialize the PNCounter
      })), // Convert items to a JSON-compatible format
    };
  }  

  // Create a new AWORSet_TEMP instance from a JSON-compatible object
  static fromJSON(json) {
    const aworset = new AWORSet(json.owner, json.id, json.url);
    aworset.deleted = json.deleted; // Restore the deleted status
    aworset.items = new Set(
      json.items.map(({ name, counter }) => [
        name,
        new PNCounter(counter.added, counter.deleted), // Restore the PNCounter
      ])
    ); // Restore the items
    return aworset;
  }
}