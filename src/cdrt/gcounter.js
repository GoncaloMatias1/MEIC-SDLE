module.exports =  class GCounter {
    // This GCounter is done with the idea that will only exist decrements.

    constructor(current = 0, total = 0,id = 0) {
      this.m = new Map();
      this.id = id;
      this.current = current;
      this.m.set(this.id, this.current);
      this.total = total;
    }
  
  
    // Increment the current, as total will not be decremented
    inc(to_increment = 1) {
  
      let res = new GCounter(); 
      
      this.m.set(this.id, (this.m.get(this.id) || 0) + to_increment);
  
      res.m.set(this.id, this.m.get(this.id));
  
      return res;
  
    }

    // Check if current is 0
    noStock() {
      return this.current === 0;
    }
  
    //Check if current is equal to another object
    equals(o) {
  
      if (this.m.size !== o.m.size) return false;

      if (this.total !== o.total) return false;
  
      for (let [key, val] of this.m) {
  
        if (o.m.get(key) !== val) return false;
  
      }
  
      return true;
  
    }
  
  
    local() {
  
      return this.m.get(this.id) || 0; 
  
    }
  
    
    read() {
  
      let res = 0;
  
      for (let val of this.m.values()) {
  
        res += val;
  
      }
  
      return res;
  
    }
  
  
    join(o) {
  
      for (let [key, val] of o.m) {
  
        this.m.set(key, Math.max(val, this.m.get(key) || 0));
  
      }
  
    }
  
  
    toString() {
  
      let str = "GCounter: ( ";
  
      for (let [key, val] of this.m) {
  
        str += `${key}->${val} `;
  
      }
  
      str += ")";
  
      return str;
  
    }
  
}