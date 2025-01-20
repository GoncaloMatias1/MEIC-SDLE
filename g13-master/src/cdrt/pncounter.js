const GCounter = require('./gcounter');
module.exports =  class PNCounter {
    // This GCounter is done with the idea that will only exist decrements.

    constructor(added = 0, deleted = 0) {
      this.added = new GCounter(added);
      this.deleted = new GCounter(deleted);
    }

    // Check if the added and deleted are equal.
    noStock() {
      return this.added.value === this.deleted.value;
    }
  
    //Check if o is equal in any way to this
    equals(o) {
      if (this.added.value !== o.added.value) return false;
      if (this.deleted.value !== o.deleted.value) return false;
      return true;
    }

  
    // Not used! 
    read() {
      return this.added.value-this.deleted.value;
    }
  
    
    join(o) {
      this.added.join(o.added);
      this.deleted.join(o.deleted);
      return this
    }
  
    toString() {
      let str = "PNounter: ( ";
      str += "added: ";
      str += this.added.value
      str += " deleted: ";
      str += this.deleted.value
      str += ")";
      return str;
    }
  
}